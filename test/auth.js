'use strict';
//nyc --reporter=lcov --reporter=text
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = require('../server');

const {TEST_MONGODB_URI} = require('../config');

const Note = require('../models/note');
const Folder = require('../models/folder');
const User = require('../models/user');


const seedFolders = require('../db/seed/folders');
const seedUsers = require('../db/seed/users');
const { JWT_SECRET } = require('../config');

const expect = chai.expect;

chai.use(chaiHttp);

describe('Auth API resource', function() {

  // we need each of these hook functions to return a promise
  // otherwise we'd need to call a `done` callback. `runServer`,
  // `seedRestaurantData` and `tearDownDb` each return a promise,
  // so we return the value returned by these function calls.
  let user;
  let token;

  before(function () {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function () {
    return Promise.all([
      User.insertMany(seedUsers),
      User.createIndexes()
    ])
      .then(([users]) => {
        user = users[0];
        token = jwt.sign({ user }, JWT_SECRET, { subject: user.username });
      });
  });

  afterEach(function () {
    return mongoose.connection.db.dropDatabase();
  });

  after(function () {
    return mongoose.disconnect();
  });

  describe('POST api/login', function() {

    it('should return a 401 if you attempt to login with a username not in the database ', function() {
      const userNotInDatabase = 'fiasnfsnafiasofnisn';
      const inValidUser = {username: userNotInDatabase, password: 'password'};
      return chai.request(app)
        .post('/api/login/')
        .send(inValidUser)
        .then(res => {
          expect(res).to.have.status(401);
          expect(res.body.message).to.equal('Unauthorized');
        });
    });
    it('should return a 401 if you attempt to login with a password that is not correct', function() {
      const incorrectPassword = 'fiasnfsnafiasofnisn';
      const inValidUser = {username: 'bobuser', password: incorrectPassword};
      return chai.request(app)
        .post('/api/login/')
        .send(inValidUser)
        .then(res => {
          expect(res).to.have.status(401);
          expect(res.body.message).to.equal('Unauthorized');
        });
    });
    it('should return a valid jwt if your username is in the database and the password is correct', function() {
      const validUser = {username: 'bobuser', password: 'password'};
      return chai.request(app)
        .post('/api/login/')
        .send(validUser)
        .then(res => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.include.keys('authToken');
        });
    });
  });

  describe('POST api/refresh', function() {
    it('should return a valid jwt if you have a valid jwt', function() {
      return chai.request(app)
        .post('/api/refresh/')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.include.keys('authToken');
        });
    });



  });


});