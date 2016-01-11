'use strict';
let User = require("./user.model.js")

module.exports = exports = {};

exports.findUser = (req, res)=>{
    User.find({})
}

exports.findUser = (req, res)=>{
    User.findById(req.params.id).exec().then(
      (req, res) => {
        res.json()
      }
    )
}

exports.addUser = (req, res)=>{
  var user = new User({
    userName: req.body.userName,
    userPassword: req.body.userPassword,
    access_token: req.body.access_token
  })
  User.save(user)
}
