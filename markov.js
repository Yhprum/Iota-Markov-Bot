const Markov = require('markov-strings').default;
var AWS = require('aws-sdk');

const fs = require('fs');

module.exports = {
    setup: function(callback) {
        var history = "";
        let s3 = new AWS.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: 'us-east-2'
        });
        let getParams = {
            Bucket: 'iota-logs',
            Key: 'logs2.txt'
        };
        s3.getObject(getParams, function(err, data) {
            if (err)
                return err;

            history = data.Body.toString('utf-8');
            history = history.split(/\r|\n/).filter(Boolean);
            let markov = new Markov(history);
            callback(markov);
        });
    },
    readFile: function(callback) {
        let rawdata = fs.readFileSync('message.json');
        let log = JSON.parse(rawdata);
        let map = new Map();
        for(let i = 0, l = log.length; i < l; ++i) {
            if (log[i].text) {
                if (map.get(log[i].user_id)) map.get(log[i].user_id).push(log[i].text);
                else map.set(log[i].user_id, [log[i].text]);
            }
        }
        callback(map);
    },
    createMarkov: function(arr, callback) {
        callback(new Markov(arr));
    },
    iotaMarkov: function(callback) {
        let rawdata = fs.readFileSync('message.json');
        let log = JSON.parse(rawdata);
        let map = [];
        for(let i = 0, l = log.length; i < l; ++i) {
            if (log[i].text) map.push(log[i].text);
        }
        callback(new Markov(map));
    }
};