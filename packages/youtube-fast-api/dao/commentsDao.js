const { makeRequest } = require("../adapters/commentsAdapter");
const { getVideoCommentsUrl, GetSpecificCommentAmountUrl, getNextPageTokenUrl } = require("../adapters/youtubeApi")

async function getComments(apiKey, videoId, commentAmount) {
    let threadsUrl = commentAmount ? GetSpecificCommentAmountUrl(apiKey, videoId, commentAmount) : getVideoCommentsUrl(apiKey, videoId);
    let commentsResponse = await makeRequest(threadsUrl);
    let commentsData = responseToComments(commentsResponse);
    return { nextPageToken: commentsResponse.nextPageToken, comments: commentsData };
}

async function getNextCommentsPage(apiKey, videoId, token, paginatedSize) {
    nextPageUrl = getNextPageTokenUrl(apiKey, videoId, token, paginatedSize)
    commentsResponse = await makeRequest(nextPageUrl);
    let commentsData = responseToComments(commentsResponse)
    return { nextPageToken: commentsResponse.nextPageToken, comments: commentsData };
}

function responseToComments(commentsResponse) {
    return commentsResponse.items.map(comment => dtoToComment(comment));
}

function dtoToComment(comment) {
    return { ...comment.snippet.topLevelComment.snippet, id: comment.snippet.topLevelComment.id };
}

exports.getNextCommentsPage = getNextCommentsPage;
exports.getComments = getComments;

