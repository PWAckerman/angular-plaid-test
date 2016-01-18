'use strict';
//libraries and plugins
let plaid = require('plaid'),
  gcm = require('node-gcm'),
  express = require('express'),
  bodyParser = require('body-parser'),
  cors = require('cors'),
  environment = "development",
  session = require('express-session'),
  passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy,
  bCrypt = require('bcrypt-nodejs'),
  flash = require('connect-flash'),
  mongoo = require("./mongoose.js"),
  plaidClient = {},

  //models controllers etc.
  Subbudget = require('./models/subbudget.model'),
  User = require("./models/user.model.js"),
  Budget = require("./models/budget.model.js"),
  SubBudget = require("./models/subbudget.model.js"),
  Account = require("./models/account.model.js"),
  Webhook = require("./models/webhook.model.js"),
  RegToken = require("./models/registrationtoken.model.js"),
  Transaction = require("./models/transaction.model.js"),
  Tokens = require("./models/tokens.model.js"),
  Blob = require("./models/blob.model.js"),
  SplitTransaction = require("./models/splittransaction.model.js"),
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
//GCM Push Notification Test
let pushyMessage = new gcm.Message();
pushyMessage.addNotification({
  title: 'PushBudget',
  body: 'You just got served.',
  icon: 'ic_launcher'
})

let sender = new gcm.Sender(secrets.secrets.gcm_key)
// endpoint for adding banks via plaid
app
  .use(cors())
  .use(bodyParser.json())
  .use(express.static(__dirname))
  .post('/app/regtoken', (req, response) => {
    let token = new RegToken({
      token: req.body.token,
      user: req.body.user
    })
    token.save().then(function(doc){
      response.json(doc)
    })
  })
  //GCM Push Notification Test endpoint
  .post('/gcm', (req, response) => {
    sender.sendNoRetry(pushyMessage, {registrationTokens: ['cPccdlz7JbU:APA91bE53PH5CIugwV8OddfosOYxvjSqXQ8rqi9v2JcYk3hxCo3BzPuO7K9sNVCrJ9omWYvSkkVKT_Nrg8sK9okkBEVKE8qihiqUwSs8syoA9-YuNhAZVKMYH9rtlcP9Zg58ypNCDq7X']}, (err, res)=>{
      (err) ? console.error(err) : response.json(pushyMessage)
    })
  })
  //GCM Push Registration Webhook
  .post('/gcmhook', (req, response) =>{
    console.log('hook was hit!')
    console.log(req.body)
    if(req.body._push){
      if(req.body._push.android_tokens && req.body.unregister === false){
        let blob = new Blob({
          blob: req.body
        })
        blob.save()
        response.status(200).json({message: 'android'})
      } else if(req.body._push.ios_tokens && req.body.unregister === false){
        let blob = new Blob({
          blob: req.body
        })
        blob.save()
        console.log(req.body)
        response.status(200).json({message: 'ios'})
      } else if(req.body._push.android_tokens && req.body.unregister === true){
        let blob = new Blob({
          blob: req.body
        })
        blob.save()
        console.log(req.body)
        response.status(200).json({message: 'deregister android'})
      } else if(req.body._push.ios_tokens && req.body.unregister === true){
        let blob = new Blob({
          blob: req.body
        })
        blob.save()
        console.log(req.body)
        response.status(200).json({message: 'deregister ios'})
      }
    } else if(req.body.token_invalid) {
      let blob = new Blob({
        blob: req.body
      })
      blob.save()
      console.log(req.body)
      response.status(200).json({message: 'token invalid'})
    } else {
      let blob = new Blob({
        blob: req.body
      })
      blob.save()
      console.log("What are you trying to pull, google?")
      response.status(204)
    }
  })
  //Plaid-facing authentication endpoint
  .post('/authenticate/:userid', (req, response) => {
    let public_token = req.body.public_token;
    let tokens = new Tokens({
      user: req.params.userid,
      public_token: public_token,
      institution_type: ''
    })
    plaidClient.exchangeToken(public_token, (err, res) => {
      if (err) {
        console.log(err)
      } else {
        console.log('RES', res)
        tokens.access_token = res.access_token;
        tokens.save()
      }
    })
  })

