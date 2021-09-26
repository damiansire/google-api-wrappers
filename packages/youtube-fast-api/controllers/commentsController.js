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
    let allComments = commentsData.comments;
    //Iterate
    while (commentsData.nextPageToken) {
        commentsData = await commentsDao.getNextCommentsPage(apiKey, videoId, commentsData.nextPageToken, 100)
        allComments = allComments.concat(commentsData.comments);
    }

    return allComments;
}

exports.getPaginatedComments = getPaginatedComments;
exports.getNextCommentsPage = getNextCommentsPage;
exports.getAllComments = getAllComments;
