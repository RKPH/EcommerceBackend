const mongoose = require('mongoose');
const UserBehavior = require('../models/UserBehaviors');

exports.trackUserBehavior = async (req, res) => {
    try {
        const { user, sessionId, productId, behavior } = req.body;

        // Ensure all required fields are provided
        if (!user || !sessionId || !productId || !behavior) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Initialize the tracking data object
        const trackingData = {
            sessionId,  // Session ID from the request body
            user: new mongoose.Types.ObjectId(user),  // Correct ObjectId instantiation
            product: new mongoose.Types.ObjectId(productId),  // Correct ObjectId instantiation
            behavior,  // Behavior from the request body
        };

        // Save the user behavior data to the database
        const newBehavior = new UserBehavior(trackingData);
        await newBehavior.save();

        res.status(201).json({ message: 'User behavior tracked successfully' });
    } catch (error) {
        console.error('Error tracking user behavior:', error);
        res.status(500).json({ message: 'Error tracking user behavior', error });
    }
};
