const mongoose = require('mongoose');
const UserBehavior = require('../models/UserBehaviors');
const { v4: uuidv4 } = require('uuid'); // Import UUID for generating unique ID

exports.trackUserBehavior = async (req, res) => {
    try {
        const { user, productId, behavior, sessionId: reqSessionId, isLoggedid} = req.body;

        // Ensure all required fields are provided
        if (!user || !productId || !behavior) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        let newSessionId;

        if (isLoggedid) {
            // If the user is logged in, use the sessionId from the request
            console.log('User is logged in. Using sessionId from request.');
            newSessionId = reqSessionId;
        } else {
            // Fallback to session determination logic
            const now = new Date();

            // Fetch the most recent behavior for the same user (if exists)
            const lastBehavior = await UserBehavior.findOne({ user: user })
                .sort({ createdAt: -1 }) // Sort by createdAt in descending order to get the most recent behavior
                .exec();

            console.log("Last behavior:", lastBehavior);

            if (!lastBehavior || lastBehavior.user.toString() !== user) {
                // If no behavior exists for this user or it's a different user, create a new session
                console.log('New user or no behavior found, generating new session ID.');
                newSessionId = uuidv4(); // Generate a new session ID
            } else {
                // If the user is the same, compare the time difference
                const timeDifference = now.getTime() - new Date(lastBehavior.createdAt).getTime();
                console.log('Time difference (ms):', timeDifference);

                if (timeDifference > 1 * 60 * 1000) {
                    // If the time difference is greater than 1 minute, treat it as a new session
                    console.log('Time gap greater than 1 minute, generating new session ID.');
                    newSessionId = uuidv4(); // Generate a new session ID
                } else {
                    // Otherwise, continue with the same session ID
                    console.log('Continuing with the same session ID.');
                    newSessionId = lastBehavior.sessionId; // Continue with the same session ID
                }
            }
        }

        // Initialize the tracking data object
        const trackingData = {
            sessionId: newSessionId, // Use the determined session ID (new or continued)
            user: new mongoose.Types.ObjectId(user), // Correct ObjectId instantiation
            product: new mongoose.Types.ObjectId(productId), // Correct ObjectId instantiation
            behavior, // Behavior from the request body
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
