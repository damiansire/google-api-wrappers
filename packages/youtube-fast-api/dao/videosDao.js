const { makeRequest } = require('../adapters/youtubeApi');
const { getVideosByChannelIdUrl, getNextPageTokenUrl } = require('../adapters/videoAdapter')

async function getVideosByChannelId(apiKey, channelId) {
    let channelDataUrl = getVideosByChannelIdUrl(apiKey, channelId);
    let channelDataResponse = await makeRequest(channelDataUrl);
    return responseToVideoId(channelDataResponse);
}

async function getPaginatedVideosByChannelId(apiKey, channelId, pageSize) {
    const getVideosUrl = getNextPageTokenUrl(apiKey, channelId, pageSize, '');
    let videosResponse = await makeRequest(getVideosUrl);
    return responseToVideoId(videosResponse);
}

async function getNextVideosPage(apiKey, videoId, paginatedSize, token) {
    nextPageUrl = getNextPageTokenUrl(apiKey, videoId, paginatedSize, token)
    videosResponse = await makeRequest(nextPageUrl);
    return responseToVideoId(videosResponse);
}

async function getPlaylistByChannelId(apiKey, channelId) {
    let channelDataUrl = getVideosByChannelIdUrl(apiKey, channelId);
    let channelDataResponse = await makeRequest(channelDataUrl);
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
    return item.id.playlistId;
}

module.exports = {
    getVideosByChannelId,
    getPlaylistByChannelId,
    getPaginatedVideosByChannelId,
    getNextVideosPage
}