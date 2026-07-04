// Todo valor interpolado en la URL se escapa con encodeURIComponent: los ids que
// llegan del consumidor (channelId/videoId/pageToken) podrían contener &, #, = y
// contaminar la query (inyeccion de parametros / DoS de auth). El separador ','
// de la lista de ids NO se escapa a proposito (es delimitador de la API).
const enc = encodeURIComponent;

const BASE = 'https://www.googleapis.com/youtube/v3';

// Arma "BASE/endpoint?query": escapa cada valor, OMITE los params undefined/''
// (p.ej. pageToken en la 1ra pagina) y deja `key` donde el objeto lo ponga (al
// final). Centraliza el host, el escapeo y el manejo del pageToken opcional que
// antes se repetia en cada builder a mano.
const buildUrl = (endpoint, params) => {
    const query = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== '')
        .map(([key, value]) => `${key}=${enc(value)}`)
        .join('&');
    return `${BASE}/${endpoint}?${query}`;
};

const getVideosByChannelIdUrl = (apiKey, channelId) =>
    buildUrl('search', { part: 'id', type: 'video', channelId, key: apiKey });

// Siguiente pagina de la busqueda por canal (maximo 50).
// Firma UNIFICADA con commentsAdapter.getNextPageTokenUrl: (apiKey, id, pageToken,
// pageSize). Antes era (apiKey, id, pageSize, pageToken) — invertida respecto de
// comments: dos exports con el mismo nombre y argumentos swapeados eran un footgun.
const getNextPageTokenUrl = (apiKey, channelId, nextPageToken, paginatedSize = 50) =>
    buildUrl('search', { part: 'id', type: 'video', channelId, maxResults: paginatedSize, pageToken: nextPageToken, key: apiKey });

// playlists.list: ids de las playlists de un canal. A diferencia de search.list,
// devuelve siempre playlists (id directo, no id.playlistId) y permite maxResults
// hasta 50. `pageToken` vacio para la primera pagina (se omite).
const getPlaylistsByChannelIdUrl = (apiKey, channelId, maxResults = 50, pageToken = '') =>
    buildUrl('playlists', { part: 'id', channelId, maxResults, pageToken, key: apiKey });

// videos.list: metadata (titulo/descripcion/tags/estadisticas) de hasta 50 videos
// por request. La lista va como `id=a,b,c` (cada id escapado, la coma NO: es
// delimitador de la API), asi que no pasa por buildUrl —que escaparia la coma.
const getVideosMetadataUrl = (apiKey, videoIds, parts = 'snippet,statistics') =>
    `${BASE}/videos?part=${enc(parts)}&id=${videoIds.map(enc).join(',')}&key=${enc(apiKey)}`;

// search.list por termino de busqueda (descubrimiento/trending). Cara: 100
// unidades por pagina. `order` = 'relevance' (default) o 'viewCount' (trending).
const getSearchVideosUrl = (apiKey, query, order = 'relevance', pageSize = 50, pageToken = '') =>
    buildUrl('search', { part: 'snippet', type: 'video', order, maxResults: pageSize, q: query, pageToken, key: apiKey });

module.exports = {
    getVideosByChannelIdUrl,
    getNextPageTokenUrl,
    getPlaylistsByChannelIdUrl,
    getVideosMetadataUrl,
    getSearchVideosUrl
}
