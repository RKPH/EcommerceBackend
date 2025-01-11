// db.js or database.js
const mongoose = require("mongoose");

// Use the internal service name and container port (27017)
const mongoUrl = "mongodb://mongodb-service:27017/ecommerce";

const connectDB = async () => {
    try {
        await mongoose.connect(mongoUrl, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("Connected to MongoDB");
    } catch (err) {
        console.error("Error connecting to MongoDB:", err.message);
        process.exit(1); // Exit process with failure
    }
};

module.exports = connectDB;
