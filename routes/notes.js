'use strict';

const express = require('express');
const router = express.Router();
const Note = require('../models/note');

/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  const searchTerm = req.query.searchTerm;
  let filter = {};
  const filterArray = [];
  
  if (searchTerm) {
    const title = { 'title': {$regex: searchTerm, $options: 'i'} };
    filterArray.push(title);
    const content = { 'content': {$regex: searchTerm, $options: 'i'} };
    filterArray.push(content);
    filter.$or = filterArray;
  }

  console.log(filterArray);
  console.log(filter);

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
  
  const newItem = {
    title: req.body.title,
    content: req.body.content
  };
    
  Note.create(newItem)
    .then(result => {
      res.status(201).json(result);
    })
    .catch(err => {
      next(err);
    });

});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {
  const idOfItemToUpdate = req.params.id;
  const updateItem = {};
  Object.keys(req.body).forEach(key => updateItem[key] = req.body[key]);
  
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