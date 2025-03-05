const mongoose = require('mongoose');
const userBehavior = require('../models/UserBehaviors');
const { v4: uuidv4 } = require('uuid');

// ✅ User Behavior Tracking API
exports.trackUserBehavior = async (req, res) => {
    try {
        const { user, productId, product_name, behavior, sessionId: reqSessionId } = req.body;

        console.log("Received request:", req.body);

        // Ensure all required fields are provided
        if (!user || !productId || !behavior || !reqSessionId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        let newSessionId = reqSessionId;
        const now = new Date();

        // Fetch the most recent behavior for the user
        const lastBehavior = await userBehavior.findOne({ user_id: user })
            .sort({ createdAt: -1 }) // Get the most recent entry
            .exec();

        console.log("Last Behavior Found:", lastBehavior);

        if (lastBehavior) {
            if (lastBehavior.sessionId !== reqSessionId) {
                console.log('Session ID differs, keeping received sessionId.');
                newSessionId = reqSessionId;
            } else {
                const timeDifference = now - new Date(lastBehavior.createdAt);
                if (timeDifference > 1 * 60 * 1000) { // 1-minute gap
                    console.log('Time gap >1 min, generating new sessionId.');
                    newSessionId = uuidv4();
                } else {
                    console.log('Time gap <1 min, reusing sessionId.');
                    newSessionId = lastBehavior.sessionId;
                }
            }
        } else {
            console.log('No previous behavior found, using sessionId from request.');
            newSessionId = reqSessionId; // ✅ Ensure it takes from req at first action
        }

        // ✅ Save new behavior record
        const trackingData = {
            sessionId: newSessionId,
            user_id: user,
            product_id: productId,
            product_name: product_name,
            behavior,
            createdAt: now
        };

        const newBehavior = new userBehavior(trackingData);
        await newBehavior.save();

        console.log('User behavior saved to database.');

        res.status(201).json({
            message: 'User behavior tracked successfully',
            sessionId: newSessionId
        });
    } catch (error) {
        console.error('Error tracking user behavior:', error);
        res.status(500).json({ message: 'Error tracking user behavior', error });
    }
};
