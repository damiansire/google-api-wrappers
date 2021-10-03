const getVideosByUserNameUrl = (apiKey, userName) => `https://www.googleapis.com/youtube/v3/search?part=id&forUsername=damiansiredesarrollo&key=${apiKey}`;

const getVideosByChannelIdUrl = (apiKey, channelId) => `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${channelId}&key=${apiKey}`;



module.exports = {
    getVideosByUserNameUrl,
    getVideosByChannelIdUrl
}