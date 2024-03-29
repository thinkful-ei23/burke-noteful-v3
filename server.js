'use strict';

const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const passport = require('passport');

const localStrategy = require('./passport/local');
const jwtStrategy = require('./passport/jwt');
//check if travis is working
const { PORT, MONGODB_URI } = require('./config');

const notesRouter = require('./routes/notes');
const foldersRouter = require('./routes/folders');
const tagsRouter = require('./routes/tags');
const userRouter = require('./routes/users');
const authRouter = require('./routes/auth');

// Create an Express application
const app = express();

// Log all requests. Skip logging during
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'common', {
  skip: () => process.env.NODE_ENV === 'test'
}));

// Create a static webserver
app.use(express.static('public'));

// Parse request body
app.use(express.json());

passport.use(localStrategy);
passport.use(jwtStrategy);

// Mount routers
app.use('/api', authRouter);
app.use('/api/notes', notesRouter);
app.use('/api/folders', foldersRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/users', userRouter);


// Custom 404 Not Found route handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Custom Error Handler
app.use((err, req, res, next) => {
  if (err.status) {
    const errBody = Object.assign({}, err, { message: err.message });
    res.status(err.status).json(errBody);
  } else {
    // console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// we don't want to run these blocks when we're testing because we call them separately
if (process.env.NODE_ENV !== 'test') {
// Connect to DB and Listen for incoming connections
  mongoose.connect(MONGODB_URI)
    .then(instance => {
      const conn = instance.connections[0];
      // console.info(`Connected to: mongodb://${conn.host}:${conn.port}/${conn.name}`);
    })
    .catch(err => {
      // console.error(`ERROR: ${err.message}`);
      // console.error('\n === Did you remember to start `mongod`? === \n');
      // console.error(err);
    });

  // Listen for incoming connections
  if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, function () {
      // console.info(`Server listening on ${this.address().port}`);
    }).on('error', err => {
      // console.error(err);
    });
  }
}
module.exports = app; // Export for testing