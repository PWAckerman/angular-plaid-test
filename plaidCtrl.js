angular.module('plaidLink').controller('plaidCtrl', ['plaidLink', '$scope', '$http', function(plaidLink, $scope, $http) {
        plaidLink.create(
        // configurations here will override matching plaidLinkProvider.init configurations
        {
            clientName: 'My App',
            env: 'tartan',
            key: 'f15715da6d0369ec33a57f678a1bf9',
            product: 'connect',
            webhook: 'https://11159e49.ngrok.io/webhook'
        },

        // success callback
        function(token) {
            console.log('token: ', token);
            $http({
              method: 'POST',
              url: '/authenticate',
              data: {
                userName: $scope.login.userName,
                userPassword: $scope.login.userPassword,
                public_token: token
              }
            }).then(function(response){
              console.log(response.data)
              $scope.userData = response.data;
            })
            // pass the token to your sever to retrieve an `access_token`
            // see https://github.com/plaid/link#step-3-write-server-side-handler
        },

        // user exit callback
        function() {
          console.log('exit')
        });
        $scope.login = {};
        $scope.openPlaidLink = function(){
          plaidLink.open()
        }
    }
]);
