if (process.env.NODE_ENV != "production") {
    require('dotenv').config()
}

const getUrl = (apiKey, videoId, commentAmount = 20) => {
    return `https://www.googleapis.com/youtube/v3/commentThreads?part=id%2Csnippet&maxResults=${commentAmount}&videoId=${videoId}&key=${apiKey}`
}

let apiKey = process.env.YOUTUBE_API_KEY;
let videoId = "HwNIDcwfRLY";

const https = require('https')

function makeRequest(url) {
    return new Promise(function (resolve, reject) {

        https.get(url, res => {
            let data = [];
            const headerDate = res.headers && res.headers.date ? res.headers.date : 'No response date';
            console.log('Status Code:', res.statusCode);
            console.log('Date in Response header:', headerDate);

            res.on('data', chunk => {
                data.push(chunk);
            });

            res.on('end', () => {
                console.log('Response ended: ');
                const users = JSON.parse(Buffer.concat(data).toString());
                resolve(users)
            });
        }).on('error', err => {
            console.log('Error: ', err.message);
            reject(err)
        });

    })
}


//Falta considerar la paginacion

function getCommentData(comment) {
    return { ...comment.snippet.topLevelComment.snippet, id: comment.snippet.topLevelComment.id };
}

async function getComments(apiKey, videoId, commentAmount) {
    let threadsUrl = getUrl(apiKey, videoId, commentAmount);
    let commentData = await makeRequest(threadsUrl);
    return commentData.items.map(comment => getCommentData(comment));
}

const getNextPageTokenUrl = (apiKey, videoId, nextPageToken) => {
    return `https://youtube.googleapis.com/youtube/v3/commentThreads?part=id%2Csnippet&pageToken=${nextPageToken}&videoId=${videoId}&key=${apiKey}`
}


async function getAllComments(apiKey, videoId) {

    let threadsUrl = getUrl(apiKey, videoId, 100);
    let commentsData = await makeRequest(threadsUrl);
    let allComments = commentsData.items.map(comment => getCommentData(comment));

    //I iterate on all comment pages
    while (commentsData.nextPageToken) {
        nextPageUrl = getNextPageTokenUrl(apiKey, videoId, commentsData.nextPageToken)
        commentsData = await makeRequest(nextPageUrl);
        let newsCommets = commentsData.items.map(comment => getCommentData(comment));
        allComments = allComments.concat(newsCommets);
    }

    return allComments;
}

getAllComments(apiKey, videoId);