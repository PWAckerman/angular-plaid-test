'use strict';
let plaid = require('plaid'),
  express = require('express'),
  bodyParser = require('body-parser'),
  environment = "development",
  mongoo = require("./mongoose.js"),
  plaidClient = {},

  //models controllers etc.
  User = require("./models/user.model.js"),
  Transaction = require("./models/transaction.model.js"),
  userCtrl = require("./controllers/user.server.controller.js"),
  secrets = require("./secrets.js"),

  // configs and application
  plaid_env = plaid.environments.tartan,
  app = express(),
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


// endpoint for adding banks via plaid
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
            res.json(response);
          }
        )
      }
    })
  })

// break out into user routes/controllers
// grab all users from database 
.get('/users/all', (req, response) => {
  User.find((err, res) => {
    response.json(res)
  })
})

// 
// 
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


// transaction endpoints

// get all transactions for particular user
app.get('/api/transactions/user/:id', function (req, res) {
  Transaction.find({
    user: req.params.id
  }).exec().then(function (transactions) {
    res.status(200).send(transactions);
  }).catch(function (err) {
    res.status(500).send(err);
  });
});

// get a specific transaction based off of transaction id
app.get('/api/transactions/:id', function (req, res) {
  Transaction.find({
    _id: req.params.id
  }).exec().then(function (transaction) {
    res.status(200).send(transaction);
  }).catch(function (err) {
    res.status(500).send(err);
  });
});

// edit a specific transaction and then return that updated transaction via new: true
app.patch('/api/transactions/:id', function (req, res) {
  Transaction.findOneAndUpdate({
    _id: req.params.id
  }, req.body, {
    new: true
  }).exec().then(function (transaction) {
    res.status(201).send(transaction);
  }).catch(function (err) {
    res.status(500).send(err);
  });
});




// setTimeout(()=> console.log(plaidClient), 5000)

app.listen(3001, () => console.log('Listening on 3001'));