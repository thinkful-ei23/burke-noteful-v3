'use strict';

const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
  fullName: {type: String}, 
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

const User = mongoose.model('User', userSchema);

module.exports = User;