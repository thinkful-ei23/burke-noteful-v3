'use strict';

// why aren't we requiring mocha? mocha runs all of our tests. it is a framework vs. a library
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const app = require('../server');

const {TEST_MONGODB_URI} = require('../config');

const Note = require('../models/note');

const seedData = require('../db/seed/notes');