const getSpecificCommentAmountUrl = (apiKey, videoId, paginatedSize = 20) => `https://www.googleapis.com/youtube/v3/commentThreads?part=id%2Csnippet&maxResults=${paginatedSize}&videoId=${videoId}&key=${apiKey}`

const getNextPageTokenUrl = (apiKey, videoId, nextPageToken, paginatedSize = 20) => `https://youtube.googleapis.com/youtube/v3/commentThreads?part=id%2Csnippet&maxResults=${paginatedSize}&pageToken=${nextPageToken}&videoId=${videoId}&key=${apiKey}`

const getVideoCommentsUrl = (apiKey, videoId) => `https://www.googleapis.com/youtube/v3/commentThreads?part=id%2Csnippet&videoId=${videoId}&key=${apiKey}`

module.exports = {
    getSpecificCommentAmountUrl,
    getNextPageTokenUrl,
    getVideoCommentsUrl
}