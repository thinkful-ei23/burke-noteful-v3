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
const User = require('../models/user');


const seedFolders = require('../db/seed/folders');
const seedUsers = require('../db/seed/users');
const { JWT_SECRET } = require('../config');

const expect = chai.expect;

chai.use(chaiHttp);


describe('Folders API resource', function() {

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
  
  describe('GET api/folders', function() {
    
    it('should return all existing folders', function() {
      return Promise.all([
        Folder.find({userId: user.id}),
        chai.request(app).get('/api/folders').set('Authorization', `Bearer ${token}`)
      ])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
        });
    });

    it('should return folders with the right fields', function() {
      let resFolder;
      return Promise.all([
        Folder.find({userId: user.id}),
        chai.request(app).get('/api/folders').set('Authorization', `Bearer ${token}`)
      ])
        .then(([data, res]) => {
          expect(data.length).to.equal(res.body.length);
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.lengthOf.at.least(1);
          res.body.forEach(function(folder) {
            expect(folder).to.be.a('object');
            expect(folder).to.include.keys(
              'id', 'name', 'createdAt', 'updatedAt', 'userId');
          });
          resFolder = res.body[0];
          return Folder.findById(resFolder.id);
        })
        .then (dataFolder => {
          expect(resFolder.id).to.equal(dataFolder.id);
          expect(resFolder.name).to.equal(dataFolder.name);
          expect(new Date(resFolder.createdAt)).to.eql(dataFolder.createdAt);
          expect(new Date(resFolder.updatedAt)).to.eql(dataFolder.updatedAt);
          expect(mongoose.Types.ObjectId(resFolder.userId)).to.deep.equal(dataFolder.userId);
        });
    });

  });

  describe('GET api/folders/:id', function() {

    it('should return the correct folder', function() {
      let id;
      return Folder.findOne({userId: user.id})
        .then(obj => {
          id = obj.id;
          return Promise.all([
            Folder.findOne({userId: user.id}),
            chai.request(app).get(`/api/folders/${id}`).set('Authorization', `Bearer ${token}`)
          ]);
        })
        .then(([dataFolder, res]) => {
          const resFolder = res.body;
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(resFolder).to.be.a('object');
          expect(resFolder.id).to.equal(dataFolder.id);
          expect(resFolder.name).to.equal(dataFolder.name);
          expect(new Date(resFolder.createdAt)).to.eql(dataFolder.createdAt);
          expect(new Date(resFolder.updatedAt)).to.eql(dataFolder.updatedAt);
          expect(mongoose.Types.ObjectId(resFolder.userId)).to.deep.equal(dataFolder.userId);
        });
    });

    it('should return a 400 if passed an invalid id', function() {
      const id = 3;
      return chai.request(app)
        .get(`/api/folders/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .then(function (res) {
          expect(res).to.have.status(400);
          expect(res.text).to.equal('Not a valid id');
        });
    });

    it('should return a 404 if the folder is not in the database', function() {
      // how do we come up with a valid folder and know that it's not in the database?
      const id = '111111111111131111112285';
      return chai.request(app)
        .get(`/api/folders/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .then(function (res) {
          expect(res).to.have.status(404);
          expect(res.text).to.equal('Folder not found');
        });
    });

  });


  describe('POST api/folders', function() {

    it('should create and return a new folder when provided valid data', function () {
      const newFolder = {
        'name': 'The best article about cats ever!',
      };

      let res;
      return chai.request(app)
        .post('/api/folders')
        .send(newFolder)
        .set('Authorization', `Bearer ${token}`)
        .then(_res => {
          res = _res;
          expect(res).to.have.status(201);
          expect(res).to.have.header('location');
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('name', 'id', 'createdAt', 'updatedAt', 'userId');
          return Folder.findById(res.body.id);
        })
        .then(data => {
          expect(res.body.id).to.equal(data.id);
          expect(res.body.name).to.equal(data.name);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
          expect(mongoose.Types.ObjectId(res.body.userId)).to.deep.equal(data.userId);
        });
        
    });


    it('should respond with a 400 if you attempt to make a folder without a name', function () {
      const newItem = { };

      return chai.request(app)
        .post('/api/folders')
        .send(newItem)
        .set('Authorization', `Bearer ${token}`)
        .then(function (res) {
          expect(res).to.have.status(400);
          expect(res.text).to.equal('Missing name of new folder in request body');
        });
       
    });

    // grabbed this from solution to check whether the bug was my test
    it('should return an error when given a duplicate name', function () {
      return Folder.findOne({userId: user.id})
        .then(data => {
          const newItem = { 'name': data.name };
          return chai.request(app).post('/api/folders').send(newItem).set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('You already have a folder with that name');
        });
    });

  });





  describe('PUT api/folders', function() {

    it('should update fields you send over', function() {
      const updateObject = {
        name : 'Updated name',
      };
      
      let data;
      let _res;
      return Folder.findOne({userId: user.id})
        .then(_data => {
          data = _data;
          return chai.request(app).put(`/api/folders/${data.id}`)
            .send(updateObject).set('Authorization', `Bearer ${token}`);
        })
        .then((res) => {
          _res = res;
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('id', 'name', 'createdAt', 'updatedAt', 'userId');
          return Folder.findById(data.id);
        })
        .then(data => {
          expect(_res.body.id).to.equal(data.id);
          expect(_res.body.name).to.equal(data.name);
          expect(new Date(_res.body.createdAt)).to.eql(new Date(data.createdAt));
          expect(new Date(_res.body.updatedAt)).to.eql(new Date(data.updatedAt));
          expect(mongoose.Types.ObjectId(_res.body.userId)).to.deep.equal(data.userId);
        });

    });

    it('should respond with a 400 if you attempt to update a folder without a name', function () {
      const updateObject = {};
      let data;
      return Folder.findOne()
        .then(_data => {
          data = _data;
          return chai.request(app).put(`/api/folders/${data.id}`)
            .send(updateObject).set('Authorization', `Bearer ${token}`);
        })
        .then((res) => {
          const text = JSON.parse(res.error.text).message;
          expect(res).to.have.status(400);
          expect(text).to.equal('Missing name of new folder in request body');
        });
       
    });

    it('should return an error when given a duplicate name', function () {
      return Folder.find({userId: user.id}).limit(2)
        .then(results => {
          const [item1, item2] = results;
          item1.name = item2.name;
          return chai.request(app)
            .put(`/api/folders/${item1.id}`)
            .send({name: item1.name}).set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          const message = JSON.parse(res.text).message;
          expect(message).to.equal('You already have a folder with that name');
          expect(res).to.have.status(400);
        });
    });


  });

  describe('DELETE api/folders/:id', function() {

    it('should delete a folder by id and the children of the folder', function() {
      let data;
      return Folder.findOne({userId: user.id})
        .then(_data => {
          data = _data;
          return chai.request(app).delete(`/api/folders/${data.id}`).set('Authorization', `Bearer ${token}`);
        })
        .then((res) => {
          expect(res).to.have.status(204);
          return Note.find({folderId : data.id, userId: user.id});
        })
        .then(res => {
          expect(res).to.be.a('array');
          expect(res.length).to.equal(0);
          return Folder.find({id: data.id, userId : user.id});
        })
        .then(res => {
          expect(res).to.be.a('array');
          expect(res.length).to.equal(0);
        });
    });

    
  });


});

 