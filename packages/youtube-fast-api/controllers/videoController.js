const videosDao = require('../dao/videosDao');

async function getAllVideosByChannelId(apiKey, channelId) {
    const pageSize = 50;
    let allVideosId = [];
    const channelData = await getPaginatedVideosByChannelId(apiKey, channelId, pageSize);
    allVideosId = allVideosId.concat(channelData.allVideosId)
    let actualRequest = 1;
    while (channelData.nextPageToken && actualRequest < 4) {
        actualRequest++;
        let newPage = await getNextVideosPage(apiKey, channelId, pageSize, channelData.nextPageToken);
        allVideosId = allVideosId.concat(newPage.allVideosId);
    }
    return allVideosId;
}


async function getAllPlaylistByChannelId(apiKey, channelId) {
    const channelData = await videosDao.getPlaylistByChannelId(apiKey, channelId);
    return channelData;
}

async function getPaginatedVideosByChannelId(apiKey, channelId, pageSize) {
    return videosDao.getPaginatedVideosByChannelId(apiKey, channelId, pageSize)
}

async function getNextVideosPage(apiKey, channelId, pageSize, token) {
    return videosDao.getNextVideosPage(apiKey, channelId, pageSize, token)
}

module.exports = { getAllVideosByChannelId, getAllPlaylistByChannelId, getPaginatedVideosByChannelId, getNextVideosPage };
