const getVideosByChannelIdUrl = (apiKey, channelId) => `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${channelId}&key=${apiKey}`;

//Devuelve 50 como maximo
const getNextPageTokenUrl = (apiKey, channelId, paginatedSize, nextPageToken) => getVideosByChannelIdUrl(apiKey, channelId) + `&maxResults=${paginatedSize}&pageToken=${nextPageToken}`;

module.exports = {
    getVideosByChannelIdUrl,
    getNextPageTokenUrl
}