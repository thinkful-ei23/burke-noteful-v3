'use strict';

const mongoose = require('mongoose');

const tagSchema = mongoose.Schema({
  name: {type: String, required: true, unique: true}
});

tagSchema.set('timestamps', true);

tagSchema.set('toObject', {
  virtuals: true,     // include built-in virtual `id`
  versionKey: false,  // remove `__v` version key
  transform: (doc, ret) => {
    delete ret._id; // delete `_id`
  }
});

module.export = mongoose.model('Tag', tagSchema);