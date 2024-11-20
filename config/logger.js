// utils/logger.js
const morgan = require('morgan');

// Logger middleware to log HTTP requests
const logger = morgan('dev');

module.exports = logger;