// break out into user routes/controllers
.get('/users/all', (req, response) => {
    User.find((err, res) => {
      response.json(res)
    })
  })
  .get('/user/:id/populate', (req, response) => {
    return userCtrl.populateUser(req, response);
  })
  // grab all users from database
  .get('/users/all', (req, response) => {
    User.find((err, res) => {
      response.json(res)
    })
  })
.patch('/user/:id', (req, response)=>{
  User.findByIdAndUpdate(req.params.id, req.body, {new: true}).exec((err, doc)=>{
    response.json(doc)
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
        let idToSearch = ''
        Tokens.find({access_token: req.body.access_token}).exec((err, res)=>{
          idToSearch = res[0].user
          plaidClient.getConnectUser(req.body.access_token, {
            "pending": true
          }, (err, res2) => {
            Tokens.findByIdAndUpdate(res[0]._id, {institution_type: res2.accounts[0].institution_type, lastPull: Date.now()}, {new: true}).exec((err,res)=>{
              console.log(res)
            })
            res2.accounts.map((account)=>{
              let newAccount = new Account({
                user: res[0].user,
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
          })
        })
        break;
      case 1:
        console.log('HISTORICAL TRANSACTION PULL')
        break
      case 2:
        console.log('NORMAL TRANSACTION PULL')
        Tokens.find({access_token: req.body.access_token}).exec((err, res) => {
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
                  user: res[0]._id,
                  name: transaction.name,
                  account: transaction._account,
                  amount: transaction.amount,
                  plaid_id: transaction._id,
                  posted: transaction.date,
                  category: cat
                })
                console.log(newTrans)
              })
              Tokens.findByIdAndUpdate(res[0]._id, {lastPull: Date.now()}, {new: true}).exec().then(
                (doc) => {
                  console.log(doc)
                  response.json({
                    message: `${res2.transactions.length} new transactions...`
                  })
              })
            } else {
              Tokens.findByIdAndUpdate(res[0]._id, {lastPull: Date.now()}, {new: true}).exec().then(
                (doc) => {
                  console.log(doc)
                  response.json({
                    message: `No new transactions, Plaid. What are you thinking...`
                  })
              }).catch(
              (err) => console.log(err)
              )}
            })
          }
        )
        break
      case 3:
        console.log('REMOVED TRANSACTION')
          req.body.removed_transactions.map((transaction_id)=>{
            Transaction.remove({plaid_id: transaction_id}).exec().then(function(transaction){
              console.log(transaction);
            })
        reponse.json({
          "message": "We deleted what you told us to."
        })
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
app.get('/api/transactions/user/:userId', function (req, res) {
  Transaction.find({
    user: req.params.userId
  }).exec().then(function (transactions) {
    res.status(200).send(transactions);
  }).catch(function (err) {
    res.status(500).send(err);
  });
});

// get a specific transaction based off of transaction id
app.get('/api/transactions/:transId', function (req, res) {
  Transaction.find({
    _id: req.params.transId
  }).exec().then(function (transaction) {
    res.status(200).send(transaction);
  }).catch(function (err) {
    res.status(500).send(err);
  });
});

// edit a specific transaction and then return that updated transaction via new: true
app.patch('/api/transactions/:transid', function (req, res) {
  console.log(req.body);
  Transaction.findByIdAndUpdate(req.params.transId, req.body, {
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
  Transaction.find({
    user: req.params.userId,
    tagged: false
  }).exec().then(function (transactions) {
    res.status(200).send(transactions);
  }).catch(function (err) {
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
app.delete('/api/subbudget/:id', function (req, res) {
  Subbudget.remove({
    _id: req.params.id
  }).exec().then(function (transaction) {
    res.status(204).send(transaction);
  }).catch(function (err) {
    res.status(500).send(err);
  });
});

// will update subbudget transaction array with id if
// there are no splits, if not...
// split transactions are distributed to
// corresponding buckets
app.post('/api/split/:bucketId', function (req, res) {
  if (req.body.splits.length === 0) {
    Subbudget.findByIdAndUpdate(req.params.bucketId, {
      $addToSet: {
        transactions: req.body.transId
      }
    }, {
      new: true
    }).exec().then(function (bucket) {
      Transaction.findByIdAndUpdate(req.body.transId, {
        tagged: true
      }).exec().then(function (transaction) {
        res.status(201).send(transaction);
      }).catch(function (err) {});
    }).catch(function (err) {
      res.status(500).send(err);
    });
  } else {
    req.body.splits.forEach(function (split, index) {
      let newSplit = new SplitTransaction({
        amount: split.amount,
        transaction: req.body.transId
      });
      newSplit.save().then(function (newSplit) {
        Subbudget.findByIdAndUpdate(split.bucketId, {
          $addToSet: {
            splits: newSplit._id
          }
        }).exec().then(function (bucket) {
          res.status(200).send(bucket);
        }).catch(function (err) {
          res.status(500).send(err);
        });

      }).catch(function (err) {
        res.status(500).send(err);
      });
    });
  }
});

//user register&login

var isValidPassword = function(user, password){
  return bCrypt.compareSync(password, user.userPassword);
}
var createHash = function(password){
 return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
}

passport.serializeUser(function(user, done){
  done(null, user);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
        done(err, user);
    });
});

passport.use('signup', new LocalStrategy({passReqToCallback : true},
  function(req, username, password, done) {
    console.log(req.body);
    // findOrCreateUser = function(){
      // find a user in Mongo with provided username
      User.findOne({'userName':username},function(err, user) {
        // In case of any error return
        if (err){
          console.log('Error in SignUp: '+err);
          return done(err);
        }
        // already exists
        if (user) {
          console.log('User already exists');
          return done(null, false)
            req.flash('message','User Already Exists');
        } else {
          // if there is no user with that email
          // create the user
          var newUser = new User();
          // set the user's local credentials
          newUser.userName = username;
          newUser.userPassword = createHash(password);

          // save the user
          newUser.save(function(err) {
            if (err){
              console.log('Error in Saving user: '+err);
              throw err;
            }
            console.log('User Registration succesful');
            return done(null, newUser);
          });
        }
      });
    // };
    // process.nextTick(findOrCreateUser);
  }
));

passport.use('login', new LocalStrategy({passReqToCallback : true},
  function(req, username, password, done) {
    console.log('username', req.body);
    // check in mongo if a user with username exists or not
    User.findOne({ 'userName' :  username },
      function(err, user) {
        // In case of any error, return using the done method
        if (err){
          console.log(err);
          return done(err);
        }
        // Username does not exist, log error & redirect back
        if (!user){
          console.log('User Not Found with username '+username);
          return done(null, false,
                req.flash('message', 'User Not found.'));
        }
        // User exists but wrong password, log the error
        if (!isValidPassword(user, password)){
          console.log('Invalid Password');
          return done(null, false,
              req.flash('message', 'Invalid Password'));
        }
        console.log('login successful');
        // User and password both match, return user from
        // done method which will be treated like success
        return done(null, user);
      }
    );
}));

app.get('/', function(req, res) {
    // Display the Login page with any flash message, if any
    // res.render('index', { message: req.flash('message') });
});


app.post('/login', passport.authenticate('login',
  {
    successRedirect: '/#/',
    failureRedirect: '/home',
    failureFlash: true
}));

app.post('/signup', passport.authenticate('signup',
    {
      successRedirect: '/#/createLineup',
      failureRedirect: '/#/login',
      failureFlash: true
}));


app.listen(3001, () => console.log('Listening on 3001'));
