const https = require('https');

function makeRequest(url) {
    return new Promise(function (resolve, reject) {

        const req = https.get(url, res => {
            let data = [];
            const headerDate = res.headers && res.headers.date ? res.headers.date : 'No response date';
            console.log('Status Code:', res.statusCode);
            console.log('Date in Response header:', headerDate);

            res.on('data', chunk => {
                data.push(chunk);
            });

            res.on('end', () => {
                console.log('Response ended: ');
                const body = Buffer.concat(data).toString();
                if (res.statusCode >= 400) {
                    reject(new Error('Request failed with status ' + res.statusCode + ': ' + body));
                    return;
                }
                let users;
                try {
                    users = JSON.parse(body);
                } catch (parseErr) {
                    reject(new Error('Failed to parse response body as JSON: ' + parseErr.message));
                    return;
                }
                resolve(users)
            });
        }).on('error', err => {
            console.log('Error: ', err.message);
            reject(err)
        });

        req.setTimeout(30000, () => {
            req.destroy(new Error('Request timed out'));
        });

    })
}

exports.makeRequest = makeRequest;