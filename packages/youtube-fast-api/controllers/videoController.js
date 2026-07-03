const videosDao = require('../dao/videosDao');

async function getAllVideosByChannelId(apiKey, channelId) {
    const pageSize = 50;
    let allVideosId = [];
    const channelData = await getPaginatedVideosByChannelId(apiKey, channelId, pageSize);
    allVideosId = allVideosId.concat(channelData.allVideosId)
    let nextPageToken = channelData.nextPageToken;
    while (nextPageToken) {
        let newPage = await getNextVideosPage(apiKey, channelId, pageSize, nextPageToken);
        allVideosId = allVideosId.concat(newPage.allVideosId);
        nextPageToken = newPage.nextPageToken;
    }
    return [...new Set(allVideosId)];
}


async function getAllPlaylistByChannelId(apiKey, channelId) {
    let allVideosId = [];
    let pageToken = '';
    do {
        const channelData = await videosDao.getPlaylistByChannelId(apiKey, channelId, pageToken);
        allVideosId = allVideosId.concat(channelData.allVideosId);
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
// para no saturar sockets; el orden se preserva escribiendo cada resultado en
// su indice.
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
    return results.flat();
}

// search.list acepta estos valores de `order`; cualquier otro hace que la API
// devuelva 400.
const SEARCH_ORDERS = ['date', 'rating', 'relevance', 'title', 'videoCount', 'viewCount'];

// search.list cuesta 100 unidades por pagina: `maxPages` es el tope de costo.
async function searchVideos(apiKey, query, options = {}) {
    const { maxPages = 1, order = 'relevance', pageSize = 50 } = options;
    // search.list topea maxResults en 50 y 400ea si se pasa o si el order no es
    // valido: clampeamos/validamos en el cliente para fallar claro y temprano.
    if (!SEARCH_ORDERS.includes(order)) {
        throw new TypeError(`invalid order "${order}"; expected one of: ${SEARCH_ORDERS.join(', ')}`);
    }
    const clampedPageSize = Math.min(Math.max(Number(pageSize) || 0, 0), 50);
    let hits = [];
    let pageToken = '';
    let pages = 0;
    while (pages < maxPages) {
        const page = await videosDao.searchVideosPage(apiKey, query, order, clampedPageSize, pageToken);
        hits = hits.concat(page.hits);
        pages += 1;
        if (!page.nextPageToken || pages >= maxPages) break;
        pageToken = page.nextPageToken;
    }
    return hits;
}

module.exports = { getAllVideosByChannelId, getAllPlaylistByChannelId, getPaginatedVideosByChannelId, getNextVideosPage, getVideosMetadata, searchVideos };
