'use strict';
let plaid = require('plaid'),
   express = require('express'),
   plaid_env = plaid.environments.tartan,
   plaid_config = require('./secrets'),
   bodyParser = require('body-parser'),
   app = express();


let bank= {
  type: 'amex'
}
let plaidTestApi = {
  id: 'test_id',
  secret: 'test_secret',
  access_token: 'test_' + bank.type
}
let plaidTestUser = {
  username: "plaid_test",
  password: "plaid_good",
  pin: 1234
}
let plaidClient = new plaid.Client("test_id", "test_secret", plaid_env);

// plaid.getCategories(plaid_env, (err, response) => {
//   console.log(response)
// })
plaid.getCategory("18073001", plaid_env, (err, response) => {
  // console.log(response)
})

plaidClient.getConnectUser(plaidTestApi.access_token, {}, (err, response)=>{
  // console.log(response.accounts);
  // console.log(response.transactions);
  // delete response.accounts;
  // delete response.transactions;
  // console.log(response)
})
plaidClient.addAuthUser('bofa', {
  username: 'plaid_test',
  password: 'plaid_good',
}, function(err, mfaResponse, response) {
  if (err != null) {
    // Bad request - invalid credentials, account locked, etc.
    console.error(err);
  } else if (mfaResponse != null) {
    console.log('MFARESPONSE', mfaResponse)
    console.log('RESPONSE', response)
    plaidClient.stepAuthUser(mfaResponse.access_token, 'too', {},
    function(err, mfaRes, response) {
      if(err){
        console.log(err);
      }else{
        console.log('MFARES', mfaRes);
        console.log('NEXT RESPONSE', response);
        console.log('ACCOUNTS', response.accounts);
      }
    });
  } else {
    // No MFA required - response body has accounts
    console.log(response.accounts);
  }
});

app
  .use(bodyParser.json())
  .use(express.static(__dirname))
  .post('/authenticate', function(req, response) {
    var public_token = req.body.public_token;
    plaidClient.exchangeToken(public_token, (err, res)=> {
      if (err != null) {
        console.log(err)
      } else {
        var access_token = res.access_token;
        plaidClient.getAuthUser(access_token, (err, res)=> {
          if (err != null) {
            console.log(err)
          } else {
            var accounts = res.accounts;
            response.json(res)
          }
        });
      }
    });
  });




setTimeout(()=> console.log(plaidClient), 5000)

app.listen(3001, ()=> console.log('Listening on 3001'));
