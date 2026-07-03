const videosDao = require('../dao/videosDao');
const { normalizePageSize } = require('../pageSize');

// (El "traer todos los videos de un canal" vive en el cliente como async-generator
// canónico `channelVideoPages`; ya no se implementa el loop acá.)

async function getAllPlaylistByChannelId(apiKey, channelId) {
    const allVideosId = [];
    let pageToken = '';
    do {
        const channelData = await videosDao.getPlaylistByChannelId(apiKey, channelId, pageToken);
        allVideosId.push(...channelData.allVideosId);
        pageToken = channelData.nextPageToken;
    } while (pageToken);
    return { allVideosId };
}

async function getPaginatedVideosByChannelId(apiKey, channelId, pageSize) {
    return videosDao.getPaginatedVideosByChannelId(apiKey, channelId, pageSize)
}

async function getNextVideosPage(apiKey, channelId, pageSize, token) {
    return videosDao.getNextVideosPage(apiKey, channelId, pageSize, token)
}

// videos.list acepta hasta 50 ids por request (1 unidad c/u): se parte en
// chunks de 50 y se resuelven en paralelo (cada chunk es una request
// independiente, no hay pageToken que los encadene). Se acota la concurrencia
// para no saturar sockets.
//
// IMPORTANTE: videos.list NO garantiza devolver los items en el orden pedido, y
// OMITE los ids privados/borrados. Por eso reconciliamos por `id` y devolvemos en
// el ORDEN DE ENTRADA: un caller que hacía `salida[i]` para el id `entrada[i]`
// recibía datos cruzados en silencio. Los ids que la API omite quedan fuera del
// resultado (matchear por `.id`, no por índice).
async function getVideosMetadata(apiKey, videoIds) {
    const chunkSize = 50;
    const concurrency = 8;
    const chunks = [];
    for (let i = 0; i < videoIds.length; i += chunkSize) {
        chunks.push(videoIds.slice(i, i + chunkSize));
    }
    const results = new Array(chunks.length);
    let next = 0;
    async function worker() {
        while (next < chunks.length) {
            const idx = next++;
            results[idx] = await videosDao.getVideosMetadata(apiKey, chunks[idx]);
        }
    }
    const workers = [];
    for (let i = 0; i < Math.min(concurrency, chunks.length); i++) {
        workers.push(worker());
    }
    await Promise.all(workers);
    const byId = new Map(results.flat().map((meta) => [meta.id, meta]));
    return videoIds.map((id) => byId.get(id)).filter((meta) => meta !== undefined);
}

// search.list acepta estos valores de `order`; cualquier otro hace que la API
// devuelva 400.
const SEARCH_ORDERS = ['date', 'rating', 'relevance', 'title', 'videoCount', 'viewCount'];

// search.list cuesta 100 unidades por pagina: `maxPages` es el tope de costo.
async function searchVideos(apiKey, query, options = {}) {
    const { maxPages = 1, order = 'relevance', pageSize = 50 } = options;
    // search.list 400ea si el order no es valido o si maxResults sale de [1,50]:
    // validamos en el cliente para FALLAR TEMPRANO y claro, no mandar un request
    // roto. Un pageSize <= 0 / no numerico es un error del caller (antes se
    // clampeaba silenciosamente a 0 -> maxResults=0 -> 400 garantizado).
    if (!SEARCH_ORDERS.includes(order)) {
        throw new TypeError(`invalid order "${order}"; expected one of: ${SEARCH_ORDERS.join(', ')}`);
    }
    const clampedPageSize = normalizePageSize(pageSize, 50); // search.list topea en 50
    const hits = [];
    let pageToken = '';
    let pages = 0;
    while (pages < maxPages) {
        const page = await videosDao.searchVideosPage(apiKey, query, order, clampedPageSize, pageToken);
        hits.push(...page.hits);
        pages += 1;
        if (!page.nextPageToken || pages >= maxPages) break;
        pageToken = page.nextPageToken;
    }
    return hits;
}

module.exports = { getAllPlaylistByChannelId, getPaginatedVideosByChannelId, getNextVideosPage, getVideosMetadata, searchVideos };
