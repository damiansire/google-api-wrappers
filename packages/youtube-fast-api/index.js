const { getAllComments, getPaginatedComments, getNextCommentsPage } = require('./controllers/commentsController');

const { getAllVideosByChannelId, getAllPlaylistByChannelId, getPaginatedVideosByChannelId, getNextVideosPage } = require('./controllers/videoController')

function youtubeClient(apiKey) {
    this.apiKey = apiKey;
    //Comments
    this.videoId = "";
    this.commentsPageSize = "";
    this.nextCommentsPageToken = "";
    //Videos
    this.channelId = "";
    this.videosPageSize = "";
    this.nextVideosPageToken = "";
}

youtubeClient.prototype.getAllComments = (videoId) => getAllComments(this.apiKey, videoId);

youtubeClient.prototype.getPaginatedComments = async function (videoId, pageSize) {
    if (typeof videoId === 'number') throw new TypeError('expected a videoId string parameter');
    const commentsData = await getPaginatedComments(this.apiKey, videoId, pageSize);
    this.videoId = videoId;
    this.commentsPageSize = pageSize;
    this.nextCommentsPageToken = commentsData.nextCommentsPageToken;
    return commentsData.comments;
};

youtubeClient.prototype.getNextCommentsPage = async function (pageSize) {
    if (!this.nextCommentsPageToken) return [];
    const size = pageSize ?? this.commentsPageSize;
    const commentsData = await getNextCommentsPage(this.apiKey, this.videoId, this.nextCommentsPageToken, size)
    this.nextCommentsPageToken = commentsData.nextCommentsPageToken;
    return commentsData.comments;
};

youtubeClient.prototype.getAllVideos = async function (channelId) {
    return getAllVideosByChannelId(this.apiKey, channelId);
};

youtubeClient.prototype.getPlaylist = async function (channelId) {
    return getAllPlaylistByChannelId(this.apiKey, channelId);
};

//Max 50
youtubeClient.prototype.getPaginatedChannelVideos = async function (channelId, pageSize = 50) {
    if (typeof channelId === 'number') throw new TypeError('expected a channelId string parameter');
    const videosData = await getPaginatedVideosByChannelId(this.apiKey, channelId, pageSize);
    this.channelId = channelId;
    this.videosPageSize = pageSize;
    this.nextVideosPageToken = videosData.nextPageToken;
    return videosData.allVideosId;
}

//Max 50
youtubeClient.prototype.getNextVideosPage = async function (pageSize) {
    if (!this.nextVideosPageToken) return [];
    const size = pageSize ?? this.videosPageSize;
    const videosData = await getNextVideosPage(this.apiKey, this.videoId, this.nextCommentsPageToken, size)
    this.nextVideosPageToken = videosData.nextPageToken;
    return videosData.allVideosId;
};

module.exports = youtubeClient;
