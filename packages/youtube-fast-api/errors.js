'use strict';

// Jerarquia de errores tipada: el consumidor distingue el fallo por `instanceof`
// / `.status` / `.reason`, en vez de parsear el string del mensaje. El caso #1
// real de esta API (cuota agotada / rate-limit, 403/429) deja de ser opaco.
//
// Vive en un modulo propio (no en el adapter de transporte) porque es SUPERFICIE
// PUBLICA: tanto el transporte (adapters/youtubeApi) como el cliente (index) la
// importan desde aca, sin que el tope de la arquitectura tenga que reachear el
// fondo cruzando capas solo para re-exportar tipos.
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

module.exports = { YouTubeApiError, RateLimitError, QuotaExceededError };
