var HTTPS = require('https');
const request = require('request').defaults({ encoding: null });

var botID = process.env.BOT_ID;
let token = process.env.GROUPME_API_TOKEN;
let groupId = process.env.GROUP_ID;

var Markov = require('./markov.js');
var markovs = new Map();
const help = require("./help");

const options = {
    maxTries: 50,
    filter: (result) => {
        return result.score > 1 && result.string.split(' ').length > 5;
    }
};
let quotes = new Map();
let images = new Map();
let config = {
    "nameChange": 0
};
let num_messages = 0;
let guid = 0;

const fs = require('fs');
const fsPromises = fs.promises;

var path = require("path");

(async () => {
    try {
        let logs = await fsPromises.readFile('storage/logs.json', 'utf8');
        quotes = new Map(JSON.parse(logs));
    } catch (err) {
        // Storage not there, perform first-time setup
        postMessage("Starting first and only time setup...");
        let msg = await getMessages();
        let count = msg.count;
        let msg_limit = 100;
        let msg_id = msg.messages[0].id;
        num_messages = count;

        while (count > 0) {
            if (count < msg_limit) msg_limit = count % msg_limit;
            let msgs = await getMessages(msg_limit, msg_id);
            msgs = msgs.messages;
            for(let i = 0, l = msgs.length; i < l; ++i) {
                if (msgs[i].text) {
                    if (quotes.get(msgs[i].user_id)) quotes.get(msgs[i].user_id).push(msgs[i].text);
                    else quotes.set(msgs[i].user_id, [msgs[i].text]);
                }
            }
            msg_id = msgs[msgs.length - 1].id;
            count -= 100;
            console.log(count);
        }
        console.log("end");

        let temp_dir = path.join(process.cwd(), 'storage/');
        if (!fs.existsSync(temp_dir))
            fs.mkdirSync(temp_dir);
        await fsPromises.writeFile('storage/logs.json', JSON.stringify([...quotes]));
    }

    try {
        let imgs = await fsPromises.readFile('storage/images.json', 'utf8');
        images = new Map(JSON.parse(imgs));
    } catch (err) {
        fs.writeFileSync('storage/images.json', JSON.stringify([]));
    }
    try {
        let cfg = await fsPromises.readFile('storage/config.json', 'utf8');
        config = JSON.parse(cfg);
    } catch (err) {
        fs.writeFileSync('storage/config.json', JSON.stringify(config));
    }
    // let flat = [].concat.apply([], [...quotes.values()]);
    // Markov.createMarkov(flat, (m) => {
    //     let markov = m;
    //     markov.buildCorpusAsync().then(() => {
    //         markovs.set("iota", markov);
    //     });
    //     postMessage("Setup complete");
    // });
})();

function respond() {
    var request = JSON.parse(this.req.chunks[0]),
        botRegex = /^=/;

    if (request.text && botRegex.test(request.text)) {
        this.res.writeHead(200);
        createMessage(request.text.split(" "), request.user_id, request);
        this.res.end();
    } else {
        console.log("don't care");
        this.res.writeHead(200);
        this.res.end();
    }
}

