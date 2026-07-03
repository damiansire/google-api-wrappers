const commentsDao = require("../dao/commentsDao");

async function getPaginatedComments(apiKey, videoId, paginatedSize) {
    let commentsData = await commentsDao.getComments(apiKey, videoId, paginatedSize);
    return commentsData;
}

async function getNextCommentsPage(apiKey, videoId, token, paginatedSize){
    return commentsDao.getNextCommentsPage(apiKey, videoId, token, paginatedSize);
}

async function getAllComments(apiKey, videoId) {
    let commentsData = await commentsDao.getComments(apiKey, videoId, 100);
    const allComments = [...commentsData.comments];
    //Iterate — push(...) evita el O(n^2) de reasignar el acumulado con concat.
    while (commentsData.nextPageToken) {
        commentsData = await commentsDao.getNextCommentsPage(apiKey, videoId, commentsData.nextPageToken, 100)
        allComments.push(...commentsData.comments);
    }

    return allComments;
}

exports.getPaginatedComments = getPaginatedComments;
exports.getNextCommentsPage = getNextCommentsPage;
exports.getAllComments = getAllComments;
