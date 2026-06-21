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
// chunks de 50 y se concatenan los resultados.
async function getVideosMetadata(apiKey, videoIds) {
    const chunkSize = 50;
    let all = [];
    for (let i = 0; i < videoIds.length; i += chunkSize) {
        const chunk = videoIds.slice(i, i + chunkSize);
        const metadata = await videosDao.getVideosMetadata(apiKey, chunk);
        all = all.concat(metadata);
    }
    return all;
}

// search.list cuesta 100 unidades por pagina: `maxPages` es el tope de costo.
async function searchVideos(apiKey, query, options = {}) {
    const { maxPages = 1, order = 'relevance', pageSize = 50 } = options;
    let hits = [];
    let pageToken = '';
    let pages = 0;
    while (pages < maxPages) {
        const page = await videosDao.searchVideosPage(apiKey, query, order, pageSize, pageToken);
        hits = hits.concat(page.hits);
        pages += 1;
        if (!page.nextPageToken || pages >= maxPages) break;
        pageToken = page.nextPageToken;
    }
    return hits;
}

module.exports = { getAllVideosByChannelId, getAllPlaylistByChannelId, getPaginatedVideosByChannelId, getNextVideosPage, getVideosMetadata, searchVideos };