async function createMessage(input, uid, request) {
    switch (input[0].toLowerCase()) {
        case "=markov":
            input.splice(0, 1);
            input = input.join(" ");
            console.log(input);
            addMarkov(input.substring(1, input.length));
            break;
        case "=me":
            if (markovs.get(uid)) {
                try {
                    postMessage(markovs.get(uid).generate(options).string);
                } catch (e) {
                    postMessage("error: could not generate (probably too few samples)");
                }
            } else {
                Markov.createMarkov(quotes.get(uid), (m) => {
                    console.log("creating");
                    let markov = m;
                    markov.buildCorpus();
                    markovs.set(uid, markov);
                    postMessage(markovs.get(uid).generate(options).string);
                });
            }
            break;
        case "=iota":
            try {
                postMessage(markovs.get("iota").generate(options).string);
            } catch (e) {
                postMessage("error: could not generate");
            }
            break;
        case "=system":
            if (markovs.get("system")) {
                postMessage(markovs.get("system").generate(options).string);
            } else {
                Markov.createMarkov(quotes.get("system"), (m) => {
                    console.log("creating");
                    let markov = m;
                    markov.buildCorpus();
                    markovs.set("system", markov);
                    postMessage("markov created");
                });
            }
            break;
        case "=rename":
            let now = new Date();
            let diff = (now.getTime() - config.nameChange) / 1000 / 60;
            if (diff < 60) {
                diff = Math.round(diff * 100) / 100;
                changeName("This command is on cooldown for" + (60 - diff) + " minutes");
            } else {
                input.splice(0, 1);
                input = input.join(" ");
                let nickname = input.match(/@.+?(?=->)/)[0].trim();
                let newName = input.match(/->(.+)/)[1].trim();
                postMessage("bet");
                changeName(nickname.substring(1, input.length), newName);
            }
            break;
        case "=update":
            update();
            break;
        case "=img":
        case "=picture":
        case "=pic":
            input.splice(0, 1);
            imgCommand(input.join(" ").toLowerCase(), request);
            break;
        case "=derek":
            input.splice(0, 1);
            derek(input.join(" "));
            break;
        case "=uwu":
            let msgs = await getMessages(2);
            let toUwu = msgs.messages[1].text;
            toUwu = toUwu.replace(/[lr]/gi, "w");
            toUwu = toUwu.replace(/th/gi, "d");
            toUwu = toUwu.replace(/\b(you)\b/gi, "yuw");
            toUwu += " uwu";
            postMessage(toUwu);
            break;
        case "=help":
            let output = help(input);
            postMessage(output);
            break;
        default:
            postMessage("error: command not found");
            break;
    }
}

function imgCommand(input, request) {
    if (request.attachments.length) {
        for (let a of request.attachments) {
            console.log(a);
            if (a.type === "image") {
                images.set(input, a.url);
                fs.writeFileSync('storage/images.json', JSON.stringify([...images]));
                break;
            }
        }
    } else if (images.has(input)) {
        let body =  {
            "bot_id": botID,
            "attachments":[
                {
                    "type": "image",
                    "url": images.get(input)
                }
            ]
        };
        postWithBody(JSON.stringify(body));
    } else {
        postMessage("image not found");
    }
    console.log(images);
    console.log(input);
}

function derek(text) {
    console.log("testing");
    let params = {
        "template_id": 191961372,
        "username": process.env.IMGFLIP_USERNAME,
        "password": process.env.IMGFLIP_PASSWORD,
        "text0": text,
        "font": "arial"
    };

    request.post({url:'https://api.imgflip.com/caption_image', formData: params}, (err, httpResponse, body) => {
        if (err) {
            return console.error('failed:', err);
        }
        let img = JSON.parse(body).data.url;
        request(img, function (error, response, body) {
            let data = body.toString('utf8');
            let options = {
                url:'https://image.groupme.com/pictures',
                body: Buffer.from(body, 'base64'),
                encoding: null,
                headers: {
                    'X-Access-Token': token,
                    'Content-Type': "image/jpeg"
                }
            };
            request.post(options, (err, httpResponse, body) => {
                let url = JSON.parse(body.toString()).payload.url;
                let reqBody =  {
                    "bot_id": botID,
                    "attachments":[
                        {
                            "type": "image",
                            "url": url
                        }
                    ]
                };
                postWithBody(JSON.stringify(reqBody));
            });
        });
    });
}

async function addMarkov(nickname) {
    try {
        let user = await getUserFromMention(nickname);
        if (markovs.get(user.user_id)) {
            console.log("created");
            postMessage(markovs.get(user.user_id).generate(options).string);
        } else {
            Markov.createMarkov(quotes.get(user.user_id), (m) => {
                console.log("creating");
                let markov = m;
                markov.buildCorpus();
                markovs.set(user.user_id, markov);
                postMessage(markovs.get(user.user_id).generate(options).string);
            });
        }
    } catch (e) {
        postMessage("user not found");
    }
}

