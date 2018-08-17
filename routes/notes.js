'use strict';

const express = require('express');
const router = express.Router();
const Note = require('../models/note');
const mongodb = require('mongodb');


/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  const searchTerm = req.query.searchTerm;
  const folderSearchTerm = req.query.folderId;

  let filter = {};
  
  if (searchTerm) {
    const searchObject =  {$regex: searchTerm, $options: 'i'};
    const title = {'title': searchObject };
    const content = { 'content': searchObject };
    const orArray = [title, content];
    if (folderSearchTerm) {
      const folderSearchObj = {folderId : folderSearchTerm};
      filter.$and = [ { $or : orArray}, folderSearchObj];
    } else {
      filter.$or = orArray;
    }
  }

  if (folderSearchTerm && !searchTerm) {
    filter = {folderId : folderSearchTerm};
  }
  
  Note
    .find(filter)
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