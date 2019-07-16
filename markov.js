const Markov = require('markov-strings').default;
module.exports = {
    createMarkov: function(arr, callback) {
        callback(new Markov(arr));
    }
};