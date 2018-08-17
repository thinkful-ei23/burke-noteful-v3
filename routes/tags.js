'use strict';

const express = require('express');
const router = express.Router();
const Tag = require('../models/tag');
const mongodb = require('mongodb');

router.get('/', (req, res, next) => {
  Tag
    .find({})
    .sort({ updatedAt: 'desc' })
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

  if (!(mongodb.ObjectID.isValid(id))) {
    const message = 'Not a valid tag id';
    console.error(message);
    return res.status(400).send(message);
  }

  Tag
    .findById(id)
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

  if (!('name' in req.body)) {
    const message = 'Missing name in request body';
    console.error(message);
    return res.status(400).send(message);
  }

  const tagId = req.body.tagId;
  const newTag = {
    name: req.body.name,
  };

  if('tagId' in req.body) {
    if (!(mongodb.ObjectID.isValid(tagId)) && tagId !== '') {
      const message = 'Not a valid tag id';
      console.error(message);
      return res.status(400).send(message);
    } else {
      newTag.tagId = tagId;
    }
  }

  Tag.create(newTag)
    .then(result => {
      res.location(`/api/tags/${result.id}`).status(201).json(result);
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

  if('tagId' in req.body) {
    if (!(mongodb.ObjectID.isValid(req.body.tagId))) {
      const message = 'Not a valid tag id';
      console.error(message);
      return res.status(400).send(message);
    }
  }
  
  Tag.findByIdAndUpdate(idOfItemToUpdate, updateItem, {new : true})
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
  Tag
    .findByIdAndRemove(idOfItemToRemove)
    .then(() => {
      res.status(204).end();
    })
    .catch(err => {
      next(err);
    });

});





module.exports = router;