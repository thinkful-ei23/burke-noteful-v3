'use strict';

const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
  name: {type: String, required: true},
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

tagSchema.set('timestamps', true);

tagSchema.index({userId: 1, name: 1}, {unique: true});

tagSchema.set('toObject', {
  virtuals: true,     // include built-in virtual `id`
  versionKey: false,  // remove `__v` version key
  transform: (doc, ret) => {
    delete ret._id; // delete `_id`
  }
});

module.exports = mongoose.model('Tag', tagSchema);