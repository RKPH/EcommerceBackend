require('dotenv').config(); // Load environment variables from .env

const mongoose = require('mongoose');

// Construct the MongoDB URI using environment variables
// const dbURI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const dbURI = 'mongodb://localhost:27017/EcommerceDB';


const connectDB = async () => {
    try {
        await mongoose.connect(dbURI);  // No need for the deprecated options
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1); // Exit the process with failure
    }
};

module.exports = connectDB;
