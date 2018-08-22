'use strict';

const express = require('express');
const router = express.Router();
const Tag = require('../models/tag');
const Note = require('../models/note');
const mongodb = require('mongodb');
const mongoose = require('mongoose');
const passport = require('passport');

router.use('/', passport.authenticate('jwt', { session: false, failWithError: true }));

router.get('/', (req, res, next) => {
  const userId = req.user.id;
  Tag
    .find({userId})
    .sort({ name: 'desc' })
    .then(tags => {
      res.json(tags);
    })
    .catch(error => {
      next(error);
    });
});


/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/:id', (req, res, next) => {
  const id = req.params.id;
  const userId = req.user.id;

  if (!(mongodb.ObjectID.isValid(id))) {
    const message = 'Not a valid tag id';
    console.error(message);
    return res.status(400).send(message);
  }

  Tag
    .findOne({_id: id, userId})
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        return res.status(404).send('Tag not found');
      }
    })
    .catch(err => {
      next(err);
    });
 
});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {
  const userId = req.user.id;

  if (!('name' in req.body)) {
    const message = 'Missing name of new tag in request body';
    console.error(message);
    return res.status(400).send(message);
  }
  
  const newTag = {
    userId,
    name: req.body.name,
  };
    
  Tag.create(newTag)
    .then(result => {
      res.location(`/api/tags/${result.id}`).status(201).json(result);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('You already have a tag with that name');
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

  if('userId' in req.body) {
    const message = 'Cannot change ownership of tag';
    console.error(message);
    return res.status(400).send(message);
  }

  if (!('name' in req.body)) {
    const err = new Error('Missing name of new tag in request body');
    err.status = 400;
    return next(err);
  }
  const updateTag = { name };
  
  Tag.findOneAndUpdate({_id: id, userId}, updateTag, {new : true})
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('You already have a tag with that name');
        err.status = 400;
      }
      next(err);
    });

});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/:id', (req, res, next) => {
  const idOfTagToRemove = req.params.id;
  const userId = req.user.id;

  Tag
    .findOneAndRemove({_id : idOfTagToRemove, userId})
    .then((result) => {
      if (result) {
        return Note.update(
          {'tags' : idOfTagToRemove, userId},{ $pull: {'tags' : idOfTagToRemove} },{multi: true, 'new': true});
      } else {
        return res.status(404).send('Tag not found');
      }
    })
    .then((result) => {
      if(result) {
        res.json(result).status(200).end();
      } else {
        res.status(204).end();
      }
    })
    .catch(err => {
      next(err);
    });


});





module.exports = router;