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
   userCtrl = require("./controllers/user.controller.js"),
   secrets = require("./secrets.js"),
   db = mongoo.db()

db.connection.once('open', ()=>{
  console.log('Db is connected')
})

//
// let bank= {
//   type: 'amex'
// }
// let plaidTestApi = {
//   id: 'test_id',
//   secret: 'test_secret',
//   access_token: 'test_' + bank.type
// }
let plaidTestUser = {}
if(environment === 'test'){
   plaidClient = new plaid.Client("test_id", "test_secret", plaid_env);
}
if(environment === 'development'){
  plaidClient = new plaid.Client(secrets.secrets.client_id, secrets.secrets.secret, plaid_env);
}


// plaid.getCategories(plaid_env, (err, response) => {
//   console.log(response)
// }

// plaidClient.getConnectUser(plaidTestApi.access_token, {}, (err, response)=>{
//   // console.log(response.accounts);
//   // console.log(response.transactions);
//   // delete response.accounts;
//   // delete response.transactions;
//   // console.log(response)
// })
// plaidClient.addAuthUser('bofa', {
//   username: 'plaid_test',
//   password: 'plaid_good',
// }, function(err, mfaResponse, response) {
//   if (err != null) {
//     // Bad request - invalid credentials, account locked, etc.
//     console.error(err);
//   } else if (mfaResponse != null) {
//     console.log('MFARESPONSE', mfaResponse)
//     console.log('RESPONSE', response)
//     plaidClient.stepAuthUser(mfaResponse.access_token, 'too', {},
//     function(err, mfaRes, response) {
//       if(err){
//         console.log(err);
//       }else{
//         console.log('MFARES', mfaRes);
//         console.log('NEXT RESPONSE', response);
//         console.log('ACCOUNTS', response.accounts);
//       }
//     });
//   } else {
//     // No MFA required - response body has accounts
//     console.log(response.accounts);
//   }
// });

app
  .use(bodyParser.json())
  .use(express.static(__dirname))
  .post('/authenticate', function(req, response) {
    var public_token = req.body.public_token;
    plaidClient.exchangeToken(public_token, (err, res)=> {
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
    }}
  )})
   .get('/plaidTransactions/:id', (req, response)=>{
     console.log("Hit the endpoint...")
     User.findById(req.params.id).exec((err, res)=>{
       console.log("about to plaid..", req.params.id);
       if(err){
         response.json('What are you doing?')
       } else {
         plaidClient.getConnectUser(res.access_token, {"pending":true}, (err, res2)=>{
           console.log(res2);
           response.json(res2);
         })
       }
     })
   })
   .post('/user/', (req, response)=>{

   })
   .post('/webhook', (req, response)=>{
     console.log('WEBHOOK ACTIVATED')
     console.log(Date(Date.now()))
     console.log('This is jared or georges data', req)
     response.status(200).json({ title: 'JSON OBJECT', timestamp: Date(Date.now())})
   })
  //       plaidClient.getAuthUser(access_token, (err, res)=> {
  //         if (err != null) {
  //           console.log(err)
  //         } else {
  //           var accounts = res;
  //           plaidClient.getConnectUser(access_token, (err, res)=> {
  //             if(err){
  //               response.json(accounts.accounts)
  //             } else {
  //               accounts.transactions = res.transactions;
  //               plaidClient.getInfoUser(access_token, (err, res)=>{
  //                 if(err){
  //                   response.json(accounts)
  //                 }else{
  //                   accounts.userInfo = res
  //                   plaidClient.getBalance(access_token, (err, res)=>{
  //                     if(err){
  //                       response.json(accounts)
  //                     }else{
  //                       accounts.balance = res;
  //                       response.json(accounts)
  //                     }
  //                   })
  //
  //                 }
  //               });
  //
  //             }
  //
  //
  //           });
  //
  //
  //         }
  //       });
  //     }
  //   });
  // });




// setTimeout(()=> console.log(plaidClient), 5000)

app.listen(3001, ()=> console.log('Listening on 3001'));
