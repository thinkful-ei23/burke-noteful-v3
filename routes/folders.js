'use strict';

const express = require('express');
const router = express.Router();
const Folder = require('../models/folder');
const Note = require('../models/note');
const mongodb = require('mongodb');

router.get('/', (req, res, next) => {
  Folder
    .find()
    .sort({ updatedAt: 'desc' })
    .then(folders => {
      res.json(folders);
    })
    .catch(error => {
      next(error);
    });
});



/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/:id', (req, res, next) => {

  // validate that the id is a mongo object id
  const id = req.params.id;
  if (!(mongodb.ObjectID.isValid(id))) {
    const message = 'Not a valid id';
    console.error(message);
    return res.status(400).send(message);
  }

  // Conditionally return a 200 response or a 404 Not Found
  Folder
    .findById(id)
    .then(result => {
      if (!result) {
        return res.status(404).send('Folder not found');
      }
      res.json(result);
    })
    .catch(err => {
      next(err);
    });
 
});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {

  if (!('name' in req.body)) {
    const message = 'Missing name of new folder in request body';
    console.error(message);
    return res.status(400).send(message);
  }
  
  const newFolder = {
    name: req.body.name,
  };
    
  Folder.create(newFolder)
    .then(result => {
      res.location(`/api/folders/${result.id}`).status(201).json(result);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('You already have a folder with that name');
        err.status = 400;
      }
      next(err);
    });

});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {

  const { id } = req.params;
  const { name } = req.body;

  if (!(mongodb.ObjectID.isValid(id))) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  if (!('name' in req.body)) {
    const err = new Error('Missing name of new folder in request body');
    err.status = 400;
    return next(err);
  }
  const updateFolder = { name };
  
  Folder.findByIdAndUpdate(id, updateFolder, {new : true})
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('You already have a folder with that name');
        err.status = 400;
      }
      next(err);
    });

});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/:id', (req, res, next) => {
  const idOfItemToRemove = req.params.id;
  // delete all notes that have folderId equal to idOfItemToRemove
  Folder
    .findByIdAndRemove(idOfItemToRemove)
    .then(() => {
      return Note.find({folderId : idOfItemToRemove}).remove();
    })
    .then(() => {
      res.status(204).end();
    })
    .catch(err => {
      next(err);
    });

});





module.exports = router;