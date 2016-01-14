'use strict';
let plaid = require('plaid'),
  session = require('express-session'),
  passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy,
  bCrypt = require('bcrypt-nodejs'),
  flash = require('connect-flash'),
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
  userCtrl = require("./controllers/user.server.controller.js"),
  secrets = require("./secrets.js"),
  db = mongoo.db()








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
  .use(session({secret: 'something'}))
  .use(passport.initialize())
  .use(passport.session())
  .use(flash())
  .use(function(req, res, next) {
      res.header('Access-Control-Allow-Credentials', true);
      res.header('Access-Control-Allow-Origin', req.headers.origin);
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
      res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
      if ('OPTIONS' == req.method) {
          res.send(200);
      } else {
          next();
      }
  })

  .post('/authenticates', function (req, response) {
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
  });






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
      successRedirect: '/#/createLineup',
      failureRedirect: '/home',
      failureFlash: true
  }));

  app.post('/signup', passport.authenticate('signup',
      {
        successRedirect: '/#/createLineup',
        failureRedirect: '/#/login',
        failureFlash: true
  }));


// setTimeout(()=> console.log(plaidClient), 5000)

app.listen(3001, () => console.log('Listening on 3001'));


db.connection.once('open', () => {
  console.log('Db is connected')
})
