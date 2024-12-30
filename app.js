const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require("cors");

const connectDB = require('./config/db');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandlers');
const productRouter = require('./routes/product');
const authRouter = require('./routes/auth');
const cartRouter = require('./routes/cart');
const orderRouter = require('./routes/order');
const userRouter = require('./routes/user');
const trackRouter = require('./routes/tracking');

const logger = require('./config/logger');  // Import custom logger
const { swaggerSetup, swaggerDocs } = require('./config/swagger');  // Import Swagger setup

const app = express();

// Connect to the database
connectDB();

// Middleware setup
const corsOptions = {

    origin: 'http://localhost:5173', // Your frontend URL
    credentials: true,  // Allow credentials (cookies)
};

// Apply CORS for authenticated routes (e.g., tracking, auth)
app.use('/api/v1/tracking', cors(corsOptions));
app.use('/api/v1/auth', cors(corsOptions));
app.use('/api/v1/cart', cors(corsOptions));
app.use('/api/v1/users', cors(corsOptions));
app.use('/api/v1/orders', cors(corsOptions));  // Add this in your main app.js or server file

// CORS for public routes (e.g., products)
const openCorsOptions = {
    origin: 'http://localhost:5173', // Your frontend URL
    credentials: true  // Don't allow credentials (cookies)
};
app.use('/api/v1/products', cors(openCorsOptions)); // For open routes

// Middleware for logging, request parsing, etc.
app.use(logger);  // Use custom logger
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());  // Enable cookie parsing
app.use(express.static(path.join(__dirname, 'public')));

// Swagger setup
app.use('/api-docs', swaggerSetup, swaggerDocs);  // Swagger UI endpoint

// Routes

app.use('/api/v1/products', productRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/tracking', trackRouter);
app.use('/api/v1/cart', cartRouter);
app.use('/api/v1/orders', orderRouter);
app.use('/api/v1/users', userRouter);
// Catch 404 errors
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

module.exports = app;
