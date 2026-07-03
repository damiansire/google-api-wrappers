// Todo valor interpolado se escapa (ver videoAdapter). Firma de getNextPageTokenUrl
// (apiKey, videoId, pageToken, pageSize) — es la firma canonica que adopto videoAdapter.
const enc = encodeURIComponent;

const getSpecificCommentAmountUrl = (apiKey, videoId, paginatedSize = 20) =>
    `https://www.googleapis.com/youtube/v3/commentThreads?part=id%2Csnippet&maxResults=${enc(paginatedSize)}&videoId=${enc(videoId)}&key=${enc(apiKey)}`

const getNextPageTokenUrl = (apiKey, videoId, nextPageToken, paginatedSize = 20) =>
    `https://youtube.googleapis.com/youtube/v3/commentThreads?part=id%2Csnippet&maxResults=${enc(paginatedSize)}&pageToken=${enc(nextPageToken)}&videoId=${enc(videoId)}&key=${enc(apiKey)}`

const getVideoCommentsUrl = (apiKey, videoId) =>
    `https://www.googleapis.com/youtube/v3/commentThreads?part=id%2Csnippet&videoId=${enc(videoId)}&key=${enc(apiKey)}`

module.exports = {
    getSpecificCommentAmountUrl,
    getNextPageTokenUrl,
    getVideoCommentsUrl
}
