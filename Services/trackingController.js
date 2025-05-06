const { v4: uuidv4 } = require("uuid");
const { sendMessage } = require("../kafka/kafka-producer");
const UserBehavior = require('../models/UserBehaviors'); // Adjust path as needed

// In-memory stores to track last event time and session ID per user
const lastEventTimes = new Map();
const lastSessionIds = new Map();

exports.trackUserBehavior = async (req, res) => {
    try {
        const { user, productId, product_name, behavior, sessionId: reqSessionId } = req.body;

        console.log("Request body:", req.body);
        if (!user || !productId || !product_name || !behavior || !reqSessionId || reqSessionId.trim() === "") {
            return res.status(400).json({ message: "Missing or invalid required fields: user, productId, product_name, behavior, or sessionId" });
        }

        const now = new Date();
        let sessionId;

        const lastEventTime = lastEventTimes.get(user);
        const lastSessionId = lastSessionIds.get(user);

        if (lastEventTime && lastSessionId) {
            const timeDifference = now - new Date(lastEventTime);
            console.log("Time difference (ms):", timeDifference);

            // Use 2 minutes (120,000 ms) as the threshold
            if (timeDifference <= 2 * 60 * 1000) {
                // Within 2 minutes, reuse the last session ID
                sessionId = lastSessionId;
                console.log("Reused last session ID:", sessionId);
            } else {
                // More than 2 minutes, generate a new session ID
                sessionId = uuidv4();
                console.log("New session ID generated (after 2 minutes):", sessionId);
            }
        } else {
            // No previous event for this user, generate a new session ID
            sessionId = uuidv4();
            console.log("No last event, new session ID generated:", sessionId);
        }

        // Update the last event time and session ID for this user
        lastEventTimes.set(user, now);
        lastSessionIds.set(user, sessionId);

        // Format event_time as "YYYY-MM-DD HH:MM:SS UTC"
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, '0');
        const day = String(now.getUTCDate()).padStart(2, '0');
        const hours = String(now.getUTCHours()).padStart(2, '0');
        const minutes = String(now.getUTCMinutes()).padStart(2, '0');
        const seconds = String(now.getUTCSeconds()).padStart(2, '0');
        const eventTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;

        const trackingData = {
            user_session: sessionId,
            user_id: user,
            product_id: productId,
            name: product_name,
            event_type: behavior,
            event_time: eventTime,
      
        };

        const eventDoc = new UserBehavior({
            user_session: sessionId,
            user_id: user,
            product_id: productId,
            name: product_name,
            event_type: behavior,
            event_time: new Date(eventTime),
          
        });

        console.log("Tracking data to send to Kafka:", trackingData);

        await sendMessage("user_events", trackingData);
        await eventDoc.save(); // Save to MongoDB
        console.log("✅ Saved to MongoDB:", eventDoc);

        res.status(201).json({
            message: "User behavior tracked and saved successfully",
            sessionId: sessionId,
        });
    } catch (error) {
        console.error("❌ Error tracking user behavior:", error);
        res.status(500).json({ message: "Error tracking user behavior", error: error.message });
    }
};