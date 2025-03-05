const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require("cors");
const { startKafkaConsumer } = require('./kafka/kafka-consumer')
const connectDB = require('./config/db');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandlers');
const productRouter = require('./routes/product');
const authRouter = require('./routes/auth');
const cartRouter = require('./routes/cart');
const orderRouter = require('./routes/Order');
const userRouter = require('./routes/User');
const reviewRouter = require('./routes/rating');
const trackRouter = require('./routes/tracking');
const http = require('http');               // Needed for socket.io
const socketIo = require('socket.io');
const imageRouter = require('./routes/image');

const addressRouter = require('./routes/ShipAddress');
const momoIPNHandler = require('./routes/momo_ipn');
const AdminRouter = require('./routes/admin');
const promClient = require('prom-client');

const logger = require('./config/logger');  // Import custom logger
const { swaggerSetup, swaggerDocs } = require('./config/swagger');  // Import Swagger setup
startKafkaConsumer()
    .then(() => {
        console.log('Kafka consumer is now running.');
    })
    .catch((error) => {
        console.error('Error starting Kafka consumer:', error);
    });
const app = express();

const server = http.createServer(app);      // Create HTTP server
const io = socketIo(server, {
    cors: {
        origin: "http://localhost:5173",  // Allow only your frontend during development
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true  // If you're using cookies for auth, include this
    }
});

app.locals.io = io;

app.use(logger);  // Use custom logger
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());  // Enable cookie parsing
app.use(express.static(path.join(__dirname, 'public')));
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics();

app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', promClient.register.contentType);
        const metrics = await promClient.register.metrics();
        res.send(metrics);
    } catch (err) {
        res.status(500).send(`Error collecting metrics: ${err.message}`);
    }
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});


// Connect to the database
connectDB();

io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
})

// Middleware setup
const corsOptions = {
    origin: ['http://103.155.161.94:3000', 'http://103.155.161.94:5173' , 'http://localhost:3000' , 'http://localhost:5173', 'http://localhost:5174'],  // ✅ Add both frontend URLs
    credentials: true,  // ✅ Required to allow cookies
};
// Apply CORS for authenticated routes (e.g., tracking, auth)
app.use('/api/v1/tracking', cors(corsOptions));
app.use('/api/v1/auth', cors(corsOptions));
app.use('/api/v1/cart', cors(corsOptions));
app.use('/api/v1/users', cors(corsOptions));
app.use('/api/v1/orders', cors(corsOptions));  // Add this in your main app.js or server file
app.use('/api/v1/address', cors(corsOptions));
app.use('/api/v1/reviews', cors(corsOptions));
app.use('/api/v1/admin', cors(corsOptions));
// CORS for public routes (e.g., products)
// const openCorsOptions = {
//     origin: 'http://103.155.161.94:5173', // Your frontend URL
//     credentials: true  // Don't allow credentials (cookies)
// };

const specialNoneedCorsOptions = {
    origin: '*',
    credentials: false, // Set to false for public
}

app.use('/api/v1/products', cors(specialNoneedCorsOptions)); // For open routes

app.use('/api/v1/images', cors(specialNoneedCorsOptions));


// Middleware for logging, request parsing, etc.


// Swagger setup
app.use('/api-docs', swaggerSetup, swaggerDocs);  // Swagger UI endpoint

// Routes

app.use('/api/v1/products', productRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/tracking', trackRouter);
app.use('/api/v1/cart', cartRouter);
app.use('/api/v1/orders', orderRouter);
app.use('/api/v1/users', userRouter);

app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/images', imageRouter);
app.use('/api/v1/address', addressRouter);
app.use('/api/v1', momoIPNHandler);
app.use('/api/v1/admin', AdminRouter);
// Catch 404 errors
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

module.exports = app;
