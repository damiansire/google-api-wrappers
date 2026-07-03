// Todo valor interpolado se escapa (ver videoAdapter). Firma de getNextPageTokenUrl
// (apiKey, videoId, pageToken, pageSize) — es la firma canonica que adopto videoAdapter.
const enc = encodeURIComponent;

// Un unico constructor de URLs de commentThreads: centraliza host, `part` y el
// escapeo de CADA valor. Antes las tres funciones armaban la URL a mano y ya habian
// divergido (getNextPageTokenUrl apuntaba a youtube.googleapis.com y las otras dos a
// www.googleapis.com); con un solo builder, cambiar host / `part` / agregar un param
// es un solo lugar y no puede quedar una variante atras. Los params opcionales
// (maxResults, pageToken) se omiten cuando no vienen -> misma URL que antes.
const COMMENT_THREADS_ENDPOINT =
    'https://www.googleapis.com/youtube/v3/commentThreads';

const commentThreadsUrl = (apiKey, videoId, extraParams = {}) => {
    const params = { part: 'id,snippet', videoId, ...extraParams, key: apiKey };
    const query = Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== '')
        .map(([key, value]) => `${key}=${enc(value)}`)
        .join('&');
    return `${COMMENT_THREADS_ENDPOINT}?${query}`;
};

const getSpecificCommentAmountUrl = (apiKey, videoId, paginatedSize = 20) =>
    commentThreadsUrl(apiKey, videoId, { maxResults: paginatedSize })

const getNextPageTokenUrl = (apiKey, videoId, nextPageToken, paginatedSize = 20) =>
    commentThreadsUrl(apiKey, videoId, { maxResults: paginatedSize, pageToken: nextPageToken })

const getVideoCommentsUrl = (apiKey, videoId) =>
    commentThreadsUrl(apiKey, videoId)

module.exports = {
    getSpecificCommentAmountUrl,
    getNextPageTokenUrl,
    getVideoCommentsUrl
}
