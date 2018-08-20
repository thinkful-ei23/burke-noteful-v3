'use strict';

const express = require('express');
const router = express.Router();
const User = require('../models/user');

router.post('/', (req, res, next) => {
  const {fullName, username, password} = req.body;

  User.create({
    fullName,
    username,
    password
  })
    .then(user => {
      res.status(201).location(`/api/users/${user.id}`).json({fullName: user.fullName, username: user.username});
    })
    .catch(err => {
      next(err);
    });

});


module.exports = router;