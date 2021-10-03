const { makeRequest } = require("../adapters/youtubeApi");
const { getVideosByUserNameUrl, getVideosByChannelIdUrl } = require("../adapters/videoAdapter")

async function getVideosByUsername(apiKey, channelUsername) {
    let channelDataUrl = getVideosByUserNameUrl(apiKey, channelUsername);
    let channelDataResponse = await makeRequest(channelDataUrl);
    return responseToVideoId(channelDataResponse);
}

async function getVideosByChannelId(apiKey, channelId) {
    let channelDataUrl = getVideosByChannelIdUrl(apiKey, channelId);
    let channelDataResponse = await makeRequest(channelDataUrl);
    return responseToVideoId(channelDataResponse);
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
    getVideosByUsername,
    getVideosByChannelId,
    getPlaylistByChannelId
}