'use strict';
let mongoose = require('mongoose'),
  deepPopulate = require('mongoose-deep-populate')(mongoose)

let userSchema = new mongoose.Schema({
  userName: String,
  userPassword: String,
  accounts: [{type: String, ref: 'Account'}],
  institutions: [{type: String, ref: 'Institution'}],
  created: {type: Date, default: Date.now},
  budget: {type: String, ref: 'Budget'},
  savings: Number
})

userSchema.plugin(deepPopulate)

module.exports = mongoose.model('User', userSchema)
