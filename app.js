const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require("cors");
const session = require('express-session');

const connectDB = require('./config/db');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandlers');
const productRouter = require('./routes/product');
const authRouter = require('./routes/auth');
const logger = require('./config/logger');  // Import custom logger
const { swaggerSetup, swaggerDocs } = require('./config/swagger');  // Import Swagger setup

const app = express();

// Connect to the database
connectDB();

// Middleware
const corsOptions = {
    origin: 'http://localhost:5173',  // Or your client’s domain
    credentials: true,                // Allow cookies to be sent
};
app.use(cors(corsOptions));

app.use(logger);  // Use custom logger
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: '12345678910',       // Secret key for signing session ID cookies
    resave: false,                 // Don't save session if it's not modified
    saveUninitialized: false,      // Don't save empty session
    cookie: {
        httpOnly: true,            // Helps mitigate XSS attacks
        secure: false,             // Set to true in production (use HTTPS)
        maxAge: 30 * 24 * 60 * 60 * 1000,  // Session expiration time (30 days)
    },
}));
// Swagger setup
app.use('/api-docs', swaggerSetup, swaggerDocs);  // Swagger UI endpoint

// Routes
app.use('/api/v1', productRouter);
app.use('/api/v1', authRouter);

// Catch 404 errors
app.use(notFoundHandler);

// Error handling
app.use(errorHandler);

module.exports = app;