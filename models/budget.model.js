'use strict';
let mongoose = require('mongoose'),
    deepPopulate = require('mongoose-deep-populate')(mongoose)

let budgetSchema = new mongoose.Schema({
  user: {type: String, ref: 'User'},
  name: String,
  amount: Number,
  subbudgets: [{type: String, ref: 'SubBudget'}],
  created: {type: Date, default: Date.now}
})

budgetSchema.plugin(deepPopulate)

module.exports = mongoose.model('Budget', budgetSchema)
