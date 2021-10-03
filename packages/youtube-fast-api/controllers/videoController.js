const videosDao = require("../dao/videosDao");

async function getAllVideosByChannelId(apiKey, channelId) {
    console.log("Se obtiene la data para ", channelId);
    let channelData = await videosDao.getVideosByChannelId(apiKey, channelId);
    return channelData;
}

async function getAllPlaylistByChannelId(apiKey, channelId) {
    console.log("Se obtiene la data para ", channelId);
    let channelData = await videosDao.getPlaylistByChannelId(apiKey, channelId);
    return channelData;
}

module.exports = { getAllVideosByChannelId, getAllPlaylistByChannelId };