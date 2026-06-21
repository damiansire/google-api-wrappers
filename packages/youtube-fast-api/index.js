const { getAllComments, getPaginatedComments, getNextCommentsPage } = require('./controllers/commentsController');

const { getAllVideosByChannelId, getAllPlaylistByChannelId, getPaginatedVideosByChannelId, getNextVideosPage, getVideosMetadata, searchVideos } = require('./controllers/videoController')

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

// Valida que un id publico sea un string no vacio. Centraliza el chequeo para
// que todos los metodos publicos rechacen undefined/null/""/numero/objeto igual.
function assertId(value, name) {
    if (typeof value !== 'string' || !value) {
        throw new TypeError(`expected a ${name} string parameter`);
    }
}

youtubeClient.prototype.getAllComments = async function (videoId) {
    assertId(videoId, 'videoId');
    return getAllComments(this.apiKey, videoId);
};

youtubeClient.prototype.getPaginatedComments = async function (videoId, pageSize) {
    assertId(videoId, 'videoId');
    const commentsData = await getPaginatedComments(this.apiKey, videoId, pageSize);
    this.videoId = videoId;
    this.commentsPageSize = pageSize;
    this.nextCommentsPageToken = commentsData.nextPageToken;
    return commentsData.comments;
};

youtubeClient.prototype.getNextCommentsPage = async function (pageSize) {
    if (!this.nextCommentsPageToken) return [];
    const size = pageSize ?? this.commentsPageSize;
    const commentsData = await getNextCommentsPage(this.apiKey, this.videoId, this.nextCommentsPageToken, size)
    this.nextCommentsPageToken = commentsData.nextPageToken;
    return commentsData.comments;
};

youtubeClient.prototype.getAllVideos = async function (channelId) {
    assertId(channelId, 'channelId');
    return getAllVideosByChannelId(this.apiKey, channelId);
};

youtubeClient.prototype.getPlaylist = async function (channelId) {
    assertId(channelId, 'channelId');
    const channelData = await getAllPlaylistByChannelId(this.apiKey, channelId);
    return [...new Set(channelData.allVideosId)];
};

//Max 50
youtubeClient.prototype.getPaginatedChannelVideos = async function (channelId, pageSize = 50) {
    assertId(channelId, 'channelId');
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
    const videosData = await getNextVideosPage(this.apiKey, this.channelId, size, this.nextVideosPageToken)
    this.nextVideosPageToken = videosData.nextPageToken;
    return videosData.allVideosId;
};

// Metadata (titulo/descripcion/tags/estadisticas) de varios videos por id.
// Parte internamente en chunks de 50 (limite de videos.list).
youtubeClient.prototype.getVideosMetadata = async function (videoIds) {
    if (!Array.isArray(videoIds)) throw new TypeError('expected an array of videoId strings');
    return getVideosMetadata(this.apiKey, videoIds);
};

// Metadata de un solo video; devuelve null si la API no lo encontro.
youtubeClient.prototype.getVideoMetadata = async function (videoId) {
    if (typeof videoId !== 'string') throw new TypeError('expected a videoId string parameter');
    const [meta] = await getVideosMetadata(this.apiKey, [videoId]);
    return meta ?? null;
};

// Busqueda por termino (descubrimiento/trending). Cara: 100 unidades por
// pagina, por eso options.maxPages (default 1) es el tope de costo.
youtubeClient.prototype.searchVideos = async function (query, options) {
    if (typeof query !== 'string') throw new TypeError('expected a query string parameter');
    return searchVideos(this.apiKey, query, options);
};

module.exports = youtubeClient;
