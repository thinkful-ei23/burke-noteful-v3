'use strict';

const mongoose = require('mongoose');

const { MONGODB_URI } = require('../config');

const Folder = require('../models/folder');
const Note = require('../models/note');
const Tag = require('../models/tag');
const User = require('../models/user');

const seedFolders = require('../db/seed/folders');
const seedNotes = require('../db/seed/notes');
const seedTags = require('../db/seed/tags');
const seedUsers = require('../db/seed/users');

mongoose.connect(MONGODB_URI)
  .then(() => mongoose.connection.db.dropDatabase())
  .then(() => {
    return Promise.all([
      Note.insertMany(seedNotes),
      Folder.insertMany(seedFolders),
      Folder.createIndexes(),
      Tag.insertMany(seedTags),
      Tag.createIndexes(),
      User.insertMany(seedUsers),
      User.createIndexes()
    ]);
  })
  .then(() => mongoose.disconnect())
  .catch(err => {
    console.error(err);
  });