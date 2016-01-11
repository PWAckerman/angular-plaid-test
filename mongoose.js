'use strict';
let mongoose = require("mongoose");
mongoose.Promise = require("q").Promise;

module.exports = exports = {}

exports.db = function(){
  return mongoose.connect("mongodb://localhost/pushbudget")
}
