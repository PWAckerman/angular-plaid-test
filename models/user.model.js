'use strict';
let mongoose = require('mongoose'),
  deepPopulate = require('mongoose-deep-populate')(mongoose)

let userSchema = new mongoose.Schema({
  userName: String,
  userPassword: String,
  tokens: [{
    "institution": String,
    "public_token": String,
    "access_token":String
  }],
  institutions: [{type: String}],
  created: {type: Date, default: Date.now},
  budget: {type: String, ref: 'Budget'},
  lastPull: Date
})

userSchema.plugin(deepPopulate)

module.exports = mongoose.model('User', userSchema)
