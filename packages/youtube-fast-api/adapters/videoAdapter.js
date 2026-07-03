// Todo valor interpolado en la URL se escapa con encodeURIComponent: los ids que
// llegan del consumidor (channelId/videoId/pageToken) podrían contener &, #, = y
// contaminar la query (inyeccion de parametros / DoS de auth). El separador ','
// de la lista de ids NO se escapa a proposito (es delimitador de la API).
const enc = encodeURIComponent;

const getVideosByChannelIdUrl = (apiKey, channelId) =>
    `https://www.googleapis.com/youtube/v3/search?part=id&type=video&channelId=${enc(channelId)}&key=${enc(apiKey)}`;

// Siguiente pagina de la busqueda por canal (maximo 50).
// Firma UNIFICADA con commentsAdapter.getNextPageTokenUrl: (apiKey, id, pageToken,
// pageSize). Antes era (apiKey, id, pageSize, pageToken) — invertida respecto de
// comments: dos exports con el mismo nombre y argumentos swapeados eran un footgun.
const getNextPageTokenUrl = (apiKey, channelId, nextPageToken, paginatedSize = 50) =>
    getVideosByChannelIdUrl(apiKey, channelId) + `&maxResults=${enc(paginatedSize)}&pageToken=${enc(nextPageToken)}`;

// playlists.list: ids de las playlists de un canal. A diferencia de search.list,
// devuelve siempre playlists (id directo, no id.playlistId) y permite maxResults
// hasta 50. `pageToken` vacio para la primera pagina.
const getPlaylistsByChannelIdUrl = (apiKey, channelId, maxResults = 50, pageToken = '') => {
    let url = `https://www.googleapis.com/youtube/v3/playlists?part=id&channelId=${enc(channelId)}&maxResults=${enc(maxResults)}&key=${enc(apiKey)}`;
    if (pageToken) url += `&pageToken=${enc(pageToken)}`;
    return url;
};

// videos.list: metadata (titulo/descripcion/tags/estadisticas) de hasta 50
// videos por request. Cuesta 1 unidad de cuota por request.
const getVideosMetadataUrl = (apiKey, videoIds, parts = 'snippet,statistics') =>
    `https://www.googleapis.com/youtube/v3/videos?part=${enc(parts)}&id=${videoIds.map(enc).join(',')}&key=${enc(apiKey)}`;

// search.list por termino de busqueda (descubrimiento/trending). Cara: 100
// unidades por pagina. `order` = 'relevance' (default) o 'viewCount' (trending).
const getSearchVideosUrl = (apiKey, query, order = 'relevance', pageSize = 50, pageToken = '') => {
    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=${enc(order)}&maxResults=${enc(pageSize)}&q=${enc(query)}&key=${enc(apiKey)}`;
    if (pageToken) url += `&pageToken=${enc(pageToken)}`;
    return url;
};

module.exports = {
    getVideosByChannelIdUrl,
    getNextPageTokenUrl,
    getPlaylistsByChannelIdUrl,
    getVideosMetadataUrl,
    getSearchVideosUrl
}
