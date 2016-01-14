'use strict';
let plaid = require('plaid'),
  express = require('express'),
  plaid_env = plaid.environments.tartan,
  plaid_config = require('./secrets'),
  bodyParser = require('body-parser'),
  environment = "development",
  mongoo = require("./mongoose.js"),
  plaidClient = {},
  app = express(),
  User = require("./models/user.model.js"),
  Transaction = require("./models/transaction.model.js"),
  userCtrl = require("./controllers/user.controller.js"),
  secrets = require("./secrets.js"),
  db = mongoo.db()



db.connection.once('open', () => {
  console.log('Db is connected')
})

let plaidTestUser = {}
if (environment === 'test') {
  plaidClient = new plaid.Client("test_id", "test_secret", plaid_env);
}
if (environment === 'development') {
  plaidClient = new plaid.Client(secrets.secrets.client_id, secrets.secrets.secret, plaid_env);
}


app
  .use(bodyParser.json())
  .use(express.static(__dirname))
  .post('/authenticate', function (req, response) {
    var public_token = req.body.public_token;
    plaidClient.exchangeToken(public_token, (err, res) => {
      if (err) {
        console.log(err)
      } else {
        plaidTestUser.access_token = res.access_token;
        let user = new User({
          userName: req.body.userName,
          userPassword: req.body.userPassword,
          access_token: plaidTestUser.access_token,
          institutions: plaidTestUser.access_token.split('_')[1]
        })
        user.save().then(
          (err, res) => {
            console.log(err)
            res.json(response)
              // plaidClient.patchConnectUser(plaidTestUser.access_token, {}, {
              //   webhook: 'http://www.pushbudget.com/api/incoming-webhook',
              // }, function(err, mfaResponse, response) {
              //   // The webhook URI should receive a code 4 "webhook acknowledged" webhook
              //   console.log('HOOK ERR', err)
              //   console.log('HOOK mfaResponse', mfaResponse)
              //   console.log('HOOK response', response)
              // });
          }
        )
      }
    })
  })

// break out into user routes/controllers
.get('/users/all', (req, response) => {
    User.find((err, res) => {
      response.json(res)
    })
  })
  .get('/plaidTransactions/:id', (req, response) => {
    console.log("Hit the endpoint...")
    User.findById(req.params.id).exec((err, res) => {
      console.log("about to plaid..", req.params.id);
      if (err) {
        response.json('What are you doing?')
      } else {
        plaidClient.getConnectUser(res.access_token, {
          "pending": true,
          "gte": "2016-01-11T15:56:46-06:00"
        }, (err, res2) => {
          response.json(res2)
        })
      }
    })
  })
  .post('/user/', (req, response) => {

  })
  .patch('/user/webhook/:id', (req, response) => {
    User
      .findById(req.params.id)
      .exec((err, doc) => {
        console.log("about to plaid..", req.params.id);
        if (err) {
          response.json('What are you doing?')
        } else {
          plaidClient.patchConnectUser(doc.access_token, {}, {
            webhook: 'http://9b7aeccc.ngrok.io/webhook',
          }, function (err, mfaResponse, respo) {
            response.json(respo);
          })
        }
      })
  })
  .post('/webhook', (req, response) => {
    console.log('WEBHOOK ACTIVATED')
    console.log(req)
    console.log(Date(Date.now()))
    req.body.access_token;
    req.body.total_transactions;
    response.status(200).json({
      title: 'JSON OBJECT',
      timestamp: Date(Date.now())
    })
  })





// setTimeout(()=> console.log(plaidClient), 5000)

app.listen(3001, () => console.log('Listening on 3001'));