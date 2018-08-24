'use strict';

const express = require('express');
const router = express.Router();
const Folder = require('../models/folder');
const Note = require('../models/note');
const mongodb = require('mongodb');
const passport = require('passport');

router.use('/', passport.authenticate('jwt', { session: false, failWithError: true }));

router.get('/', (req, res, next) => {
  const userId = req.user.id;
  Folder
    .find({userId})
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
  const userId = req.user.id;
  // validate that the id is a mongo object id
  const id = req.params.id;
  if (!(mongodb.ObjectID.isValid(id))) {
    const message = 'Not a valid id';
    // console.error(message);
    return res.status(400).send(message);
  }

  // Conditionally return a 200 response or a 404 Not Found
  Folder
    .findOne({_id: id, userId})
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
  const userId = req.user.id;

  if (!('name' in req.body)) {
    const message = 'Missing name of new folder in request body';
    // console.error(message);
    return res.status(400).send(message);
  }
  
  const newFolder = {
    name: req.body.name,
    userId
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
  const userId = req.user.id;

  if (!(mongodb.ObjectID.isValid(id))) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  if(req.body.userId) {
    const message = 'Cannot change ownership of folder';
    // console.error(message);
    return res.status(400).send(message);
  }

  if (!('name' in req.body)) {
    const err = new Error('Missing name of new folder in request body');
    err.status = 400;
    return next(err);
  }

  const updateFolder = { name };
  Folder.findOneAndUpdate({_id: id, userId}, updateFolder, {new : true})
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
  const userId = req.user.id;
  // delete all notes that have folderId equal to idOfItemToRemove
  Folder
    .findOneAndRemove({_id : idOfItemToRemove, userId})
    .then(() => {
      return Note.find({folderId: idOfItemToRemove, userId}).remove();
    })
    .then(() => {
      res.status(204).end();
    })
    .catch(err => {
      next(err);
    });

});





module.exports = router;