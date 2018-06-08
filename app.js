"use strict";

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const fs = require('fs');
const htmlparser = require("htmlparser");

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
var arr = [];
let values = [];


var Twit = require('twit');
var config = require('./config/twitter_app_config');
var T = new Twit(config);
var tweet;

// load up the user model
var User = require('./models/user');
var Book = require('./models/book');
var Tweet = require('./models/tweet');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

var session = require('express-session');
var FileStore = require('session-file-store')(session);
app.use(session({
  name: 'server-session-cookie-id',
  secret: 'my express secret',
  saveUninitialized: true,
  resave: true,
  store: new FileStore()
}));


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

    console.log("============= We are in GoogleStrategy===========================");
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
                {return done(err);}

              return done(null, newUser);
          });
      }
    });
  }
));

app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser(function(user, done) {
  console.log("============= We are in serializeUser===========================");
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  console.log("============= We are in deserializeUser===========================");
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
app.get('/auth/google',function(req,res,next){
  passport.authenticate('google', { accessType: 'offline', prompt: 'consent',scope: SCOPES }, function(err, user, info) {
    if (err) {console.log(err);}


    console.log("============= We are in done===========================");

    console.log("user data", user);
  })(req,res,next);
});



// GET /auth/google/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/oauthCallback',
  passport.authenticate('google', { failureRhtmlparseredirect: '/' }),
  function(req, res) {
    // console.log("success==>", OAuth2Client);
    // OAuth2Client.getToken(req.query.code, function (err, tokens) {
    //   // // Now tokens contains an access_token and an optional refresh_token. Save them.
    //   // if (!err) {
    //   //   OAuth2Client.setCredentials(tokens);
    //   // }
    //   console.log("token from code===>",token);
    // });
    listFiles(oauth2Client,async function(drive,files){
          // files.map((file) =>
          for(let ii = 0; ii<files.length; ii++)
          {
            let file = files[ii];
            console.log(`${file.name} (${file.id})`);

            let book = await Book.find({user_id:req.session.passport.user, google_book_id:file.id,name:file.name.split('Notes from "').pop().split('"').shift()})

            let bookId;
            if(book.length){
              bookId = book[0]._id;
            }
            else{
              let newBook = new Book({
                user_id:req.session.passport.user,
                google_book_id:file.id,
                name:file.name.split('Notes from "').pop().split('"').shift()
              })

              let newBookSaved = await newBook.save();
              bookId = newBookSaved._id;
            }

          await drive.files.export({
            fileId: file.id,
            mimeType: 'text/html'
          }, (err, data) => {
            if (err) return console.log('The reading doc API returned an error: ' + err);
            const rawHTML = data.data;
            var handler = new htmlparser.DefaultHandler(function (error, dom) {
              if (error) {
                console.log('Parse error: ', error);
              }
            });
            const parser = new htmlparser.Parser(handler);
            parser.parseComplete(rawHTML);
            const parsedHTML = handler.dom;

            checkandmapchildren(bookId,parsedHTML,function(){
              console.log("===================DONE======================");
            });

          });
        }
    });
    console.log("code is ===>",req.query);
    console.log("session is ===>",req.session);
    oauth2Client.getToken(req.query.code, (err, token) => {
      console.log("get Token from code come for first time ==>",token);
    });

    User.findById(req.session.passport.user, function(err, user) {
      if(err) console.log(err);

      res.render('dashboard', { user: user, code: req.query.code });
    });
  });

  /**
   * Lists the names and IDs of up to 10 files.
   * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
   */
  function listFiles(auth,cb) {
  const drive = google.drive({version: 'v3', auth});
  drive.files.list({
    q: "name='Play Books Notes' and mimeType='application/vnd.google-apps.folder'",
    pageSize: 1,
    fields: 'nextPageToken, files(id, name)',
  }, (err, {data}) => {
    if (err) return console.log('The API returned an error: ' + err);
    const files = data.files;
    if (files.length) {
      // console.log('Files:');
      files.map((file) => {
        // console.log(`${file.name} (${file.id})`);
        drive.files.list({
          q:"parents in '"+file.id+"'",
          pageSize: 10,
          fields: 'nextPageToken, files(id, name)',
        }, (err, {data}) => {
          if (err) return console.log('The API returned an error: ' + err);
          const files = data.files;
          if (files.length) {

            cb(drive,files)

          } else {
            console.log('No files found.');
            cb([]);
          }
        });
      });
    } else {
      console.log('No files found.');
      cb([]);
    }
  });
  }


function checkandmapchildren(bookId, object,cb) {
  if (object.length != undefined){
    // console.log("hari");
    for(let i = 0; i < object.length; i++) {
      let miniobj = object[i];
      if(miniobj.children != null){
       checkandmapchildren(bookId, miniobj.children,function(once,value){
         if(once == true){
          if(miniobj.name != null){
            if (miniobj.name == "span"){
              if (miniobj.attribs != null){
                if(miniobj.attribs.style != null){
                  if (miniobj.attribs.style.indexOf("#93e3ed") != -1){
                  if(value != ''){
                   // console.log(value);
                    console.log("______________");
                     arr.push(value);
                    console.log(bookId, value);

                    let newTweet = new Tweet({
                      bookmark: value,
                      book_id: bookId
                    });

                    newTweet.save()
                    .then(function(tweetSaved){
                      console.log("Bookmark Saved into database", tweetSaved);
                    })
                    .catch((err) => {
                      console.log("Error in Bookmark Saved into database", err);
                    })


                  }
                    values.push(value);
                  }
                }
              }
            }
          }
         }
       });
      }
      if(miniobj.type != null){
        if(miniobj.type == "text"){
          cb(true,miniobj.data);
        }else{
         cb(false,null)
        }
      }else{
        cb(false,null)
      }
    }


  //     for(var n=0;n< arr.length;n++){
  //   console.log(arr[n]);
  // }
  }else{
   cb(false,null)
  }

}



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  //htmlparser set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
