const https = require('https');

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

exports.makeRequest = makeRequest;