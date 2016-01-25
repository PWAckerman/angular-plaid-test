'use strict';
let mongoose = require("mongoose");

const secrets;

if (process.env.NODE_ENV === 'production') {
  console.log('case 11111');
  secrets = require("./herokuConfig.js");
} else {
  console.log('case 22222');
}

mongoose.Promise = require("q").Promise;

module.exports = exports = {}

exports.db = function () {
  return mongoose.connect(`mongodb://${secrets.secrets.mongo_user}:${secrets.secrets.mongo_key}@ds039135.mongolab.com:39135/pushbudget`, function () {
    console.log('connected');
  });
}