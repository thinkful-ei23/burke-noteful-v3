'use strict';

const express = require('express');
const router = express.Router();
const Note = require('../models/note');
const mongoose = require('mongoose');
const passport = require('passport');
const mongodb = require('mongodb');

router.use('/', passport.authenticate('jwt', { session: false, failWithError: true }));


/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  const searchTerm = req.query.searchTerm;
  const folderSearchTerm = req.query.folderId;
  const tagSearchTerm = req.query.tagId;
  const userId = req.user.id;

  let filter = {userId};

  if (folderSearchTerm) {
    filter.folderId = folderSearchTerm;
  }

  if (tagSearchTerm) {
    filter.tags = tagSearchTerm;
  }

  if (searchTerm) {
    const searchObject =  {$regex: searchTerm, $options: 'i'};
    const title = {'title': searchObject };
    const content = { 'content': searchObject };
    filter.$or = [title, content];
  }

  console.log(filter);

  Note
    .find(filter)
    .populate('tags')
    .sort({ updatedAt: 'desc' })
    .then(notes => {
      res.json(notes);
    })
    .catch(error => {
      next(error);
    });
});



/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/:id', (req, res, next) => {
  const id = req.params.id;
  const userId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Note
    .findOne({_id: id, userId})
    .populate('tags')
    .then(result => {
      res.json(result);
    })
    .catch(err => {
      next(err);
    });
 
});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {
  const { title, content, folderId, tags = [] } = req.body;
  const userId = req.user.id;

  /***** Never trust users - validate input *****/
  if (!title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  if (folderId && !mongoose.Types.ObjectId.isValid(folderId)) {
    const err = new Error('The `folderId` is not valid');
    err.status = 400;
    return next(err);
  }

  if (tags) {
    tags.forEach((tag) => {
      if (!mongoose.Types.ObjectId.isValid(tag)) {
        const err = new Error('The `id` is not valid');
        err.status = 400;
        return next(err);
      }
    });
  }

  const newNote = { title, content, folderId, tags, userId };

  Note.create(newNote)
    .then(result => {
      res
        .location(`${req.originalUrl}/${result.id}`)
        .status(201)
        .json(result);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {
  const idOfItemToUpdate = req.params.id;
  const userId = req.user.id;
  const updateItem = {};
  const keyArray = Object.keys(req.body);

  keyArray.forEach(key => updateItem[key] = req.body[key]);

  if('userId' in req.body) {
    const message = 'Cannot change ownership of note';
    console.error(message);
    return res.status(400).send(message);
  }

  if (!(keyArray.length)) {
    const message = 'Nothing sent to update';
    console.error(message);
    return res.status(400).send(message);
  }

  if('folderId' in req.body) {
    if (!(mongodb.ObjectID.isValid(req.body.folderId))) {
      const message = 'Not a valid folder id';
      console.error(message);
      return res.status(400).send(message);
    }
  }

  if('tags' in req.body) {
    updateItem.tags.forEach(tag => {
      if (!(mongoose.ObjectID.isValid(tag)) && tag !== '') {
        const message = 'Not a valid tag id';
        console.error(message);
        return res.status(400).send(message);
      }
    });
  }

  // only update an item if that item has the userId and the id to be updated
  Note.findOneAndUpdate({_id: idOfItemToUpdate, userId}, updateItem, {new : true})
    .then(result => {
      res.json(result);
    })
    .catch(err => {
      next(err);
    });

});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/:id', (req, res, next) => {
  const idOfItemToRemove = req.params.id;
  const userId = req.user.id;
  Note
    .findOneAndRemove({_id : idOfItemToRemove, userId})
    .then(() => {
      res.status(204).end();
    })
    .catch(err => {
      next(err);
    });

});

module.exports = router;