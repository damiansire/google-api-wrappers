const { getAllComments, getPaginatedComments, getNextCommentsPage } = require("./controllers/commentsController")

if (process.env.NODE_ENV != "production") {
    require('dotenv').config()
}

let apiKey = process.env.YOUTUBE_API_KEY;
let videoId = "UIENaGNL6es";

exports.getAllComments = getAllComments;
exports.getPaginatedComments = getPaginatedComments;
exports.getNextCommentsPage = getNextCommentsPage;