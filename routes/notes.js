'use strict';

const express = require('express');
const router = express.Router();
const Note = require('../models/note');
const mongodb = require('mongodb');


/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  const searchTerm = req.query.searchTerm;
  const folderSearchTerm = req.query.folderId;
  const tagSearchTerm = req.query.tagId;
  //Add tags to the response
  // Use .populate() to populate the tags array
  // Capture the incoming tagId and conditionally add it to the database query filter
  let filter = {};

  // filter.folderId = folderSearchTerm; 
  // 
  

  const queryCount = Object.keys(req.query).length;


  if (folderSearchTerm) {
    const folderSearchObj = {folderId : folderSearchTerm};
    filter.folderId = folderSearchTerm;
    // if (queryCount > 1) {
    //   filter['$and'].push(folderSearchObj);
    // } else {
    //   delete filter.$and;
    //   filter = folderSearchObj;
    // }

  }

  if (tagSearchTerm) {
    filter.tags = tagSearchTerm;
    // const tagSearchObj = {'tags' : tagSearchTerm};
    // if (queryCount > 1) {
    //   filter['$and'].push(tagSearchObj);
    // } else {
    //   delete filter.$and;
    //   filter = tagSearchObj;
    // }
  }

  if (searchTerm) {
    // we need to set up an explit and
    const searchObject =  {$regex: searchTerm, $options: 'i'};
    const title = {'title': searchObject };
    const content = { 'content': searchObject };
    const orArray = [title, content];
    const searchTermObj = { $or : orArray };
    if (queryCount === 1) {
      filter.$or = orArray;
    } else {
      filter = searchTermObj;
    }
  }

  // if (queryCount === 0) {
  //   delete filter.$and;
  // }
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
  Note
    .findById(id)
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
  const {title, content, folderId, tags = []} = req.body;

  const newItem = {
    title, content, folderId, tags
  };

  if (!title) {
    const err = new Error('Missing title in request body');
    err.status = 400;
    return next(err);
  }

  if (folderId && !mongodb.Types.ObjectId.isValid(folderId)) {
    const err = new Error('Not a valid folder id');
    err.status = 400;
    return next(err);
  }

  if (tags) {
    tags.forEach((tag) => {
      if (!mongodb.Types.ObjectId.isValid(tag)) {
        const err = new Error('Not a valid tag id');
        err.status = 400;
        return next(err);
      }
    });
  }

  Note.create(newItem)
    .then(result => {
      res.location(`/api/notes/${result.id}`).status(201).json(result);
    })
    .catch(err => {
      next(err);
    });

});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {
  const idOfItemToUpdate = req.params.id;
  const updateItem = {};
  const keyArray = Object.keys(req.body);

  keyArray.forEach(key => updateItem[key] = req.body[key]);

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
      if (!(mongodb.ObjectID.isValid(tag)) && tag !== '') {
        const message = 'Not a valid tag id';
        console.error(message);
        return res.status(400).send(message);
      }
    });
  }
  
  Note.findByIdAndUpdate(idOfItemToUpdate, updateItem, {new : true})
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
  Note
    .findByIdAndRemove(idOfItemToRemove)
    .then(() => {
      res.status(204).end();
    })
    .catch(err => {
      next(err);
    });

});

module.exports = router;