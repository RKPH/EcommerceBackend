const mongoose = require("mongoose");

// Remote MongoDB connection URL
const mongoUrl = "mongodb://root:example@103.155.161.94:27017/recommendation_system?authSource=admin";

const connectDB = async () => {
    try {
        await mongoose.connect(mongoUrl, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("✅ Successfully connected to MongoDB!");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err.message);
        process.exit(1); // Exit process on failure
    }
};

module.exports = connectDB;
