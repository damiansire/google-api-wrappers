
const GetSpecificCommentAmountUrl = (apiKey, videoId, paginatedSize = 20) => {
    return `https://www.googleapis.com/youtube/v3/commentThreads?part=id%2Csnippet&maxResults=${paginatedSize}&videoId=${videoId}&key=${apiKey}`
}

const getNextPageTokenUrl = (apiKey, videoId, nextPageToken, paginatedSize = 20) => {
    return `https://youtube.googleapis.com/youtube/v3/commentThreads?part=id%2Csnippet&maxResults=${paginatedSize}&pageToken=${nextPageToken}&videoId=${videoId}&key=${apiKey}`
}

const getVideoCommentsUrl = (apiKey, videoId) => {
    return `https://www.googleapis.com/youtube/v3/commentThreads?part=id%2Csnippet&videoId=${videoId}&key=${apiKey}`
}

exports.GetSpecificCommentAmountUrl = GetSpecificCommentAmountUrl;
exports.getNextPageTokenUrl = getNextPageTokenUrl;
exports.getVideoCommentsUrl = getVideoCommentsUrl;