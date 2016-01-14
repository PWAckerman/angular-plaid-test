'use strict';
let plaid = require('plaid'),
  express = require('express'),
  bodyParser = require('body-parser'),
  environment = "development",
  mongoo = require("./mongoose.js"),
  plaidClient = {},

  //models controllers etc.
  Subbudget = require('./models/subbudget.model'),
  User = require("./models/user.model.js"),
  Budget = require("./models/budget.model.js"),
  SubBudget = require("./models/subbudget.model.js"),
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
    switch(req.body.code){
      case "0":
        console.log('INITIAL TRANSACTION PULL')
        break;
      case "1":
        console.log('HISTORICAL TRANSACTION PULL')
        break
      case "2":
        console.log('NORMAL TRANSACTION PULL')
        break
      case "3":
        console.log('REMOVED TRANSACTION')
        break
      case "4":
        console.log('WEBHOOK UPDATED')
        break
      default:
        console.log('SOME SORT OF ERROR', req.body.code, req.body.message)
        break
    }
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