async function changeName(nickname, newNickname) {
    try {
        let user = await getUserFromMention(nickname);

        let token = process.env.GROUPME_API_TOKEN;
        let options = {
            hostname: 'api.groupme.com',
            path: '/v3/groups/' + groupId + '/members/' + user.id + '/remove?token=' + token,
            method: 'POST'
        };

        const req = HTTPS.request(options, (res) => {
            res.setEncoding('binary');
            let chunks = [];

            res.on('data', (chunk) => {
                chunks.push(Buffer.from(chunk, 'binary'));
            });

            res.on('end', () => {
                let binary = Buffer.concat(chunks);
                console.log(binary.toString('utf-8'));

                let postData = JSON.stringify({
                    members: [{
                        nickname: newNickname,
                        user_id: user.user_id
                    }]
                });

                let options = {
                    hostname: 'api.groupme.com',
                    path: '/v3/groups/' + groupId + '/members/add?token=' + token,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': postData.length
                    }
                };

                const req2 = HTTPS.request(options, (res2) => {
                    res2.setEncoding('utf8');
                    res2.on('data', function (chunk) {
                        console.log('Response: ' + chunk);
                        config.nameChange = new Date().getTime();
                        fs.writeFileSync('storage/config.json', JSON.stringify(config));
                    });
                });
                req2.on('error', (e) => {
                    console.error(e);
                });
                req2.write(postData);
                req2.end();
            });
        });

        req.on('error', (e) => {
            console.error(e);
        });
        req.end();
    } catch (e) {
        postMessage("user not found");
    }
}

function getUserFromMention(nickname) {
    let users;
    let options = {
        hostname: 'api.groupme.com',
        path: '/v3/groups/' + groupId + '?token=' + token,
        method: 'GET'
    };

    return new Promise(resolve => {
        const req = HTTPS.request(options, (res) => {
            res.setEncoding('binary');
            let chunks = [];

            res.on('data', (chunk) => {
                chunks.push(Buffer.from(chunk, 'binary'));
            });

            res.on('end', () => {
                let binary = Buffer.concat(chunks);
                users = JSON.parse(binary.toString('utf-8')).response.members;
                let user = users.find(o => o.nickname === nickname.trim());
                console.log(users.find(o => o.nickname === nickname.trim()));
                resolve(user);
            });
        });

        req.on('error', (e) => {
            console.error(e);
        });
        req.end();
    });
}

function getMessages(limit = 1, before_id = false) {
    let queryString = before_id ? "&before_id=" + before_id : "";
    return new Promise(resolve => {
        let options = {
            hostname: 'api.groupme.com',
            path: '/v3/groups/' + groupId + '/messages?token=' + token + '&limit=' + limit + queryString,
            method: 'GET'
        };

        const req = HTTPS.request(options, (res) => {
            res.setEncoding('binary');
            let chunks = [];
            res.on('data', function (chunk) {
                chunks.push(Buffer.from(chunk, 'binary'));
            });
            res.on('end', () => {
                let binary = Buffer.concat(chunks);
                resolve(JSON.parse(binary.toString('utf-8')).response);
            });
        });
        req.on('error', (e) => {
            console.error(e);
        });
        req.end();
    });
}

async function update() {
    let msg = await getMessages();
    let count = msg.count - num_messages;
    let msg_limit = 100;
    let msg_id = msg.messages[0].id;

    while (count > 0) {
        if (count < msg_limit) msg_limit = count % msg_limit;
        let msgs = await getMessages(msg_limit, msg_id);
        msgs = msgs.messages;
        for(let i = 0, l = msgs.length; i < l; ++i) {
            if (msgs[i].text) {
                if (quotes.get(msgs[i].user_id)) quotes.get(msgs[i].user_id).push(msgs[i].text);
                else quotes.set(msgs[i].user_id, [msgs[i].text]);

            }
        }
        msg_id = msgs[msgs.length - 1].id;
        count -= 100;
    }
    fs.writeFile('storage/logs.json', JSON.stringify([...quotes]));
}

function postMessage(msg) {
    var options, body, botReq;

    options = {
        hostname: 'api.groupme.com',
        path: '/v3/bots/post',
        method: 'POST'
    };

    body = {
        "bot_id": botID,
        "text": msg
    };

    console.log('sending ' + msg + ' to ' + botID);

    botReq = HTTPS.request(options, function (res) {
        if (res.statusCode == 202) {
            //neat
        } else {
            console.log('rejecting bad status code ' + res.statusCode);
            console.log(res);
        }
    });

    botReq.on('error', function (err) {
        console.log('error posting message ' + JSON.stringify(err));
    });
    botReq.on('timeout', function (err) {
        console.log('timeout posting message ' + JSON.stringify(err));
    });
    botReq.end(JSON.stringify(body));
}

function postWithBody(body) {

    let options = {
        hostname: 'api.groupme.com',
        path: '/v3/bots/post',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': body.length
        }
    };

    const req = HTTPS.request(options, (res) => {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('Response: ' + chunk);
        });
    });
    req.on('error', (e) => {
        console.error(e);
    });
    req.write(body);
    req.end();
}

exports.respond = respond;