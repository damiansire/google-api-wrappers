const { getAllComments, getPaginatedComments, getNextCommentsPage } = require("./controllers/commentsController")

function youtubeClient(apiKey) {
    this.apiKey = apiKey;
}

youtubeClient.prototype.getAllComments = function (videoId) {
    return getAllComments(this.apiKey, videoId)
}

youtubeClient.prototype.getPaginatedComments = async function (videoId, paginatedSize) {
    if (typeof videoId == 'number') throw new TypeError('expected a videoId string parameter');
    const commentsData = await getPaginatedComments(this.apiKey, videoId, paginatedSize);
    this.nextPageToken = commentsData.nextPageToken;
    this.videoId = videoId;
    this.paginatedSize = paginatedSize;
    return commentsData.comments;
}

youtubeClient.prototype.getNextCommentsPage = async function (paginatedSize) {
    if (!this.nextPageToken) return []
    paginatedSize = paginatedSize ?? this.paginatedSize;
    const commentsData = await getNextCommentsPage(this.apiKey, this.videoId, this.nextPageToken, paginatedSize)
    this.nextPageToken = commentsData.nextPageToken;
    return commentsData.comments;
}

module.exports = youtubeClient;
