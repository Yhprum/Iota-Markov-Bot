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
    createMarkov: function(arr, callback) {
        callback(new Markov(arr, {stateSize: 1}));
    }
};