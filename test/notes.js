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


describe('Notes API resource', function() {

  // we need each of these hook functions to return a promise
  // otherwise we'd need to call a `done` callback. `runServer`,
  // `seedRestaurantData` and `tearDownDb` each return a promise,
  // so we return the value returned by these function calls.
  before(function () {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function () {
    return Note.insertMany(seedNotes);
  });

  afterEach(function () {
    return mongoose.connection.db.dropDatabase();
  });

  after(function () {
    return mongoose.disconnect();
  });
  
  describe('GET api/notes', function() {
    
    // checks that the response is in the right format and also that the response matches what is in the data
    it('should return all existing notes', function() {
      return Promise.all([
        Note.find(),
        chai.request(app).get('/api/notes')
      ])
        // 3) then compare database results to API response
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
        });
    });

    // restaurant in the response should have the correct fields
    it('should return notes with right fields', function() {
      let resNote;

      return Promise.all([
        Note.find(),
        chai.request(app).get('/api/notes')
      ])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.lengthOf.at.least(1);
          res.body.forEach(function(note) {
            expect(note).to.be.a('object');
            expect(note).to.include.keys(
              'id', 'title', 'content');
          });
          resNote = res.body[0];
          return Note.findById(resNote.id);
        })
        .then (dataNote => {
          expect(resNote.id).to.equal(dataNote.id);
          expect(resNote.title).to.equal(dataNote.title);
          expect(resNote.content).to.equal(dataNote.content);
        });
 
    });

    it('should return notes with right fields', function() {
      let resNote;

      return Promise.all([
        Note.find(),
        chai.request(app).get('/api/notes')
      ])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.lengthOf.at.least(1);
          res.body.forEach(function(note) {
            expect(note).to.be.a('object');
            expect(note).to.include.keys(
              'id', 'title', 'content');
          });
          resNote = res.body[0];
          return Note.findById(resNote.id);
        })
        .then (dataNote => {
          expect(resNote.id).to.equal(dataNote.id);
          expect(resNote.title).to.equal(dataNote.title);
          expect(resNote.content).to.equal(dataNote.content);
        });

    });

    it('should return the right notes for a searchTerm', function() {
      const filter = {};
      const searchTerm = 'lady gaga';
      const searchObject =  {$regex: searchTerm, $options: 'i'};
      const title = {'title': searchObject };
      const content = { 'content': searchObject };
      filter.$or = [title, content];

      let resNote;

      return Promise.all([
        Note.find(filter),
        chai.request(app).get(`/api/notes?searchTerm=${searchTerm}`)
      ])
        .then(([data, res]) => {
          expect(data.length).to.equal(res.body.length);
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          resNote = res.body[0];
          return Note.findById(resNote.id);
        })
        .then (dataNote => {
          expect(resNote.id).to.equal(dataNote.id);
          expect(resNote.title).to.equal(dataNote.title);
          expect(resNote.content).to.equal(dataNote.content);
        });
    });
  });

  describe('GET api/notes/:id', function() {

    it('should return the correct note', function() {
      let id;
      return Note.findOne()
        .then(obj => {
          id = obj.id;
          return Promise.all([
            Note.findById(id),
            chai.request(app).get(`/api/notes/${id}`)
          ]);
        })
        .then(([data, res]) => {
          const resNote = res.body;
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(resNote).to.be.a('object');
          expect(resNote.id).to.equal(data.id);
          expect(resNote.title).to.equal(data.title);
          expect(resNote.content).to.equal(data.content);
        });
    });

  });

  describe('POST api/notes/', function() {

    it('should create and return a new item when provided valid data', function () {
      const newItem = {
        'title': 'The best article about cats ever!',
        'content': 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor...'
      };

      let res;
      return chai.request(app)
        .post('/api/notes')
        .send(newItem)
        .then(function (_res) {
          res = _res;
          expect(res).to.have.status(201);
          expect(res).to.have.header('location');
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('id', 'title', 'content', 'createdAt', 'updatedAt');
          return Note.findById(res.body.id);
        })
        .then(data => {
          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(data.title);
          expect(res.body.content).to.equal(data.content);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });

  });

});
