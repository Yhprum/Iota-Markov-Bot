var HTTPS = require('https');

var botID = process.env.BOT_ID;

var Markov = require('./markov.js');

var markov;

const options = {
  maxTries: 50,
  filter: (result) => {
    return result.score > 1 && result.refs.length >= 3 && result.string.split(' ').length >= 5;
  }
};

const map = Markov.readFile(_map => {
  Markov.createMarkov(_map.get("12345678"), (m) => {
    markov = m;
    markov.buildCorpus({ stateSize: 1 });
    console.log("ready");
    // console.log(markov.generate(options));
  });
});

// Markov.iotaMarkov((m) => {
//   markov = m;
//   markov.buildCorpus();
//   console.log("ready");
//   console.log(markov.generate({stateSize: 3}).string);
// });

function respond() {
  var request = JSON.parse(this.req.chunks[0]),
      botRegex = /brian/i;

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

  try {
    botResponse = markov.generate({stateSize: 2}).string;
  } catch (e) {
    botResponse = "error: could not generate (probably too few samples)"
  }

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
        console.log(res);
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

exports.respond = respond;