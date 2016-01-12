'use strict';
let mongoose = require('mongoose')

let userSchema = new mongoose.Schema({
  userName: String,
  userPassword: String,
  access_token: String,
  institutions: [{type: String}],
  created: {type: Date, default: Date.now}
})

module.exports = mongoose.model('User', userSchema)
