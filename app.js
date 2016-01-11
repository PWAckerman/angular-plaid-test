angular.module('plaidLink', ['angular-plaid-link'])
.config([
    'plaidLinkProvider',

    function(plaidLinkProvider) {
        plaidLinkProvider.init({
            clientName: 'My App',
            env: 'tartan',
            key: 'f15715da6d0369ec33a57f678a1bf9',
            product: 'connect',
            webhook: 'https://11159e49.ngrok.io/webhook'
        });
    }
])
