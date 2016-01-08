angular.module('plaidLink').controller('plaidCtrl', ['plaidLink', '$scope', '$http', function(plaidLink, $scope, $http) {
        plaidLink.create(
        // configurations here will override matching plaidLinkProvider.init configurations
        {
            clientName: 'My App',
            env: 'tartan',
            key: 'test_key',
            product: 'auth'
        },

        // success callback
        function(token) {
            console.log('token: ', token);
            $http({
              method: 'POST',
              url: '/authenticate',
              data: {
                public_token: token
              }
            }).then(function(response){
              $scope.userData = response.data;
            })
            // pass the token to your sever to retrieve an `access_token`
            // see https://github.com/plaid/link#step-3-write-server-side-handler
        },

        // user exit callback
        function() {
          console.log('exit')
        });
        $scope.openPlaidLink = function(){
          plaidLink.open()
        }
    }
]);
