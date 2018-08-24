'use strict';

// why aren't we requiring mocha? mocha runs all of our tests. it is a framework vs. a library
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = require('../server');

const {TEST_MONGODB_URI} = require('../config');

const Note = require('../models/note');
const Folder = require('../models/folder');
const Tag = require('../models/tag');
const User = require('../models/user');

const seedNotes = require('../db/seed/notes');
const seedFolders = require('../db/seed/folders');
const seedTags = require('../db/seed/tags');
const seedUsers = require('../db/seed/users');

const { JWT_SECRET } = require('../config');

const expect = chai.expect;

chai.use(chaiHttp);


describe('Notes API resource', function() {
  let user;
  let token;

  // we need each of these hook functions to return a promise
  // otherwise we'd need to call a `done` callback. `runServer`,
  // `seedRestaurantData` and `tearDownDb` each return a promise,
  // so we return the value returned by these function calls.
  before(function () {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function () {
    return Promise.all([
      User.insertMany(seedUsers),
      Note.insertMany(seedNotes),
      Note.createIndexes(),
      Tag.insertMany(seedTags),
      Tag.createIndexes(),
      Folder.insertMany(seedFolders),
      Folder.createIndexes()
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
  
  describe('GET api/notes', function() {
    
    // checks that the response is in the right format and also that the response matches what is in the data
    it('should return all existing notes', function() {
      return Promise.all([
        Note.find({userId: user.id}),
        chai.request(app).get('/api/notes').set('Authorization', `Bearer ${token}`)
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
    it('should return notes with the right fields', function() {
      let resNote;

      return Promise.all([
        Note.find({userId: user.id}),
        chai.request(app).get('/api/notes').set('Authorization', `Bearer ${token}`)
      ])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.lengthOf.at.least(1);
          res.body.forEach(function(note) {
            expect(note).to.be.a('object');
            expect(note).to.include.keys(
              'id', 'title', 'content', 'createdAt', 'updatedAt', 'userId');
          });
          resNote = res.body[0];
          expect(res.body.length).to.eql(data.length);
          return Note.findById(resNote.id);
        })
        .then (dataNote => {
          expect(resNote.id).to.equal(dataNote.id);
          expect(resNote.title).to.equal(dataNote.title);
          expect(resNote.content).to.equal(dataNote.content);
          for (let i = 0; i< resNote.tags.length; i++) {
            expect(mongoose.Types.ObjectId(resNote.tags[i].id)).to.deep.equal(dataNote.tags[i]);
          }
          expect(mongoose.Types.ObjectId(resNote.userId)).to.deep.equal(dataNote.userId);
          expect(new Date(resNote.createdAt)).to.eql(new Date(dataNote.createdAt));
          expect(new Date(resNote.updatedAt)).to.eql(new Date(dataNote.updatedAt));
        });
 
    });

    it('should return the right notes for a searchTerm', function() {
      const filter = {};
      const searchTerm = 'lady gaga';
      const searchObject =  {$regex: searchTerm, $options: 'i'};
      const title = {'title': searchObject };
      const content = { 'content': searchObject };
      filter.$or = [title, content];
      filter.userId = user.id;

      let resNote;

      return Promise.all([
        Note.find(filter),
        chai.request(app).get(`/api/notes?searchTerm=${searchTerm}`).set('Authorization', `Bearer ${token}`)
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
          for (let i = 0; i< resNote.tags.length; i++) {
            expect(mongoose.Types.ObjectId(resNote.tags[i].id)).to.deep.equal(dataNote.tags[i]);
          }
          expect(mongoose.Types.ObjectId(resNote.userId)).to.deep.equal(dataNote.userId);
          expect(mongoose.Types.ObjectId(resNote.folderId)).to.deep.equal(dataNote.folderId);
          expect(new Date(resNote.createdAt)).to.eql(new Date(dataNote.createdAt));
          expect(new Date(resNote.updatedAt)).to.eql(new Date(dataNote.updatedAt));
        });
    });

    it('should return the right notes for a certain folder id', function() {
      const folderId = '222222222222222222222201';
      return Promise.all([
        Note.find({folderId}),
        chai.request(app).get(`/api/notes?folderId=${folderId}`).set('Authorization', `Bearer ${token}`)
      ])
        .then(([data, res]) => {
          expect(data.length).to.equal(res.body.length);
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
        });
        
    });

    it('should return the right notes for a certain tag id', function() {
      const tagId = '333333333333333333333301';
      return Promise.all([
        Note.find({tags: tagId}),
        chai.request(app).get(`/api/notes?tagId=${tagId}`).set('Authorization', `Bearer ${token}`)
      ])
        .then(([data, res]) => {
          expect(data.length).to.equal(res.body.length);
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
        });
        
    });


  });

  describe('GET api/notes/:id', function() {

    it('should return the correct note', function() {
      let id;
      return Note.findOne({userId: user.id})
        .then(obj => {
          id = obj.id;
          return Promise.all([
            Note.findById(id),
            chai.request(app).get(`/api/notes/${id}`).set('Authorization', `Bearer ${token}`)
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
          for (let i = 0; i< resNote.tags.length; i++) {
            expect(mongoose.Types.ObjectId(resNote.tags[i].id)).to.deep.equal(data.tags[i]);
          }
          expect(mongoose.Types.ObjectId(resNote.userId)).to.deep.equal(data.userId);
          expect(new Date(resNote.createdAt)).to.eql(new Date(data.createdAt));
          expect(new Date(resNote.updatedAt)).to.eql(new Date(data.updatedAt));
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
        .set('Authorization', `Bearer ${token}`)
        .then(function (_res) {
          res = _res;
          expect(res).to.have.status(201);
          expect(res).to.have.header('location');
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.all.keys('id', 'title', 'content', 'createdAt', 'updatedAt', 'tags','userId');
          return Note.findById(res.body.id);
        })
        .then(data => {
          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(data.title);
          expect(res.body.content).to.equal(data.content);
          expect(mongoose.Types.ObjectId(res.body.userId)).to.deep.equal(data.userId);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });

    it('should respond with a 400 if you attempt to post without a title', function () {
      const newItem = {
        'content': 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor...'
      };

      return chai.request(app)
        .post('/api/notes')
        .send(newItem)
        .set('Authorization', `Bearer ${token}`)
        .then(function (res) {
          // console log - the error handler on the client side is not picking this up
          const message = JSON.parse(res.text).message;
          expect(res).to.have.status(400);
          expect(message).to.equal('Missing `title` in request body');
        });
       
    });

    it('should respond with a 400 if you attempt to post a note with a folder that does not belong to the user', function () {
      const newItem = {
        'title': 'title',
        'content': 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor...',
        'folderId': '222222222222222222222208'
      };

      return chai.request(app)
        .post('/api/notes')
        .send(newItem)
        .set('Authorization', `Bearer ${token}`)
        .then(function (res) {
          const message = JSON.parse(res.text).message;
          expect(res).to.have.status(400);
          expect(message).to.equal('That folder does not belong to you');
        });
       
    });


    it('should respond with a 400 if you attempt to post a note with a tag that does not belong to the user', function () {
      const newItem = {
        'title': 'title',
        'content': 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor...',
        'tags': ['333333333333333333333308']
      };

      return chai.request(app)
        .post('/api/notes')
        .send(newItem)
        .set('Authorization', `Bearer ${token}`)
        .then(function (res) {
          const message = JSON.parse(res.text).message;
          expect(res).to.have.status(400);
          expect(message).to.equal('That tag does not belong to you');
        });
       
    });

    it('should respond with a 400 if you attempt to post a note with a tag that is invalid', function () {
      const newItem = {
        'title': 'title',
        'content': 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor...',
        'tags': ['333333333333333333333']
      };

      return chai.request(app)
        .post('/api/notes')
        .send(newItem)
        .set('Authorization', `Bearer ${token}`)
        .then(function (res) {
          const message = JSON.parse(res.text).message;
          expect(res).to.have.status(400);
          expect(message).to.equal('The `id` is not valid');
        });
       
    });

  });


  describe('PUT api/notes/', function() {

    it('should update fields you send over', function() {
      const updateObject = {
        title : 'Updated title',
        content : 'Content title',
        tags : ['333333333333333333333302'],
        folderId: '222222222222222222222201'
      };
      
      let data; // original object to update
      let _res; // after update

      // 1) First, find something to update
      return Note.findOne({userId: user.id})
        .then(_data => {
          data = _data;
          // 2) then call the API with the ID
          return chai.request(app).put(`/api/notes/${data.id}`)
            .send(updateObject).set('Authorization', `Bearer ${token}`);
        })
        .then((res) => {
          _res = res;
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('id', 'title', 'content', 'createdAt', 'updatedAt', 'folderId', 'tags', 'userId');
          return Note.findById(data.id); // make sure the database updated
        })
        .then(data => {
          expect(_res.body.id).to.equal(data.id);
          expect(_res.body.title).to.equal(data.title);
          expect(_res.body.content).to.equal(data.content);
          for (let i = 0; i< _res.body.tags.length; i++) {
            expect(mongoose.Types.ObjectId(_res.body.tags[i])).to.deep.equal(data.tags[i]);
          }
          expect(mongoose.Types.ObjectId(_res.body.userId)).to.deep.equal(data.userId);
          expect(mongoose.Types.ObjectId(_res.body.folderId)).to.deep.equal(data.folderId);
          expect(new Date(_res.body.createdAt)).to.eql(new Date(data.createdAt));
          expect(new Date(_res.body.updatedAt)).to.eql(new Date(data.updatedAt));
        });

    });

    it('should send a 400 if you send nothing to update', function() {
      const updateObject = {};
      let data;
      // 1 First, find something to update
      return Note.findOne({userId: user.id})
        .then(_data => {
          data = _data;
          // 2 then call the API with the ID
          return chai.request(app).put(`/api/notes/${data.id}`)
            .send(updateObject).set('Authorization', `Bearer ${token}`);
        })
        .then((res) => {
          expect(res).to.have.status(400);
          expect(res.text).to.equal('Nothing sent to update');
        });
   
    });

    it('should respond with a 400 if you attempt to update a note with a folder that does not belong to the user', function () {
      const updateItem = {
        'folderId': '222222222222222222222208'
      };

      return chai.request(app)
        .put('/api/notes/111111111111111111111101')
        .send(updateItem)
        .set('Authorization', `Bearer ${token}`)
        .then(function (res) {
          const message = JSON.parse(res.text).message;
          expect(res).to.have.status(400);
          expect(message).to.equal('That folder does not belong to you');
        });
       
    });


    it('should respond with a 400 if you attempt to update a note with a tag that does not belong to the user', function () {
      const updateItem = {
        'tags': ['333333333333333333333308']
      };

      return chai.request(app)
        .put('/api/notes/111111111111111111111101')
        .send(updateItem)
        .set('Authorization', `Bearer ${token}`)
        .then(function (res) {
          const message = JSON.parse(res.text).message;
          expect(res).to.have.status(400);
          expect(message).to.equal('That tag does not belong to you');
        });
       
    });

    it('should respond with a 400 if you attempt to update a note with a tag that is invalid', function () {
      const updateItem = {
        'tags': ['3333']
      };

      return chai.request(app)
        .put('/api/notes/111111111111111111111103')
        .send(updateItem)
        .set('Authorization', `Bearer ${token}`)
        .then(function (res) {
          const message = JSON.parse(res.text).message;
          expect(res).to.have.status(400);
          expect(message).to.equal('The `id` is not valid');
        });
       
    });



  });

  describe('DELETE api/notes/:id', function() {

    it('should delete a note by id', function() {
      let data;
      return Note.findOne({userId: user.id})
        .then(_data => {
          data = _data;
          return chai.request(app).delete(`/api/notes/${data.id}`).set('Authorization', `Bearer ${token}`);
        })
        .then((res) => {
          expect(res).to.have.status(204);
          return Note.findById(data.id);
        })
        .then(res => {
          expect(res).to.be.null;
        });
    });
  });
});