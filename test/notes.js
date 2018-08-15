'use strict';

// why aren't we requiring mocha? mocha runs all of our tests. it is a framework vs. a library
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const app = require('../server');

const {TEST_MONGODB_URI} = require('../config');

const Note = require('../models/note');

const seedNotes = require('../db/seed/notes');

const expect = chai.expect;

chai.use(chaiHttp);

describe('Notes API tests'), () => {

  before(function() {
    // connect to the database 
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function() {
    // seed the database before each
    return Note.insertMany(seedNotes);
  });

  afterEach(function() {
    // drop the database after each
    return mongoose.connection.db.dropDatabase();
  });

  after(function() {
    // close the connection
    return mongoose.disconnect();
  });







};