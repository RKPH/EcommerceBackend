const { Kafka, logLevel } = require("kafkajs");

const kafka = new Kafka({
    clientId: "user-behavior-consumer",
    brokers: ["kafka.d2f.io.vn:9092"],
    logLevel: logLevel.DEBUG, // Set to DEBUG for detailed logs
    retry: {
        initialRetryTime: 300,
        retries: 10,
    },
});

const consumer = kafka.consumer({
    groupId: "behavior-group",
    sessionTimeout: 45000,
    heartbeatInterval: 3000,
    maxPollInterval: 600000,
    rebalanceTimeout: 60000,
    retry: { retries: 10 },
});

const runConsumer = async () => {
    try {
        await consumer.connect();
        console.log("✅ Kafka Consumer connected.");

        // Subscribe to topic before running the consumer
        await consumer.subscribe({ topic: "user-behavior-events", fromBeginning: false });
        console.log("✅ Subscribed to topic: user-behavior-events");

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                try {
                    const messageValue = message.value.toString();
                    console.log(`📥 [${topic}] (Partition: ${partition}) Received:`, messageValue);

                    // Simulate message processing
                    await new Promise((resolve) => setTimeout(resolve, 100));
                } catch (error) {
                    console.error(`❌ Error processing message on [${topic}] (Partition: ${partition}):`, error);
                }
            },
        });

        // Register valid event listeners
        consumer.on(consumer.events.REBALANCING, (event) => {
            console.log("🔄 Consumer rebalancing event:", JSON.stringify(event, null, 2));
        });

        consumer.on(consumer.events.HEARTBEAT, () => {
            console.log("💓 Consumer heartbeat sent.");
        });

        consumer.on(consumer.events.DISCONNECT, () => {
            console.log("⚠️ Consumer disconnected unexpectedly.");
        });

        consumer.on(consumer.events.REQUEST_TIMEOUT, (event) => {
            console.log("⏳ Network request timeout:", JSON.stringify(event, null, 2));
        });

    } catch (error) {
        console.error("❌ Kafka Consumer Error:", error);
        console.log("🔄 Restarting consumer in 5 seconds...");
        await consumer.disconnect(); // Cleanly disconnect before restarting
        setTimeout(runConsumer, 5000);
    }
};

// Graceful Shutdown
const shutdown = async () => {
    console.log("🔴 Stopping Kafka Consumer...");
    try {
        await consumer.stop();
        await consumer.disconnect();
        console.log("✅ Kafka Consumer disconnected.");
    } catch (err) {
        console.error("❌ Error during shutdown:", err);
    }
    process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

module.exports = runConsumer;