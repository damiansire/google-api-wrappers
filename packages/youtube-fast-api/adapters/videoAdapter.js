const getVideosByChannelIdUrl = (apiKey, channelId) => `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${channelId}&key=${apiKey}`;

//Devuelve 50 como maximo
const getNextPageTokenUrl = (apiKey, channelId, paginatedSize, nextPageToken) => getVideosByChannelIdUrl(apiKey, channelId) + `&maxResults=${paginatedSize}&pageToken=${nextPageToken}`;

// videos.list: metadata (titulo/descripcion/tags/estadisticas) de hasta 50
// videos por request. Cuesta 1 unidad de cuota por request.
const getVideosMetadataUrl = (apiKey, videoIds, parts = 'snippet,statistics') =>
    `https://www.googleapis.com/youtube/v3/videos?part=${encodeURIComponent(parts)}&id=${videoIds.join(',')}&key=${apiKey}`;

// search.list por termino de busqueda (descubrimiento/trending). Cara: 100
// unidades por pagina. `order` = 'relevance' (default) o 'viewCount' (trending).
const getSearchVideosUrl = (apiKey, query, order = 'relevance', pageSize = 50, pageToken = '') => {
    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=${order}&maxResults=${pageSize}&q=${encodeURIComponent(query)}&key=${apiKey}`;
    if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
    return url;
};

module.exports = {
    getVideosByChannelIdUrl,
    getNextPageTokenUrl,
    getVideosMetadataUrl,
    getSearchVideosUrl
}