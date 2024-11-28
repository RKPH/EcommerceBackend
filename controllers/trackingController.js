const mongoose = require('mongoose');
const UserBehavior = require('../models/UserBehaviors');
const { v4: uuidv4 } = require('uuid'); // Import UUID for generating unique I

exports.trackUserBehavior = async (req, res) => {
    try {
        const { user, sessionId, productId, behavior } = req.body;
        console.log("sessionId take in", sessionId);
        // Ensure all required fields are provided
        if (!user || !sessionId || !productId || !behavior) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const now = new Date();

        // Fetch the most recent behavior for the same user (if exists)
        const lastBehavior = await UserBehavior.findOne({ user: user })
            .sort({ createdAt: -1 }) // Sort by createdAt in descending order to get the most recent behavior
            .exec();
        console.log("last behavior", lastBehavior);
        // Check if the sessionId from the request matches the sessionId in the last behavior
        let newSessionId = sessionId; // Default to the provided session ID

        if (!lastBehavior || lastBehavior.sessionId !== sessionId) {
            // If no behavior exists or the sessionId is different, it's a new session
            console.log('New session or user login detected no new session need');


        } else {
            // If the sessionId is the same, check if the time difference exceeds 1 minute
            const timeDifference = now.getTime() - new Date(lastBehavior.createdAt).getTime();

            console.log('Time difference (ms):', timeDifference);

            if (timeDifference > 1 * 60 * 1000) {
                // If the time difference is greater than 1 minute, treat it as a new session
                console.log('Time gap greater than 1 minute, creating a new session ID');
                newSessionId = uuidv4(); // Generate a new session ID
            } else {
                // Otherwise, keep the same session ID (it's a continuation of the same session)
                console.log('Continuing with the same session ID');
            }
        }

        // Initialize the tracking data object
        const trackingData = {
            sessionId: newSessionId,  // Use the determined session ID (new or continued)
            user: new mongoose.Types.ObjectId(user),  // Correct ObjectId instantiation
            product: new mongoose.Types.ObjectId(productId),  // Correct ObjectId instantiation
            behavior,  // Behavior from the request body
        };

        // Save the user behavior data to the database
        const newBehavior = new UserBehavior(trackingData);
        await newBehavior.save();

        res.status(201).json({
            message: 'User behavior tracked successfully',
            sessionId: newSessionId, // Return the session ID used for tracking
        });

    } catch (error) {
        console.error('Error tracking user behavior:', error);
        res.status(500).json({ message: 'Error tracking user behavior', error });
    }
};
