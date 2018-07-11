var HTTPS = require('https');

var AWS = require('aws-sdk');
var StringDecoder = require('string_decoder').StringDecoder;

var markov;

createMarkovChain();

var botID = process.env.BOT_ID;

function respond() {
  var request = JSON.parse(this.req.chunks[0]),
      botRegex = /^!brian/;

  if(request.text && botRegex.test(request.text)) {
    this.res.writeHead(200);
    postMessage();
    this.res.end();
  } else {
    console.log("don't care");
    this.res.writeHead(200);
    this.res.end();
  }
}

function postMessage() {
  var botResponse, options, body, botReq;

  botResponse = markov.makeChain();

  options = {
    hostname: 'api.groupme.com',
    path: '/v3/bots/post',
    method: 'POST'
  };

  body = {
    "bot_id" : botID,
    "text" : botResponse
  };

  console.log('sending ' + botResponse + ' to ' + botID);

  botReq = HTTPS.request(options, function(res) {
      if(res.statusCode == 202) {
        //neat
      } else {
        console.log('rejecting bad status code ' + res.statusCode);
      }
  });

  botReq.on('error', function(err) {
    console.log('error posting message '  + JSON.stringify(err));
  });
  botReq.on('timeout', function(err) {
    console.log('timeout posting message '  + JSON.stringify(err));
  });
  botReq.end(JSON.stringify(body));
}

function createMarkovChain() {

    var history = "";

    var s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: 'us-east-2'
    });
    var decoder = new StringDecoder('utf8');
    s3.getObject({
        Bucket: 'iota-logs',
        Key: 'logs2.txt'
    }).on('error', function (err) {
        console.log(err);
    }).on('httpData', function (chunk) {
        var textChunk = decoder.write(chunk);
        history += textChunk;
    }).on('httpDone', function () {
        history = history.split(/\r|\n/).filter(Boolean);
        const MarkovGen = require('markov-generator');
        markov = new MarkovGen({
          input: history,
          minLength: 10
        });
    }).send();
}

exports.respond = respond;