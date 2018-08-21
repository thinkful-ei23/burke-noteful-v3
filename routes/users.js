'use strict';

const express = require('express');
const router = express.Router();
const User = require('../models/user');


router.post('/', (req, res, next) => {
  const {fullName, username, password} = req.body;
  
  const requestFields = Object.keys(req.body);

  const requiredFields = ['username', 'password'];
  const missingField = requiredFields.find(field => !(field in req.body));

  if (missingField) {
    const err = new Error(`Missing '${missingField}' in request body`);
    err.status = 422;
    return next(err);
  }

  // find if one of the fields is not a string
  const notAString = requestFields.find(field => ((typeof req.body[field]) !== 'string'));
  console.log(notAString);

  if (notAString) {
    const err = new Error(`'${notAString}' expected to be a string`);
    err.status = 422;
    return next(err);
  }

  const fieldWithWhitespace = requiredFields.find(field => req.body[field].trim() !== req.body[field]);

  if (fieldWithWhitespace) {
    const err = new Error(`'${fieldWithWhitespace}' cannot have whitespace before or after`);
    err.status = 422;
    return next(err);
  }

  const tooSmallUsername = username.length < 1 ? true : false;
  if (tooSmallUsername) {
    const err = new Error('Username must be greater than one character');
    err.status = 422;
    return next(err);
  }

  const invalidPasswordLength = password.length < 8 || password.length > 72 ? true : false;
  if (invalidPasswordLength) {
    const err = new Error('Passwords must be between 8 and 72 characters');
    err.status = 422;
    return next(err);
  }

  return User.hashPassword(password)
    .then(digest => {
      const newUser = {
        username,
        password: digest,
        fullName
      };
      return User.create(newUser);
    })
    .then(result => {
      return res.status(201).location(`/api/users/${result.id}`).json(result);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('The username already exists');
        err.status = 400;
      }
      next(err);
    });


});


module.exports = router;