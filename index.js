'use strict';
//libraries and plugins
let plaid = require('plaid'),
  express = require('express'),
  bodyParser = require('body-parser'),
  cors = require('cors'),
  environment = "development",
  mongoo = require("./mongoose.js"),
  plaidClient = {},

  //models controllers etc.
  Subbudget = require('./models/subbudget.model'),
  User = require("./models/user.model.js"),
  Budget = require("./models/budget.model.js"),
  SubBudget = require("./models/subbudget.model.js"),
  Account = require("./models/account.model.js"),
  Webhook = require("./models/webhook.model.js"),
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
  .use(cors())
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
  .get('/user/:id/populate', (req, response)=>{
    return userCtrl.populateUser(req, response);
  })
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
        plaidClient.getConnectUser(res.access_token[0], {
          "pending": true
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
    var webhook = new Webhook({
      total_transactions: req.body.total_transactions || 0,
      code: req.body.code,
      message: req.body.message,
      resolve: req.body.resolve || 'Not an error',
      access_token: req.body.access_token || '0',
    })
    webhook.save()
    switch(req.body.code){
      case 0:
        console.log('INITIAL TRANSACTION PULL')
        User.find({access_token: req.body.access_token}).exec((err, res) => {
          console.log(res)
          console.log("about to plaid..", req.body.access_token);
          if (err) {
            response.json('What are you doing?')
          } else {
            plaidClient.getConnectUser(req.body.access_token, {
              "pending": true
            }, (err, res2) => {

              res2.accounts.map((account)=>{

                let newAccount = new Account({
                  user: res[0]._id.toString(),
                  institution_type: account.institution_type,
                  institution: 'PLACEHOLDER',
                  name: account.meta.name,
                  type: account.type,
                  subtype: account.subtype || '',
                })
                console.log(account)
                // newAccount.save()
              })
              res2.transactions.map((transaction)=>{
                let cat = ''
                if(transaction.category){
                  cat = transaction.category
                }
                let newTrans = new Transaction({
                  user: res[0]._id.toString(),
                  name: transaction.name,
                  account: transaction._account,
                  amount: transaction.amount,
                  plaid_id: transaction._id,
                  posted: transaction.date,
                  category: cat
                })
                console.log(newTrans)
                // newTrans.save()
              })
              User.findByIdAndUpdate(res[0]._id, {lastPull: Date.now()}, {new: true}).exec().then(
                (doc) => {
                  console.log(doc)
                  response.json({
                    message: "Initial Transaction Pull Completed"
                  })
                }
              ).catch(
                (err) => console.log(err)
              )
            })
          }
        })
        break;
      case 1:
        console.log('HISTORICAL TRANSACTION PULL')
        break
      case 2:
        console.log('NORMAL TRANSACTION PULL')
        User.find({access_token: req.body.access_token}).exec((err, res) => {
          plaidClient.getConnectUser(req.body.access_token, {
            "pending": true, "gte": res[0].lastPull
          }, (err, res2) => {
            console.log(res[0].lastPull)
            if(res2.transactions.length > 0){
              res2.transactions.map((transaction)=>{

                let cat = ''
                if(transaction.category){
                  cat = transaction.category
                }
                let newTrans = new Transaction({
                  user: res[0]._id.toString(),
                  name: transaction.name,
                  account: transaction._account,
                  amount: transaction.amount,
                  plaid_id: transaction._id,
                  posted: transaction.date,
                  category: cat
                })
                console.log(newTrans)
                // newTrans.save()

              })
              User.findByIdAndUpdate(res[0]._id, {lastPull: Date.now()}, {new: true}).exec().then(
                (doc) => {
                  console.log(doc)
                  response.json({
                    message: `${res2.transactions.length} new transactions...`
                  })
              })
            } else {
              User.findByIdAndUpdate(res[0]._id, {lastPull: Date.now()}, {new: true}).exec().then(
                (doc) => {
                  console.log(doc)
                  response.json({
                    message: "No new transactions..."
                  })
              })
            }
          })
        })
        break
      case 3:
        console.log('REMOVED TRANSACTION')
        User.find({access_token: req.body.access_token}).exec((err, res) => {
          req.body.removed_transactions.map((transaction_id)=>{
            Transaction.remove({plaid_id: transaction_id}).exec().then(function(transaction){
              console.log(transaction);
            })
          })
        reponse.json({"message":"We deleted what you told us to."})
        })
        break
      case 4:
        console.log('WEBHOOK UPDATED')
        break
      default:
        console.log('SOME SORT OF ERROR', req.body.code, req.body.message)
        break
    }
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
  console.log(req.body);
  Transaction.findByIdAndUpdate(req.params.id, req.body, {
    new: true
  }).exec().then(function (transaction) {
    res.status(201).send(transaction);
  }).catch(function (err) {
    res.status(500).send(err);
  });
});

// delete a specific transaction and then return an empty object on success
app.delete('/api/transactions/:id', function (req, res) {
  Transaction.remove({
    _id: req.params.id
  }).exec().then(function (transaction) {
    res.status(204).send(transaction);
  }).catch(function (err) {
    res.status(500).send(err);
  });
});

// todo: find untagged untransactions by userID

// get untagged transactions specific to user
app.get('/api/transactions/untagged/:userId', function (req, res) {
  Transaction.find({user: req.params.userId, tagged: false}).exec().then(function(transactions) {
    res.status(200).send(transactions);
  }).catch(function(err) {
    res.status(500).send(err);
  });
})

// subbudget "bucket" endpoints

// get a specific subbudget based off of id, these are tied to a user
app.get('/api/subbudget/:id', function (req, res) {
  Subbudget.find({
    _id: req.params.id
  }).exec().then(function (subbudget) {
    if (subbudget.length === 0) {
      res.status(204).send(subbudget);
    }
    res.status(200).send(subbudget);
  }).catch(function (err) {
    res.status(500).send(err);
  });
});

// edit a specific subbuget and return that newly edited subbuget
app.patch('/api/subbudget/:id', function (req, res) {
  Subbudget.findByIdAndUpdate(req.params.id, req.body, {
    new: true
  }).exec().then(function (subbudget) {
    res.status(201).send(subbudget);
  }).catch(function (err) {
    res.status(500).send(err);
  });
});

// create a new subbudget specific to the user and users budget
app.post('/api/subbudget', function (req, res) {
  var subbudget = new Subbudget(req.body);
  subbudget.save().then(function (subbudget) {
    res.status(201).send(subbudget);
  }).catch(function (err) {
    res.status(500).send(err);
  });
});

// delete a subbudget specific to the user and users budget
app.delete('/api/subbudget/:id', function(req, res) {
  Subbudget.remove({
    _id: req.params.id
  }).exec().then(function (transaction) {
    res.status(204).send(transaction);
  }).catch(function (err) {
    res.status(500).send(err);
  });
});


app.listen(3001, () => console.log('Listening on 3001'));
