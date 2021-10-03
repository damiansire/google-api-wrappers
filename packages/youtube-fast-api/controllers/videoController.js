const videosDao = require("../dao/videosDao");

async function getAllVideos(apiKey, channelId) {
    console.log("Se obtiene la data para ", channelId);
    let channelData = await videosDao.getVideosByChannelId(apiKey, channelId);
    return channelData;
}

exports.getAllVideos = getAllVideos;