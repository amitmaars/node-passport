// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// var bcrypt = require('bcrypt');
// const saltRounds = 10;

// create a schema
var tweetSchema = new Schema({
  bookmark: { type: String },
  flag: { type: Boolean, default:false },
  book_id:{ type: Schema.Types.ObjectId, ref: 'Book' },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date
  }
});

var Tweet = mongoose.model('Tweet', tweetSchema);

// make this available to our users in our Node applications
module.exports = Tweet;
