const errorHandler = require('../src/middlewares/errorHandler');
const notFound = require('../src/middlewares/notFound');
const validation = require('../src/middlewares/validation');
const audit = require('../src/middlewares/audit');

module.exports = {
  errorHandler,
  notFound,
  validation,
  audit
};