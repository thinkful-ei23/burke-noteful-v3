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
  filter.$and = [];

  const queryCount = Object.keys(req.query).length;


  if (folderSearchTerm) {
    const folderSearchObj = {folderId : folderSearchTerm};
    if (queryCount > 1) {
      filter['$and'].push(folderSearchObj);
    } else {
      delete filter.$and;
      filter = folderSearchObj;
    }

  }

  if (tagSearchTerm) {
    const tagSearchObj = {'tags' : tagSearchTerm};
    if (queryCount > 1) {
      filter['$and'].push(tagSearchObj);
    } else {
      delete filter.$and;
      filter = tagSearchObj;
      console.log(filter);
    }
  }

  if (searchTerm) {
    const searchObject =  {$regex: searchTerm, $options: 'i'};
    const title = {'title': searchObject };
    const content = { 'content': searchObject };
    const orArray = [title, content];
    const searchTermObj = { $or : orArray };
    if (queryCount > 1) {
      filter['$and'].push(searchTermObj);
    } else {
      delete filter.$and;
      filter = searchTermObj;
    }
  }

  if (queryCount === 0) {
    delete filter.$and;
  }


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

  if (!('title' in req.body)) {
    const message = 'Missing title in request body';
    console.error(message);
    return res.status(400).send(message);
  }

  const folderId = req.body.folderId;
  const tags = req.body.tags;
  console.log(tags);
  const newItem = {
    title: req.body.title,
    content: req.body.content,
  };

  if('folderId' in req.body) {
    if (!(mongodb.ObjectID.isValid(folderId)) && folderId !== '') {
      const message = 'Not a valid folder id';
      console.error(message);
      return res.status(400).send(message);
    } else {
      newItem.folderId = folderId;
    }
  }

  if('tags' in req.body) {
    tags.forEach(tag => {
      if (!(mongodb.ObjectID.isValid(tag)) && tag !== '') {
        const message = 'Not a valid tag id';
        console.error(message);
        return res.status(400).send(message);
      } else {
        newItem.tags = tags;
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