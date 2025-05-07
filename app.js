const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require("cors");
const { connectProducer } = require('./kafka/kafka-producer');
const connectDB = require('./config/db');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandlers');
const productRouter = require('./routes/product');
const authRouter = require('./routes/auth');
const cartRouter = require('./routes/cart');
const orderRouter = require('./routes/Order');
const userRouter = require('./routes/User');
const reviewRouter = require('./routes/rating');
const trackRouter = require('./routes/tracking');
const http = require('http');

const imageRouter = require('./routes/image');
const addressRouter = require('./routes/ShipAddress');
const momoIPNHandler = require('./routes/momo_ipn');
const payosWebhook = require('./routes/payos_ipn');
const AdminRouter = require('./routes/admin');
const promClient = require('prom-client');
const logger = require('./config/logger');
const { swaggerSetup, swaggerDocs } = require('./config/swagger');

const app = express();



// Global CORS configuration to allow specific origin
app.use(cors({
    origin: ['https://d2f.io.vn', 'https://dashboard.d2f.io.vn' ,'http://localhost:5173','http://localhost:5174'], // Allow specific frontend domain
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Specify allowed methods
    credentials: true, // Enable credentials
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'] // Allow necessary headers
}));

app.use(logger);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

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

// Connect to the database and Kafka
connectDB();
connectProducer();


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
app.use('/api/v1', payosWebhook);
app.use('/api/v1/admin', AdminRouter);

// Swagger setup
app.use('/api-docs', swaggerSetup, swaggerDocs);

// Catch 404 errors
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

module.exports = app;