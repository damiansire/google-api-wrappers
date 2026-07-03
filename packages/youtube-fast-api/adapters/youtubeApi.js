const https = require('https');

// Keep-alive: los loops de paginacion hacen muchas requests seguidas; sin esto
// cada una repaga el handshake TLS completo. maxSockets acota la concurrencia.
const agent = new https.Agent({ keepAlive: true, maxSockets: 10 });

// Jerarquia de errores tipada: el consumidor distingue el fallo por `instanceof`
// / `.status` / `.reason`, en vez de parsear el string del mensaje. El caso #1
// real de esta API (cuota agotada / rate-limit, 403/429) deja de ser opaco.
class YouTubeApiError extends Error {
    constructor(message, { status, reason, cause } = {}) {
        super(message);
        this.name = 'YouTubeApiError';
        this.status = status;
        this.reason = reason;
        if (cause !== undefined) this.cause = cause;
    }
}
class RateLimitError extends YouTubeApiError {
    constructor(message, opts) { super(message, opts); this.name = 'RateLimitError'; }
}
class QuotaExceededError extends YouTubeApiError {
    constructor(message, opts) { super(message, opts); this.name = 'QuotaExceededError'; }
}

// Extrae el `reason` del cuerpo de error de la API de Google, si viene estructurado.
function reasonOf(body) {
    try {
        const j = JSON.parse(body);
        return (j && j.error && j.error.errors && j.error.errors[0] && j.error.errors[0].reason) || undefined;
    } catch {
        return undefined;
    }
}

function classifyError(status, body) {
    const reason = reasonOf(body);
    const msg = `Request failed with status ${status}: ${body}`;
    if (status === 429 || reason === 'rateLimitExceeded' || reason === 'userRateLimitExceeded') {
        return new RateLimitError(msg, { status, reason });
    }
    if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
        return new QuotaExceededError(msg, { status, reason });
    }
    return new YouTubeApiError(msg, { status, reason });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Una sola pasada del GET. Resuelve con el JSON parseado o rechaza con un error
// que trae `.retryable` y `.retryAfterMs` para que la capa de reintento decida.

// Fallos de TRANSPORTE de un GET idempotente (socket reset/timeout/DNS) son seguros
// de reintentar. Importa sobre todo con keep-alive: un socket reusado que el server
// ya cerró da ECONNRESET en la request siguiente — el modo de falla clásico.
const TRANSIENT_CODES = new Set(['ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ECONNREFUSED', 'EAI_AGAIN', 'ENETUNREACH', 'ENOTFOUND']);
function isTransientTransport(err) {
    if (!err) return false;
    if (err.code && TRANSIENT_CODES.has(err.code)) return true;
    return /socket hang up|timed out/i.test(err.message || '');
}

function doRequest(url) {
    return new Promise((resolve, reject) => {
        // Marca retryable los errores de transporte (parse-errors NO: reintentar no
        // arregla un body inválido).
        const failTransport = (err) => {
            if (isTransientTransport(err)) err.retryable = true;
            reject(err);
        };
        const req = https.get(url, { agent }, (res) => {
            const data = [];
            res.on('data', (chunk) => data.push(chunk));
            // Sin este handler, un corte a mitad de body (ECONNRESET tras headers)
            // emitia 'error' sobre `res` sin listener -> Promise colgada / crash.
            res.on('error', failTransport);
            res.on('end', () => {
                const body = Buffer.concat(data).toString();
                if (res.statusCode >= 400) {
                    const err = classifyError(res.statusCode, body);
                    err.retryable = res.statusCode === 429 || res.statusCode >= 500;
                    const retryAfter = Number(res.headers && res.headers['retry-after']);
                    err.retryAfterMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : null;
                    reject(err);
                    return;
                }
                try {
                    resolve(JSON.parse(body));
                } catch (parseErr) {
                    reject(new YouTubeApiError('Failed to parse response body as JSON: ' + parseErr.message, { cause: parseErr }));
                }
            });
        }).on('error', failTransport);

        req.setTimeout(30000, () => {
            const err = new Error('Request timed out');
            err.retryable = true; // el timeout de un GET idempotente se reintenta
            req.destroy(err);
        });
    });
}

const DEFAULT_MAX_BACKOFF_MS = 30000; // tope: un Retry-After enorme no cuelga la operacion

// GET con reintento acotado: 429/5xx y fallos de transporte se reintentan con backoff
// exponencial + jitter, honrando Retry-After PERO con tope maximo (un Retry-After
// arbitrariamente grande no debe colgar la operacion); los 4xx permanentes fallan de
// una. `retryBaseMs:0` desactiva la espera (tests); `maxBackoffMs` acota el tope.
async function makeRequest(url, { maxRetries = 3, retryBaseMs = 400, maxBackoffMs = DEFAULT_MAX_BACKOFF_MS } = {}) {
    let attempt = 0;
    for (;;) {
        try {
            return await doRequest(url);
        } catch (err) {
            if (!err || !err.retryable || attempt >= maxRetries) throw err;
            const raw = err.retryAfterMs != null
                ? err.retryAfterMs
                : Math.round(retryBaseMs * 2 ** attempt * (0.5 + Math.random()));
            const backoff = Math.min(raw, maxBackoffMs); // Retry-After tambien se capea
            attempt += 1;
            if (backoff > 0) await sleep(backoff);
        }
    }
}

module.exports = { makeRequest, YouTubeApiError, RateLimitError, QuotaExceededError };
