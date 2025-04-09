const mongoose = require("mongoose");

// Remote MongoDB connection URL
// const mongoUrl = "mongodb+srv://pnghung2003:pnghung2003@cluster0.xiuaw.mongodb.net/recommendation_system?authSource=admin";
const mongoUrl = "mongodb://root:example@172.16.12.123:27017/recommendation_system?authSource=admin";


const connectDB = async () => {
    try {
        await mongoose.connect(mongoUrl, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("✅ Successfully connected to MongoDB vps!");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err.message);
        process.exit(1); // Exit process on failure
    }
};

module.exports = connectDB;
