const { getPaginatedComments, getNextCommentsPage } = require('./controllers/commentsController');

const { getAllPlaylistByChannelId, getPaginatedVideosByChannelId, getNextVideosPage, getVideosMetadata, searchVideos } = require('./controllers/videoController')

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

// --- Paginadores canonicos (stateless, recomendados) ------------------------
// Async-iterators: no guardan cursor en la instancia, asi que dos paginaciones
// pueden correr a la vez sin pisarse, terminan solas cuando no hay nextPageToken
// y son testeables en aislamiento. Son el paginador canonico de comentarios y de
// videos de canal: getAllComments/getAllVideos de abajo los reusan en vez de
// recopiar el loop. (getPlaylist usa su propio loop: playlists.list es otro
// endpoint, con id directo en vez de id.videoId.)

// Paginas de comentarios de un video: cada `yield` es un array de comentarios.
youtubeClient.prototype.commentsPages = async function* (videoId, { pageSize = 100 } = {}) {
    assertId(videoId, 'videoId');
    let data = await getPaginatedComments(this.apiKey, videoId, pageSize);
    yield data.comments;
    while (data.nextPageToken) {
        data = await getNextCommentsPage(this.apiKey, videoId, data.nextPageToken, pageSize);
        yield data.comments;
    }
};

// Comentarios uno por uno (aplana las paginas).
youtubeClient.prototype.comments = async function* (videoId, options) {
    for await (const page of this.commentsPages(videoId, options)) {
        yield* page;
    }
};

// Paginas de ids de video de un canal: cada `yield` es un array de videoIds.
youtubeClient.prototype.channelVideoPages = async function* (channelId, { pageSize = 50 } = {}) {
    assertId(channelId, 'channelId');
    let data = await getPaginatedVideosByChannelId(this.apiKey, channelId, pageSize);
    yield data.allVideosId;
    while (data.nextPageToken) {
        data = await getNextVideosPage(this.apiKey, channelId, pageSize, data.nextPageToken);
        yield data.allVideosId;
    }
};

// Ids de video de un canal uno por uno.
youtubeClient.prototype.channelVideos = async function* (channelId, options) {
    for await (const page of this.channelVideoPages(channelId, options)) {
        yield* page;
    }
};

// --- Conveniencias "traer todo" (reusan los paginadores canonicos) ----------

youtubeClient.prototype.getAllComments = async function (videoId) {
    const all = [];
    for await (const page of this.commentsPages(videoId, { pageSize: 100 })) {
        all.push(...page);
    }
    return all;
};

/**
 * @deprecated Usa el paginador stateless `commentsPages(videoId)` /
 * `comments(videoId)`. Este metodo guarda el cursor en la instancia, asi que no
 * podes paginar dos videos a la vez con el mismo cliente. Se mantiene por
 * compatibilidad; sera removido en la proxima major.
 */
youtubeClient.prototype.getPaginatedComments = async function (videoId, pageSize) {
    assertId(videoId, 'videoId');
    const commentsData = await getPaginatedComments(this.apiKey, videoId, pageSize);
    this.videoId = videoId;
    this.commentsPageSize = pageSize;
    this.nextCommentsPageToken = commentsData.nextPageToken;
    return commentsData.comments;
};

/** @deprecated Ver `commentsPages` / `comments`. */
youtubeClient.prototype.getNextCommentsPage = async function (pageSize) {
    if (!this.nextCommentsPageToken) return [];
    const size = pageSize ?? this.commentsPageSize;
    const commentsData = await getNextCommentsPage(this.apiKey, this.videoId, this.nextCommentsPageToken, size)
    this.nextCommentsPageToken = commentsData.nextPageToken;
    return commentsData.comments;
};

youtubeClient.prototype.getAllVideos = async function (channelId) {
    const seen = new Set();
    for await (const page of this.channelVideoPages(channelId, { pageSize: 50 })) {
        for (const id of page) seen.add(id);
    }
    return [...seen];
};

youtubeClient.prototype.getPlaylist = async function (channelId) {
    assertId(channelId, 'channelId');
    const channelData = await getAllPlaylistByChannelId(this.apiKey, channelId);
    return [...new Set(channelData.allVideosId)];
};

/**
 * @deprecated Usa el paginador stateless `channelVideoPages(channelId)` /
 * `channelVideos(channelId)`. Este metodo guarda el cursor en la instancia. Se
 * mantiene por compatibilidad; sera removido en la proxima major.
 */
youtubeClient.prototype.getPaginatedChannelVideos = async function (channelId, pageSize = 50) {
    assertId(channelId, 'channelId');
    const videosData = await getPaginatedVideosByChannelId(this.apiKey, channelId, pageSize);
    this.channelId = channelId;
    this.videosPageSize = pageSize;
    this.nextVideosPageToken = videosData.nextPageToken;
    return videosData.allVideosId;
}

/** @deprecated Ver `channelVideoPages` / `channelVideos`. */
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
