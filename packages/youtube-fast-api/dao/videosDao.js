const { makeRequest } = require('../adapters/youtubeApi');
const { getNextPageTokenUrl, getPlaylistsByChannelIdUrl, getVideosMetadataUrl, getSearchVideosUrl } = require('../adapters/videoAdapter')

async function getPaginatedVideosByChannelId(apiKey, channelId, pageSize) {
    // getNextPageTokenUrl(apiKey, id, pageToken, pageSize): primera pagina = token vacio.
    const getVideosUrl = getNextPageTokenUrl(apiKey, channelId, '', pageSize);
    let videosResponse = await makeRequest(getVideosUrl);
    return responseToVideoId(videosResponse);
}

async function getNextVideosPage(apiKey, videoId, paginatedSize, token) {
    const nextPageUrl = getNextPageTokenUrl(apiKey, videoId, token, paginatedSize)
    const videosResponse = await makeRequest(nextPageUrl);
    return responseToVideoId(videosResponse);
}

async function getPlaylistByChannelId(apiKey, channelId, pageToken = '') {
    const channelDataUrl = getPlaylistsByChannelIdUrl(apiKey, channelId, 50, pageToken);
    const channelDataResponse = await makeRequest(channelDataUrl);
    return responseToPlaylistId(channelDataResponse);
}

function responseToVideoId(channelResponse) {
    const allItemsId = channelResponse.items.map(video => dtoToVideo(video));
    const allVideosId = allItemsId.filter(id => id);
    const nextPageToken = channelResponse.nextPageToken;
    return { nextPageToken, allVideosId };
}

function responseToPlaylistId(channelResponse) {
    const allItemsId = channelResponse.items.map(video => dtoToPlaylist(video));
    const allVideosId = allItemsId.filter(id => id);
    const nextPageToken = channelResponse.nextPageToken;
    return { nextPageToken, allVideosId };
}

function dtoToVideo(item) {
    return item.id.videoId;
}

function dtoToPlaylist(item) {
    // playlists.list devuelve el id de la playlist directamente en `item.id`
    // (string), no en `item.id.playlistId` como hace search.list.
    return item.id;
}

// --- videos.list: metadata de videos ---

async function getVideosMetadata(apiKey, videoIds) {
    const url = getVideosMetadataUrl(apiKey, videoIds);
    const response = await makeRequest(url);
    return responseToVideosMetadata(response);
}

function responseToVideosMetadata(response) {
    return (response.items || []).map(dtoToVideoMetadata);
}

function dtoToVideoMetadata(item) {
    const snippet = item.snippet || {};
    const statistics = item.statistics || {};
    // Las cuentas vienen como string; si el video oculta estadisticas vienen
    // ausentes -> null (se distingue de un 0 real, igual que el cliente Rust).
    const toCount = (value) => (value === undefined || value === null ? null : Number(value));
    return {
        id: item.id,
        channelId: snippet.channelId,
        title: snippet.title,
        description: snippet.description,
        tags: snippet.tags || [],
        viewCount: toCount(statistics.viewCount),
        likeCount: toCount(statistics.likeCount),
        commentCount: toCount(statistics.commentCount),
        publishedAt: snippet.publishedAt
    };
}

// --- search.list por query ---

async function searchVideosPage(apiKey, query, order, pageSize, pageToken) {
    const url = getSearchVideosUrl(apiKey, query, order, pageSize, pageToken);
    const response = await makeRequest(url);
    return responseToSearchHits(response);
}

function responseToSearchHits(response) {
    // search.list puede devolver canales/playlists ademas de videos: solo los
    // que traen videoId.
    const hits = (response.items || []).map(dtoToSearchHit).filter((hit) => hit.videoId);
    return { nextPageToken: response.nextPageToken, hits };
}

function dtoToSearchHit(item) {
    const snippet = item.snippet || {};
    return {
        videoId: item.id && item.id.videoId,
        channelId: snippet.channelId,
        title: snippet.title,
        publishedAt: snippet.publishedAt
    };
}

module.exports = {
    getPlaylistByChannelId,
    getPaginatedVideosByChannelId,
    getNextVideosPage,
    getVideosMetadata,
    searchVideosPage
}