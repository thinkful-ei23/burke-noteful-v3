'use strict';

const mongoose = require('mongoose');
const { MONGODB_URI } = require('../config');

const Note = require('../models/note');

// get all notes or notes by search term
// mongoose.connect(MONGODB_URI)
//   .then(() => {
//     const searchTerm = 'lady gaga';
//     let filter = {};

//     if (searchTerm) {
//       filter.title = { $regex: searchTerm, $options: 'i' };
//     }

//     return Note.find(filter).sort({ updatedAt: 'desc' });
//   })
//   .then(results => {
//     console.log(results);
//   })
//   .then(() => {
//     return mongoose.disconnect();
//   })
//   .catch(err => {
//     console.error(`ERROR: ${err.message}`);
//     console.error(err);
//   });

// Find note by id using Note.findById
// mongoose.connect(MONGODB_URI)
//   .then(() => {
//     // hard coded
//     const id = '000000000000000000000003';
//     return Note.findById(id);
//   })
//   .then(results => {
//     console.log(results);
//   })
//   .then(() => {
//     return mongoose.disconnect();
//   })
//   .catch(err => {
//     console.error(`ERROR: ${err.message}`);
//     console.error(err);
//   });

// Create a new note using Note.create

// mongoose.connect(MONGODB_URI)
//   .then(() => {
//     // hard coded
//     const newItem = {
//       title: 'NEW ITEM',
//       content: 'YO'
//     };

//     return Note.create(newItem);
//   })
//   .then(results => {
//     console.log(results);
//   })
//   .then(() => {
//     return mongoose.disconnect();
//   })
//   .catch(err => {
//     console.error(`ERROR: ${err.message}`);
//     console.error(err);
//   });

// Update a note by id using Note.findByIdAndUpdate
// mongoose.connect(MONGODB_URI)
//   .then(() => {
//     const idOfItemToUpdate = '5b7329ce12b59d4a7471492b';
//     const updateItem = {
//       title: 'UPDATED ITEM',
//       content: 'updated'
//     };
//     return Note.findByIdAndUpdate(idOfItemToUpdate, updateItem, {new : true});
//   })
//   .then(results => {
//     console.log(results);
//   })
//   .then(() => {
//     return mongoose.disconnect();
//   })
//   .catch(err => {
//     console.error(`ERROR: ${err.message}`);
//     console.error(err);
//   });

// Delete a note by id using Note.findByIdAndRemove

mongoose.connect(MONGODB_URI)
  .then(() => {
    const idOfItemToRemove = '5b7329ce12b59d4a7471492b';
    return Note.findByIdAndRemove(idOfItemToRemove);
  })
  .then(results => {
    console.log(results);
  })
  .then(() => {
    return mongoose.disconnect();
  })
  .catch(err => {
    console.error(`ERROR: ${err.message}`);
    console.error(err);
  });