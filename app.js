const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

const connectDB = require('./config/db');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandlers');
const productRouter = require('./routes/product');
const logger = require('./config/logger');  // Import custom logger
const { swaggerSetup, swaggerDocs } = require('./config/swagger');  // Import Swagger setup

const app = express();

// Connect to the database
connectDB();

// Middleware
app.use(logger);  // Use custom logger
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Swagger setup
app.use('/api-docs', swaggerSetup, swaggerDocs);  // Swagger UI endpoint

// Routes
app.use('/api/v1', productRouter);

// Catch 404 errors
app.use(notFoundHandler);

// Error handling
app.use(errorHandler);

module.exports = app;
