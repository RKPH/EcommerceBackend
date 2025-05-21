const { v4: uuidv4 } = require("uuid");
const { sendMessage } = require("../kafka/kafka-producer");
const UserBehavior = require('../models/UserBehaviors');
const Product = require('../models/products'); // Import Product model
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

            if (timeDifference <= 2 * 60 * 1000) {
                sessionId = lastSessionId;
                console.log("Reused last session ID:", sessionId);
            } else {
                sessionId = uuidv4();
                console.log("New session ID generated (after 2 minutes):", sessionId);
            }
        } else {
            sessionId = uuidv4();
            console.log("No last event, new session ID generated:", sessionId);
        }

        lastEventTimes.set(user, now);
        lastSessionIds.set(user, sessionId);

        // Format event_time
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const eventTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;

        // 🔎 Find product info from DB
        const product = await Product.findOne({ product_id: productId }).lean();
        if (!product) {
            return res.status(404).json({ message: "Product not found for given productId" });
        }

        const brand = product.brand || '';
        const category = product.category || '';
        const type = product.type || '';
        const price = product.price;
        const category_code = `${category}.${type}`;

        // ✅ Data sent to Kafka
        const trackingData = {
            user_session: sessionId,
            user_id: user,
            product_id: productId,
            name: product_name,
            event_type: behavior,
            event_time: eventTime,
            brand: brand,
            price:price,
            category_code: category_code
        };

        const eventDoc = new UserBehavior({
            user_session: sessionId,
            user_id: user,
            product_id: productId,
            name: product_name,
            event_type: behavior,
            event_time: new Date(eventTime)
        });

        console.log("Tracking data to send to Kafka:", trackingData);

        await sendMessage("user_events", trackingData); // only Kafka gets brand/category_code
        await eventDoc.save(); // only basic info stored to MongoDB

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
