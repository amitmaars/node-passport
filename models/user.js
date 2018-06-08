// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// var bcrypt = require('bcrypt');
// const saltRounds = 10;

// create a schema
var userSchema = new Schema({
  name: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  mobile: { type: Number },
  googleId: { type: String },
  accessToken: { type: String },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date
  }
});

// userSchema.pre('save', function (next) {
//   var user = this;
//   bcrypt.hash(user.password, saltRounds, function (err, hash){
//     if (err) {
//       return next(err);
//     }
//     user.password = hash;
//     next();
//   })
// });

// userSchema.methods.validPassword = function(password,cb) {
//     bcrypt.compare(password, this.password, function(err, isMatch) {
//         if (err) return cb(err);
//         cb(null, isMatch);
//     });

// };


// the schema is useless so far
// we need to create a model using it
var User = mongoose.model('User', userSchema);

// make this available to our users in our Node applications
module.exports = User;
