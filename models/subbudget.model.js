'use strict';
let mongoose = require('mongoose'),
    deepPopulate = require('mongoose-deep-populate')(mongoose)

let subBudgetSchema = new mongoose.Schema({
  budget: {type: String, ref: 'Budget'},
  name: String,
  allocated: Number,
  category: {type: String, ref: 'PBCategory'},
  subBudgets: [{type: String, ref: 'SubBudget'}],
  created: {type: Date, default: Date.now}
})

subBudgetSchema.plugin(deepPopulate)

module.exports = mongoose.model('SubBudget', subBudgetSchema)
