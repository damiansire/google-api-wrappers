const { makeRequest } = require("../adapters/youtubeApi");
const { getVideosByUserNameUrl, getVideosByChannelIdUrl } = require("../adapters/videoAdapter")

async function getVideosByUsername(apiKey, channelUsername) {
    let channelDataUrl = getVideosByUserNameUrl(apiKey, channelUsername);
    let channelDataResponse = await makeRequest(channelDataUrl);
    //return responseToVideoId(channelDataResponse);
    return channelDataResponse;
}

async function getVideosByChannelId(apiKey, channelId) {
    let channelDataUrl = getVideosByChannelIdUrl(apiKey, channelId);
    let channelDataResponse = await makeRequest(channelDataUrl);
    return channelDataResponse;
}

function responseToVideoId(channelResponse) {
    const allVideosId = channelResponse.items.map(video => dtoToVideo(video));
    const nextPageToken = channelResponse.nextPageToken;
    return { nextPageToken, allVideosId };
}

function dtoToVideo(item) {
    return item.id.videoId;
}

module.exports = {
    getVideosByUsername,
    getVideosByChannelId
}