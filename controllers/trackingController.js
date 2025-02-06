const mongoose = require('mongoose');
const UserBehavior = require('../models/UserBehaviors');
// const {sendToKafka} = require('../kafka/kafka-producer');
const { v4: uuidv4 } = require('uuid'); // Import UUID for generating unique IDs

exports.trackUserBehavior = async (req, res) => {
    try {
        const { user, productId,product_name, behavior, sessionId: reqSessionId,} = req.body;

        // Ensure all required fields are provided
        if (!user || !productId || !behavior || !reqSessionId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        let newSessionId = reqSessionId;
        let sessionActionId = uuidv4(); // Default new session action ID
        const now = new Date();

        // Fetch the most recent behavior for the user
        const lastBehavior = await UserBehavior.findOne({ user: user })
            .sort({ createdAt: -1 }) // Sort by createdAt to get the most recent entry
            .exec();

        if (lastBehavior) {
            // Check if the sessionId has changed
            if (lastBehavior.sessionId !== reqSessionId) {
                console.log('Session ID differs, generating a new sessionActionId.');
                sessionActionId = uuidv4(); // Generate a new sessionActionId
            } else {
                // Session ID matches, compare time difference
                const timeDifference = now.getTime() - new Date(lastBehavior.createdAt).getTime();
                const timeDifferenceMinutes = Math.floor(timeDifference / 60000); // Convert milliseconds to minutes
                const timeDifferenceSeconds = Math.floor((timeDifference % 60000) / 1000); // Remainder as seconds

                console.log(
                    `Time difference: ${timeDifferenceMinutes} minute(s) and ${timeDifferenceSeconds} second(s).`
                );
                ;

                if (timeDifference > 1 * 60 * 1000) {
                    console.log('Time gap greater than 1 minute, generating new sessionActionId.');
                    sessionActionId = uuidv4(); // Generate a new sessionActionId
                } else {
                    console.log('Time gap within 1 minute, continuing with the same sessionActionId.');
                    sessionActionId = lastBehavior.SessionActionId; // Reuse the same sessionActionId
                }
            }
        } else {
            // No previous behavior, initialize new sessionActionId
            console.log('No previous behavior found, initializing new sessionActionId.');
            sessionActionId = uuidv4();
        }

        // Initialize the tracking data object
        const trackingData = {
            sessionId: newSessionId,
            SessionActionId: sessionActionId,
            user: new mongoose.Types.ObjectId(user), // Ensure ObjectId format
            product:productId, // Ensure ObjectId format
            product_name:product_name,
            behavior, // Behavior from the request body
        };

        // Save the user behavior data to the database
        const newBehavior = new UserBehavior(trackingData);
        await newBehavior.save();
        // await sendToKafka(trackingData);
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
