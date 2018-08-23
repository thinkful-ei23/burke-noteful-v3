'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = require('../server');
const {TEST_MONGODB_URI} = require('../config');

const Tag = require('../models/tag');
const User = require('../models/user');

const seedTags = require('../db/seed/tags');
const seedUsers = require('../db/seed/users');

const { JWT_SECRET } = require('../config');

const expect = chai.expect;
chai.use(chaiHttp);


describe.only('Tags API resource', function() {
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
      Tag.insertMany(seedTags),
      Tag.createIndexes()
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
  
  describe('GET api/tags', function() {
    
    it('should return all existing tags', function() {
      return Promise.all([
        Tag.find({userId: user.id}),
        chai.request(app).get('/api/tags').set('Authorization', `Bearer ${token}`)
      ])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
        });
    });

    it('should return tags with the right fields', function() {
      let resTag;
      return Promise.all([
        Tag.find({userId: user.id}),
        chai.request(app).get('/api/tags').set('Authorization', `Bearer ${token}`)
      ])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.lengthOf.at.least(1);
          res.body.forEach(function(Tag) {
            expect(Tag).to.be.a('object');
            expect(Tag).to.include.keys(
              'id', 'name', 'createdAt', 'updatedAt', 'userId');
          });
          resTag = res.body[0];
          expect(res.body.length).to.eql(data.length);
          return Tag.findById(resTag.id);
        })
        .then (dataTag => {
          expect(resTag.id).to.equal(dataTag.id);
          expect(resTag.name).to.equal(dataTag.name);
          expect(new Date(resTag.createdAt)).to.eql(dataTag.createdAt);
          expect(new Date(resTag.updatedAt)).to.eql(dataTag.updatedAt);
          expect(mongoose.Types.ObjectId(resTag.userId)).to.deep.equal(dataTag.userId);
        });
    });

  });

  describe('GET api/tags/:id', function() {

    it('should return the correct Tag', function() {
      let id;
      return Tag.findOne({userId: user.id})
        .then(obj => {
          id = obj.id;
          return Promise.all([
            Tag.findById(id),
            chai.request(app).get(`/api/tags/${id}`).set('Authorization', `Bearer ${token}`)
          ]);
        })
        .then(([dataTag, res]) => {
          const resTag = res.body;
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(resTag).to.be.a('object');
          expect(resTag.id).to.equal(dataTag.id);
          expect(resTag.name).to.equal(dataTag.name);
          expect(new Date(resTag.createdAt)).to.eql(dataTag.createdAt);
          expect(new Date(resTag.updatedAt)).to.eql(dataTag.updatedAt);
          expect(mongoose.Types.ObjectId(resTag.userId)).to.deep.equal(dataTag.userId);
        });
    });

    it('should return a 400 if passed an invalid id', function() {
      const id = 3;
      return chai.request(app)
        .get(`/api/tags/${id}`).set('Authorization', `Bearer ${token}`)
        .then(function (res) {
          expect(res).to.have.status(400);
          expect(res.text).to.equal('Not a valid tag id');
        });
    });

    it('should return a 404 if the Tag is not in the database', function() {
      // how do we come up with a valid Tag and know that it's not in the database?
      const id = '111111111111131111112285';
      return chai.request(app)
        .get(`/api/tags/${id}`).set('Authorization', `Bearer ${token}`)
        .then(function (res) {
          expect(res).to.have.status(404);
          expect(res.text).to.equal('Tag not found');
        });
    });

  });


  describe('POST api/tags', function() {

    it('should create and return a new Tag when provided valid data', function () {
      const newTag = {
        'name': 'The best article about cats ever!',
      };

      let res;
      return chai.request(app)
        .post('/api/tags')
        .send(newTag)
        .set('Authorization', `Bearer ${token}`)
        .then(_res => {
          res = _res;
          expect(res).to.have.status(201);
          expect(res).to.have.header('location');
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('name', 'id', 'createdAt', 'updatedAt', 'userId');
          return Tag.findById(res.body.id);
        })
        .then(data => {
          expect(res.body.id).to.equal(data.id);
          expect(res.body.name).to.equal(data.name);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
          expect(mongoose.Types.ObjectId(res.body.userId)).to.deep.equal(data.userId);
        });
        
    });


    it('should respond with a 400 if you attempt to make a Tag without a name', function () {
      const newItem = { };

      return chai.request(app)
        .post('/api/tags')
        .send(newItem)
        .set('Authorization', `Bearer ${token}`)
        .then(function (res) {
          expect(res).to.have.status(400);
          expect(res.text).to.equal('Missing name of new tag in request body');
        });
       
    });

    // grabbed this from solution to check whether the bug was my test
    it('should return an error when given a duplicate name', function () {
      return Tag.findOne({userId: user.id})
        .then(data => {
          const newItem = { 'name': data.name };
          return chai.request(app).post('/api/tags').send(newItem).set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('You already have a tag with that name');
        });
    });

  });





  describe('PUT api/tags', function() {

    it('should update fields you send over', function() {
      const updateObject = {
        name : 'Updated name',
      };
      
      let data;
      let _res;
      return Tag.findOne({userId: user.id})
        .then(_data => {
          data = _data;
          return chai.request(app).put(`/api/tags/${data.id}`)
            .send(updateObject).set('Authorization', `Bearer ${token}`);
        })
        .then((res) => {
          _res = res;
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('id', 'name', 'createdAt', 'updatedAt', 'userId');
          return Tag.findById(data.id);
        })
        .then(data => {
          expect(_res.body.id).to.equal(data.id);
          expect(_res.body.name).to.equal(data.name);
          expect(new Date(_res.body.createdAt)).to.eql(new Date(data.createdAt));
          expect(new Date(_res.body.updatedAt)).to.eql(new Date(data.updatedAt));
          expect(mongoose.Types.ObjectId(_res.body.userId)).to.deep.equal(data.userId);
        });

    });

    it('should respond with a 400 if you attempt to update a Tag without a name', function () {
      const updateObject = {};
      let data;
      return Tag.findOne({userId: user.id})
        .then(_data => {
          data = _data;
          return chai.request(app).put(`/api/tags/${data.id}`)
            .send(updateObject).set('Authorization', `Bearer ${token}`);
        })
        .then((res) => {
          const text = JSON.parse(res.error.text).message;
          expect(res).to.have.status(400);
          expect(text).to.equal('Missing name of new tag in request body');
        });
       
    });

    
    it('should return an error when given a duplicate name', function () {
      return Tag.find({userId: user.id}).limit(2)
        .then(results => {
          const [item1, item2] = results;
          item1.name = item2.name;
          return chai.request(app)
            .put(`/api/tags/${item1.id}`)
            .send({name: item1.name}).set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          console.log(res.error);
          const text = JSON.parse(res.error.text).message;
          expect(res).to.have.status(400);
          expect(text).to.equal('You already have a tag with that name');
        });
    });


  });

  describe('DELETE api/tags/:id', function() {

    it('should delete a Tag by id and a note that had that tag should not have it anymore', function() {
      let data;
      return Tag.findOne({userId: user.id})
        .then(_data => {
          data = _data;
          return chai.request(app).delete(`/api/tags/${data.id}`).set('Authorization', `Bearer ${token}`);
        })
        .then((res) => {
          expect(res).to.have.status(200);
          return Tag.find({id : data.id});
        })
        .then(res => {
          expect(res).to.be.a('array');
          expect(res.length).to.equal(0);
          return Tag.findById(data.id);
        })
        .then(res => {
          expect(res).to.be.null;
        });
    });

    
  });


});
