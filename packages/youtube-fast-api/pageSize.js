// Valida y acota el tamaño de página que aceptan los endpoints de la API. Cada
// endpoint tiene su propio máximo (search/videos: 50, commentThreads: 100); pasar
// un valor fuera de rango o no numérico produce un 400 opaco y gasta cuota, así que
// fallamos temprano y claro (mismo criterio que ya usaba searchVideos).
function normalizePageSize(value, max) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1) {
        throw new TypeError(`invalid pageSize "${value}"; expected a number between 1 and ${max}`);
    }
    return Math.min(Math.trunc(n), max); // > max se acota al tope del endpoint
}

module.exports = { normalizePageSize };
