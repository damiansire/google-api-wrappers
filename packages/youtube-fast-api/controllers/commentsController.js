const commentsDao = require("../dao/commentsDao");

async function getPaginatedComments(apiKey, videoId, paginatedSize) {
    let commentsData = await commentsDao.getComments(apiKey, videoId, paginatedSize);
    return commentsData;
}

async function getNextCommentsPage(apiKey, videoId, token, paginatedSize){
    return commentsDao.getNextCommentsPage(apiKey, videoId, token, paginatedSize);
}

// (El "traer todos los comentarios" vive en el cliente como async-generator
// canónico `commentsPages`; ya no se implementa el loop acá.)

exports.getPaginatedComments = getPaginatedComments;
exports.getNextCommentsPage = getNextCommentsPage;
