const { validateEnvVars, initializeKafka } = require("./kafka-config");
require("dotenv").config(); // Load environment variables from .env file

const consumerRequiredEnvVars = [
    "KAFKA_CONSUMER_GROUP_ID",
    "KAFKA_CONSUMER_SESSION_TIMEOUT",
    "KAFKA_CONSUMER_HEARTBEAT_INTERVAL",
    "KAFKA_CONSUMER_MAX_POLL_INTERVAL",
    "KAFKA_CONSUMER_REBALANCE_TIMEOUT",
    "KAFKA_CONSUMER_RETRY_COUNT",
    "KAFKA_CONSUMER_RESTART_DELAY",
];

// Validate consumer-specific environment variables
validateEnvVars(consumerRequiredEnvVars);

// Initialize Kafka client
const kafka = initializeKafka("consumer", "DEBUG");

const consumer = kafka.consumer({
    groupId: process.env.KAFKA_CONSUMER_GROUP_ID,
    sessionTimeout: parseInt(process.env.KAFKA_CONSUMER_SESSION_TIMEOUT, 10),
    heartbeatInterval: parseInt(process.env.KAFKA_CONSUMER_HEARTBEAT_INTERVAL, 10),
    maxPollInterval: parseInt(process.env.KAFKA_CONSUMER_MAX_POLL_INTERVAL, 10),
    rebalanceTimeout: parseInt(process.env.KAFKA_CONSUMER_REBALANCE_TIMEOUT, 10),
    retry: { retries: parseInt(process.env.KAFKA_CONSUMER_RETRY_COUNT, 10) },
});

const runConsumer = async () => {
    try {
        await consumer.connect();
        console.log("✅ Kafka Consumer connected.");

        await consumer.subscribe({ topic: "user-behavior-events", fromBeginning: false });
        console.log("✅ Subscribed to topic: user-behavior-events");

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                try {
                    const messageValue = message.value.toString();
                    console.log(`📥 [${topic}] (Partition: ${partition}) Received: ${messageValue}`);
                    await new Promise((resolve) => setTimeout(resolve, 100));
                } catch (error) {
                    console.error(`❌ Error processing message on [${topic}] (Partition: ${partition}): ${error.message}`);
                }
            },
        });

        consumer.on(consumer.events.CONNECT, () => {
            console.log("✅ Consumer successfully connected to broker.");
        });

        consumer.on(consumer.events.REBALANCING, (event) => {
            console.log(`🔄 Consumer rebalancing event: ${JSON.stringify(event, null, 2)}`);
        });

        consumer.on(consumer.events.HEARTBEAT, () => {
            console.log("💓 Consumer heartbeat sent.");
        });

        consumer.on(consumer.events.DISCONNECT, async () => {
            console.log("⚠️ Consumer disconnected unexpectedly. Attempting to reconnect...");
            await consumer.connect().catch((err) => console.error(`❌ Reconnect failed: ${err.message}`));
        });

        consumer.on(consumer.events.REQUEST_TIMEOUT, (event) => {
            console.log(`⏳ Network request timeout: ${JSON.stringify(event, null, 2)}`);
        });

    } catch (error) {
        console.error(`❌ Kafka Consumer Error: ${error.message}`);
        console.log(`🔄 Restarting consumer in ${process.env.KAFKA_CONSUMER_RESTART_DELAY}ms...`);
        await consumer.disconnect();
        setTimeout(runConsumer, parseInt(process.env.KAFKA_CONSUMER_RESTART_DELAY, 10));
    }
};

const shutdown = async () => {
    console.log("🔴 Stopping Kafka Consumer...");
    try {
        await consumer.stop();
        await consumer.disconnect();
        console.log("✅ Kafka Consumer disconnected.");
        process.exit(0);
    } catch (err) {
        console.error(`❌ Error during shutdown: ${err.message}`);
        process.exit(1);
    }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

module.exports = runConsumer;