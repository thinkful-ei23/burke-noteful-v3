'use strict';

const app = require('../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const { TEST_MONGODB_URI } = require('../config');

const User = require('../models/user');

const expect = chai.expect;

chai.use(chaiHttp);

describe('Noteful API - Users', function () {
  const username = 'exampleUser';
  const password = 'examplePass';
  const fullname = 'Example User';

  before(function () {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function () {
    return User.createIndexes();
  });

  afterEach(function () {
    return mongoose.connection.db.dropDatabase();
  });

  after(function () {
    return mongoose.disconnect();
  });
  
  describe('/api/users', function () {
    describe('POST', function () {
      it('Should create a new user', function () {
        const testUser = { username, password, fullname };

        let res;
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(_res => {
            res = _res;
            expect(res).to.have.status(201);
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.keys('id', 'username', 'fullname');

            expect(res.body.id).to.exist;
            expect(res.body.username).to.equal(testUser.username);
            expect(res.body.fullname).to.equal(testUser.fullname);

            return User.findOne({ username });
          })
          .then(user => {
            expect(user).to.exist;
            expect(user.id).to.equal(res.body.id);
            expect(user.fullname).to.equal(testUser.fullname);
            return user.validatePassword(password);
          })
          .then(isValid => {
            expect(isValid).to.be.true;
          });
      });
      it('Should reject users with missing username', function () {
        const testUser = { password, fullname };
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            const message = JSON.parse(res.text).message;
            expect(message).to.equal('Missing \'username\' in request body');
            expect(res).to.have.status(422);
          });
      });
      it('Should reject users with missing password', function() {
        const testUser = { username, fullname };
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            const message = JSON.parse(res.text).message;
            expect(message).to.equal('Missing \'password\' in request body');
            expect(res).to.have.status(422);
          });
      });
      it('Should reject users with non-string username', function() {
        const nonStringUserName = 358;
        const testUser = { username: nonStringUserName, fullname, password };
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            const message = JSON.parse(res.text).message;
            expect(message).to.equal('\'username\' expected to be a string');
            expect(res).to.have.status(422);
          });
      });
      it('Should reject users with non-string password', function() {
        const nonStringPassword = 358;
        const testUser = { username, fullname, password: nonStringPassword };
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            const message = JSON.parse(res.text).message;
            expect(message).to.equal('\'password\' expected to be a string');
            expect(res).to.have.status(422);
          });
      });
      it('Should reject users with non-trimmed username', function() {
        const nonTrimmedUsername = '   user';
        const testUser = { username: nonTrimmedUsername, fullname, password };
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            const message = JSON.parse(res.text).message;
            expect(message).to.equal('\'username\' cannot have whitespace before or after');
            expect(res).to.have.status(422);
          });
      });
      it('Should reject users with non-trimmed password', function() {
        const nonTrimmedPassword = '   password';
        const testUser = { username, fullname, password: nonTrimmedPassword };
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            const message = JSON.parse(res.text).message;
            expect(message).to.equal('\'password\' cannot have whitespace before or after');
            expect(res).to.have.status(422);
          });
      });
      it('Should reject users with empty username', function() {
        const emptyUsername = '';
        const testUser = { username: emptyUsername, fullname, password};
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            const message = JSON.parse(res.text).message;
            expect(message).to.equal('Username must be greater than one character');
            expect(res).to.have.status(422);
          });
      });
      it('Should reject users with password less than 8 characters', function() {
        const smallPassword = '1234';
        const testUser = { username, fullname, password: smallPassword};
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            const message = JSON.parse(res.text).message;
            expect(message).to.equal('Passwords must be between 8 and 72 characters');
            expect(res).to.have.status(422);
          });
      });
      it('Should reject users with password greater than 72 characters', function() {
        const longPassword = 'a'.repeat(74);
        const testUser = { username, fullname, password: longPassword};
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            const message = JSON.parse(res.text).message;
            expect(message).to.equal('Passwords must be between 8 and 72 characters');
            expect(res).to.have.status(422);
          });
      });
      it('Should reject users with duplicate username', function() {
        const testUser = { username, fullname, password};
        return chai.request(app).post('/api/users').send(testUser)
          .then(() => {
            return chai.request(app).post('/api/users').send(testUser)
              .then(res => {
                const message = JSON.parse(res.text).message;
                expect(message).to.equal('The username already exists');
                expect(res).to.have.status(400);
              });
          });
      });
      it('Should trim fullname', function() {
        let _res;
        const untrimmedfullname = '   Bob User ';
        const testUser = { username, fullname: untrimmedfullname, password};
        return chai.request(app).post('/api/users').send(testUser)
          .then(res => {
            _res = res;
            expect(res).to.have.status(201);
            expect(res.body).to.be.an('object');
            expect(res.body.id).to.exist;
            expect(res.body.username).to.equal(testUser.username);
            expect(res.body.fullname).to.not.equal(testUser.fullname);
            expect(res.body.fullname).to.equal(testUser.fullname.trim());

            return User.findOne({ username });
          })
          .then(user => {
            expect(user).to.exist;
            expect(user.id).to.equal(_res.body.id);
            expect(user.fullname).to.not.equal(testUser.fullname);
            expect(user.fullname).to.equal(testUser.fullname.trim());
          });
      
      });
    });
  });
});