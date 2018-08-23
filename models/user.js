'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullname: {type: String}, 
  username: {type: String, required: true, unique: true},
  password: {type: String}
});

userSchema.set('toObject', {
  virtuals: true,     // include built-in virtual `id`
  versionKey: false,  // remove `__v` version key
  transform: (doc, ret) => {
    delete ret._id; // delete `_id`
    delete ret.password;
  }
});

userSchema.methods.validatePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

userSchema.statics.hashPassword = function (password) {
  return bcrypt.hash(password, 10);
};

const User = mongoose.model('User', userSchema);

module.exports = User;