const { v4: uuidv4 } = require("uuid");
const { sendMessage } = require("../kafka/kafka-producer");

// In-memory store to track last event time per user
const lastEventTimes = new Map();

exports.trackUserBehavior = async (req, res) => {
    try {
        const { user, productId, product_name, behavior, sessionId: reqSessionId } = req.body;

        console.log("Request body:", req.body);
        if (!user || !productId || !product_name || !behavior || !reqSessionId || reqSessionId.trim() === "") {
            return res.status(400).json({ message: "Missing or invalid required fields: user, productId, product_name, behavior, or sessionId" });
        }

        let newSessionId = reqSessionId.trim();
        const now = new Date();

        const lastEventTime = lastEventTimes.get(user);
        if (lastEventTime) {
            const timeDifference = now - new Date(lastEventTime);
            console.log("Time difference (ms):", timeDifference);
            if (timeDifference > 1 * 60 * 1000) { // 1 minute threshold
                newSessionId = uuidv4();
                console.log("New session ID generated:", newSessionId);
            } else {
                console.log("Reused session ID:", newSessionId);
            }
        } else {
            newSessionId = uuidv4();
            console.log("No last event, new session ID generated:", newSessionId);
        }

        // Update last event time for this user
        lastEventTimes.set(user, now);

        // Format event_time as "YYYY-MM-DD HH:MM:SS UTC"
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, '0'); // Months are 0-based
        const day = String(now.getUTCDate()).padStart(2, '0');
        const hours = String(now.getUTCHours()).padStart(2, '0');
        const minutes = String(now.getUTCMinutes()).padStart(2, '0');
        const seconds = String(now.getUTCSeconds()).padStart(2, '0');
        const eventTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;

        const trackingData = {
            user_session: newSessionId,
            user_id: user,
            product_id: productId,
            name: product_name,
            event_type: behavior,
            event_time: eventTime, // Custom UTC format
        };

        console.log("Tracking data to send to Kafka:", trackingData);

        await sendMessage("user_behavior_events", trackingData);

        res.status(201).json({
            message: "User behavior tracked successfully",
            sessionId: newSessionId,
        });
    } catch (error) {
        console.error("❌ Error tracking user behavior:", error);
        res.status(500).json({ message: "Error tracking user behavior", error: error.message });
    }
};