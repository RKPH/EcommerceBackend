const Minio = require('minio');
const mongoose = require('mongoose');
const userBehavior = require('../models/UserBehaviors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv'); // ✅ Convert JSON to CSV

// ✅ MinIO Configuration
const minioClient = new Minio.Client({
    endPoint: '103.155.161.94',
    port: 9000,
    useSSL: false,
    accessKey: 'minioadmin',
    secretKey: 'minioadmin',
});

const bucketName = 'user-behavior-bucket';

// ✅ Function to upload CSV data to MinIO
const uploadToMinio = async (data) => {
    try {
        const fileName = `user_behavior_${Date.now()}.csv`;
        const filePath = path.join(__dirname, fileName);

        // ✅ Convert JSON data to CSV format
        const fields = ['user', 'product', 'product_name', 'behavior', 'sessionId', 'SessionActionId', 'createdAt'];
        const json2csvParser = new Parser({ fields });
        const csvData = json2csvParser.parse(data);

        // ✅ Write CSV data to a local file
        fs.writeFileSync(filePath, csvData);

        // ✅ Ensure the bucket exists
        const bucketExists = await minioClient.bucketExists(bucketName);
        if (!bucketExists) {
            await minioClient.makeBucket(bucketName);
        }

        // ✅ Upload file to MinIO
        await minioClient.fPutObject(bucketName, fileName, filePath);
        console.log(`Data uploaded to MinIO: ${fileName}`);

        // ✅ Delete local file after successful upload
        fs.unlinkSync(filePath);
    } catch (error) {
        console.error('Error uploading to MinIO:', error);
    }
};

// ✅ User Behavior Tracking API
exports.trackUserBehavior = async (req, res) => {
    try {
        const { user, productId, product_name, behavior, sessionId: reqSessionId } = req.body;

        // Ensure all required fields are provided
        if (!user || !productId || !behavior || !reqSessionId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        let newSessionId = reqSessionId;
        let sessionActionId = uuidv4(); // Default new session action ID
        const now = new Date();

        // Fetch the most recent behavior for the user
        const lastBehavior = await userBehavior.findOne({ user: user })
            .sort({ createdAt: -1 }) // Get the most recent entry
            .exec();

        if (lastBehavior) {
            if (lastBehavior.sessionId !== reqSessionId) {
                console.log('Session ID differs, generating a new sessionActionId.');
                sessionActionId = uuidv4();
            } else {
                const timeDifference = now - new Date(lastBehavior.createdAt);
                if (timeDifference > 1 * 60 * 1000) { // 1-minute gap
                    console.log('Time gap >1 min, generating new sessionActionId.');
                    sessionActionId = uuidv4();
                } else {
                    console.log('Time gap <1 min, reusing sessionActionId.');
                    sessionActionId = lastBehavior.SessionActionId;
                }
            }
        } else {
            console.log('No previous behavior found, initializing new sessionActionId.');
            sessionActionId = uuidv4();
        }

        // Save new behavior record
        const trackingData = {
            sessionId: newSessionId,
            SessionActionId: sessionActionId,
            user: new mongoose.Types.ObjectId(user),
            product: productId,
            product_name: product_name,
            behavior,
            createdAt: now
        };

        const newBehavior = new userBehavior(trackingData);
        await newBehavior.save();

        // ✅ Check record count and move to MinIO if >10
        const recordCount = await userBehavior.countDocuments();
        if (recordCount > 10) {
            console.log(`More than 10 records found (${recordCount}), moving to MinIO...`);

            // Fetch all user behavior records
            const allRecords = await userBehavior.find({}).lean(); // Convert to plain objects

            // ✅ Upload data to MinIO in CSV format
            await uploadToMinio(allRecords);

            // ✅ Delete records from DB after successful upload
            await userBehavior.deleteMany({});
            console.log('All records deleted from database after upload.');
        }

        res.status(201).json({
            message: 'User behavior tracked successfully',
            sessionId: newSessionId,
            sessionActionId: sessionActionId,
        });
    } catch (error) {
        console.error('Error tracking user behavior:', error);
        res.status(500).json({ message: 'Error tracking user behavior', error });
    }
};
