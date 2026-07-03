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
function doRequest(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { agent }, (res) => {
            const data = [];
            res.on('data', (chunk) => data.push(chunk));
            // Sin este handler, un corte a mitad de body (ECONNRESET tras headers)
            // emitia 'error' sobre `res` sin listener -> Promise colgada / crash.
            res.on('error', reject);
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
        }).on('error', reject);

        req.setTimeout(30000, () => {
            req.destroy(new Error('Request timed out'));
        });
    });
}

// GET con reintento acotado: 429 y 5xx se reintentan con backoff exponencial +
// jitter, honrando Retry-After; los demas 4xx (permanentes) fallan de una.
// `retryBaseMs: 0` desactiva la espera (util en tests).
async function makeRequest(url, { maxRetries = 3, retryBaseMs = 400 } = {}) {
    let attempt = 0;
    for (;;) {
        try {
            return await doRequest(url);
        } catch (err) {
            if (!err || !err.retryable || attempt >= maxRetries) throw err;
            const backoff = err.retryAfterMs != null
                ? err.retryAfterMs
                : Math.round(retryBaseMs * 2 ** attempt * (0.5 + Math.random()));
            attempt += 1;
            if (backoff > 0) await sleep(backoff);
        }
    }
}

module.exports = { makeRequest, YouTubeApiError, RateLimitError, QuotaExceededError };
