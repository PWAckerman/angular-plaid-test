'use strict';
let mongoose = require('mongoose'),
    deepPopulate = require('mongoose-deep-populate')(mongoose)

let subBudgetSchema = new mongoose.Schema({
  budget: {type: String, ref: 'Budget'},
  name: String,
  user: {type: String, ref: 'User'},
  allocated: Number,
  created: {type: Date, default: Date.now},
  transactions: [{type: String, ref: 'Transaction'}]
})

subBudgetSchema.plugin(deepPopulate)

module.exports = mongoose.model('SubBudget', subBudgetSchema)
