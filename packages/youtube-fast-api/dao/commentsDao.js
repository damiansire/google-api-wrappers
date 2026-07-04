const { makeRequest } = require("../adapters/youtubeApi");
const { getVideoCommentsUrl, getSpecificCommentAmountUrl, getNextPageTokenUrl } = require("../adapters/commentsAdapter")

async function getComments(apiKey, videoId, commentAmount) {
    let threadsUrl = commentAmount ? getSpecificCommentAmountUrl(apiKey, videoId, commentAmount) : getVideoCommentsUrl(apiKey, videoId);
    let commentsResponse = await makeRequest(threadsUrl);
    let commentsData = responseToComments(commentsResponse);
    return { nextPageToken: commentsResponse.nextPageToken, comments: commentsData };
}

async function getNextCommentsPage(apiKey, videoId, token, paginatedSize) {
    const nextPageUrl = getNextPageTokenUrl(apiKey, videoId, token, paginatedSize)
    const commentsResponse = await makeRequest(nextPageUrl);
    let commentsData = responseToComments(commentsResponse)
    return { nextPageToken: commentsResponse.nextPageToken, comments: commentsData };
}

function responseToComments(commentsResponse) {
    // `items` puede faltar en un 2xx (respuesta parcial / resultado vacío que omite
    // el campo): `|| []` devuelve una página vacía en vez de un TypeError opaco,
    // igual que los mappers de videos.list/search.list.
    return (commentsResponse.items || []).map(comment => dtoToComment(comment));
}

function dtoToComment(comment) {
    return { ...comment.snippet.topLevelComment.snippet, id: comment.snippet.topLevelComment.id };
}

exports.getNextCommentsPage = getNextCommentsPage;
exports.getComments = getComments;

