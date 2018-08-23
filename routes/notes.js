'use strict';

const express = require('express');
const router = express.Router();
const Note = require('../models/note');
const Folder = require('../models/folder');
const Tag = require('../models/tag');
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
  
  const newNote = { title, content, folderId, tags, userId };


  /***** Never trust users - validate input *****/
  if (!title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  let newPromises = [];

  // if the folderId is truthy, check whether it is valid and that is belongs to the user  
  if (folderId){
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      const err = new Error('The `folderId` is not valid');
      err.status = 400;
      return next(err);
    }

    newPromises.push(Folder.find({_id: folderId, userId}).count()
      .then(count => {
        if (count === 0) {
          const err = new Error('That folder does not belong to you');
          err.status = 400;
          return Promise.reject(err);
        }
      })
    );
  } else { // if it is undefined or an empty string, delete the property
    delete newNote.folderId;
  }


  if (tags) {
    if (!Array.isArray(tags)) {
      const err = new Error('The tags property must be an array');
      err.status = 400;
      return next(err);
    }

    tags.forEach((tag) => {

      if (!mongoose.Types.ObjectId.isValid(tag)) {
        const err = new Error('The `id` is not valid');
        err.status = 400;
        return next(err);
      }

      newPromises.push(Tag.find({_id: tag, userId}).count()
        .then(count => {
          if (count === 0) {
            const err = new Error('That tag does not belong to you');
            err.status = 400;
            Promise.reject(err);
          }
        })
      );
    });
  }

  Promise.all(newPromises).then(() => {
    return Note.create(newNote);
  })
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
  console.log(updateItem);

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
  
  let updatePromises = [];

  if (updateItem.folderId) {
  
    if (!mongoose.Types.ObjectId.isValid(updateItem.folderId)) {
      const err = new Error('The `folderId` is not valid');
      err.status = 400;
      return next(err);
    }

    updatePromises.push(Folder.find({_id: updateItem.folderId, userId}).count()
      .then(count => {
        if (count === 0) {
          const err = new Error('That folder does not belong to you');
          err.status = 400;
          return Promise.reject(err);
        }
      })
    );
  } else { // if it is undefined or an empty string, set it to null
    updateItem.folderId = null;
  } 

  if ('tags' in req.body) {

    const tags = req.body.tags;
    if (!Array.isArray(tags)) {
      const err = new Error('The tags property must be an array');
      err.status = 400;
      return next(err);
    }

    tags.forEach((tag) => {

      if (!mongoose.Types.ObjectId.isValid(tag)) {
        const err = new Error('The `id` is not valid');
        err.status = 400;
        return next(err);
      }

      updatePromises.push(Tag.find({_id: tag, userId}).count()
        .then(count => {
          if (count === 0) {
            const err = new Error('That tag does not belong to you');
            err.status = 400;
            return Promise.reject(err);
          }
        })
      );
    });
  }

  // only update an item if that item has the userId and the id to be updated
  Promise.all(updatePromises)
    .then(() => {
      return Note.findOneAndUpdate({_id: idOfItemToUpdate, userId}, updateItem, {new : true});
    })
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