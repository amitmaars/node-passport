// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// var bcrypt = require('bcrypt');
// const saltRounds = 10;

// create a schema
var bookSchema = new Schema({
  name: { type: String },
  google_book_id: { type: String },
  isbn_no: { type: String },
  author: { type: String },
  user_id:{ type: Schema.Types.ObjectId, ref: 'User' },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date
  }
});

var Book = mongoose.model('Book', bookSchema);

// make this available to our users in our Node applications
module.exports = Book;
