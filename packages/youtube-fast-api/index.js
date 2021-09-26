

(async () => {

    const commentsController = require("./controllers/commentsController")

    if (process.env.NODE_ENV != "production") {
        require('dotenv').config()
    }

    let apiKey = process.env.YOUTUBE_API_KEY;
    let videoId = "UIENaGNL6es";


    const data3 = await commentsController.getAllComments(apiKey, videoId);
    const data1 = await commentsController.getPaginatedComments(apiKey, videoId, 30);
    const data2 = await commentsController.getNextCommentsPage(apiKey, videoId, data1.nextPageToken, 30);
    console.log("xd")
})()

