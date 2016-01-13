'use strict';
let mongoose = require('mongoose'),
    deepPopulate = require('mongoose-deep-populate')(mongoose)

let transactionSchema = new mongoose.Schema({
  user: {type: String, ref: 'User'},
  account: {type: String, ref: 'Account'},
  amount: Number,
  plaid_id: String,
  posted: {type: Date},
  created: {type: Date, default: Date.now},
  category: {type: String, ref: 'PlaidCategory'},
  tagged: {type: Boolean, default: false}
})

transactionSchema.plugin(deepPopulate)

module.exports = mongoose.model('Transaction', transactionSchema)
