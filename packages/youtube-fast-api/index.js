const { getAllComments, getPaginatedComments, getNextCommentsPage } = require("./controllers/commentsController")

function youtubeClient(apiKey) {
    this.apiKey = apiKey;
}

youtubeClient.prototype.getAllComments = function (videoId) {
    return getAllComments(this.apiKey, videoId)
}

youtubeClient.prototype.getPaginatedComments = function (videoId, paginatedSize) {
    return getPaginatedComments(this.apiKey, videoId, paginatedSize)
}

youtubeClient.prototype.getNextCommentsPage = function (videoId, token, paginatedSize) {
    return getNextCommentsPage(this.apiKey, videoId, token, paginatedSize)
}

module.exports = youtubeClient;
