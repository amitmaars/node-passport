"use strict";

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const fs = require('fs');

var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

// load the auth variables
var configAuth = require('./config/auth');
var db = require('./config/db');

const {google} = require('googleapis');
const OAuth2Client = google.auth.OAuth2;
const oauth2Client = new OAuth2Client(configAuth.googleAuth.clientID, configAuth.googleAuth.clientSecret, configAuth.googleAuth.callbackURL);


const SCOPES = ['profile', 'email','https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = 'credentials.json';

// load up the user model
var User = require('./models/user');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');



// Use the GoogleStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Google
//   profile), and invoke a callback with a user object.
passport.use(new GoogleStrategy({
  clientID        : configAuth.googleAuth.clientID,
  clientSecret    : configAuth.googleAuth.clientSecret,
  callbackURL     : configAuth.googleAuth.callbackURL
  },
  function(accessToken, refreshToken, profile, done) {
    console.log("accessToken-->",accessToken);
    console.log("refreshToken-->",refreshToken);
    console.log("profile-->",profile);

    var tokens = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: true
    }
    // console.log(tokens)
    fs.writeFile(TOKEN_PATH, JSON.stringify(tokens), (err) => {
      if (err) console.error(err);
      console.log('Token stored to', TOKEN_PATH);
    });

    oauth2Client.setCredentials(tokens);




    // return done(null, profile);
    User.findOne({ googleId: profile.id }, function (err, user) {
      if (err)
        return done(err);

      if (user) {
          // if a user is found, log them in
          return done(null, user);
      } else {
          // if the user isnt in our database, create a new user
          var newUser          = new User();

          // set all of the relevant information
          newUser.googleId    = profile.id;
          newUser.accessToken = accessToken;
          newUser.name  = profile.displayName;
          newUser.email = profile.emails[0].value; // pull the first email

          // save the user
          newUser.save(function(err) {
              if (err)
                return done(err);

              return done(null, newUser);
          });
      }
    });
  }
));

app.use(passport.initialize());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});




app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


app.use('/', indexRouter);
// app.use('/users', usersRouter);



// GET /auth/google
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Google authentication will involve
//   redirecting the user to google.com.  After authorization, Google
//   will redirect the user back to this application at /auth/google/callback
//  accessType: 'offline', prompt: 'consent' provide you the refresh token
app.get('/auth/google',
  passport.authenticate('google', { accessType: 'offline', prompt: 'consent',scope: SCOPES }));

// GET /auth/google/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/oauthCallback',
  passport.authenticate('google', { failureRedirect: '/' }),
  function(req, res) {
    // console.log("success==>", OAuth2Client);
    // OAuth2Client.getToken(req.query.code, function (err, tokens) {
    //   // // Now tokens contains an access_token and an optional refresh_token. Save them.
    //   // if (!err) {
    //   //   OAuth2Client.setCredentials(tokens);
    //   // }
    //   console.log("token from code===>",token);
    // });
    listFiles(oauth2Client);
    res.send(req.query);
  });

  /**
   * Lists the names and IDs of up to 10 files.
   * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
   */
  function listFiles(auth) {
  const drive = google.drive({version: 'v3', auth});
  drive.files.list({
    pageSize: 10,
    fields: 'nextPageToken, files(id, name)',
  }, (err, {data}) => {
    if (err) return console.log('The API returned an error: ' + err);
    const files = data.files;
    console.log(data.files);
    if (files.length) {
      console.log('Files:');
      files.map((file) => {
        console.log(`${file.name} (${file.id})`);
      });
    } else {
      console.log('No files found.');
    }
  });
  }



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
