module.exports = {

    'facebookAuth' : {
        'clientID'      : 'your-secret-clientID-here', // your App ID
        'clientSecret'  : 'your-client-secret-here', // your App Secret
        'callbackURL'   : 'http://localhost:8080/auth/facebook/callback'
    },

    'twitterAuth' : {
        'consumerKey'       : 'your-consumer-key-here',
        'consumerSecret'    : 'your-client-secret-here',
        'callbackURL'       : 'http://localhost:8080/auth/twitter/callback'
    },

    'googleAuth' : {
        'clientID': "556116091832-0k99eq8phqsutl69gbcgsk12pcukb89d.apps.googleusercontent.com",
        'clientSecret': "OtX8g0i1ZPipbCmpv4AcCWda",
        'callbackURL': "http://localhost:3000/oauthCallback/"
    }

};