const { Kafka, logLevel } = require("kafkajs");

const kafka = new Kafka({
    clientId: "ecommerce-app",
    brokers: ["kafka.d2f.io.vn:9092"], // Update with your actual broker
    logLevel: logLevel.INFO,
});

const admin = kafka.admin();
const producer = kafka.producer();

// Retention period: 4 weeks = 28 days = 28 * 24 * 60 * 60 * 1000 milliseconds
const RETENTION_MS = 28 * 24 * 60 * 60 * 1000; // 2,419,200,000 ms

const createTopicIfNotExists = async (topic) => {
    try {
        await admin.connect();
        const topics = await admin.listTopics();

        if (!topics.includes(topic)) {
            console.log(`📌 Creating Kafka topic: ${topic}`);
            await admin.createTopics({
                topics: [
                    {
                        topic,
                        numPartitions: 3,
                        replicationFactor: 1,
                        configEntries: [
                            { name: "retention.ms", value: RETENTION_MS.toString() }, // Set retention to 4 weeks
                        ],
                    },
                ],
            });
            console.log(`✅ Kafka topic [${topic}] created with retention of 4 weeks.`);
        } else {
            console.log(`✅ Kafka topic [${topic}] already exists. Checking retention settings...`);
            // Optionally update retention for existing topic
            await updateTopicRetention(topic);
        }
    } catch (error) {
        console.error("❌ Kafka Admin Error:", error);
    } finally {
        await admin.disconnect();
    }
};

// Function to update retention for an existing topic
const updateTopicRetention = async (topic) => {
    try {
        await admin.connect();
        const topicConfig = await admin.describeConfigs({
            resources: [{ resourceType: 2, resourceName: topic }], // 2 = TOPIC
        });

        const currentRetention = topicConfig.resources[0].configEntries.find(
            (entry) => entry.name === "retention.ms"
        );

        if (currentRetention && currentRetention.value !== RETENTION_MS.toString()) {
            console.log(`📝 Updating retention for topic [${topic}] to 4 weeks...`);
            await admin.alterConfigs({
                resources: [
                    {
                        resourceType: 2, // 2 = TOPIC
                        resourceName: topic,
                        configEntries: [{ name: "retention.ms", value: RETENTION_MS.toString() }],
                    },
                ],
            });
            console.log(`✅ Retention for topic [${topic}] updated to 4 weeks.`);
        } else {
            console.log(`✅ Topic [${topic}] already has retention set to 4 weeks.`);
        }
    } catch (error) {
        console.error(`❌ Error updating retention for topic [${topic}]:`, error);
    } finally {
        await admin.disconnect();
    }
};

const connectProducer = async () => {
    try {
        await producer.connect();
        console.log("✅ Kafka Producer connected.");
    } catch (error) {
        console.error("❌ Kafka Producer Connection Error:", error);
    }
};

const sendMessage = async (topic, message) => {
    try {
        await createTopicIfNotExists(topic);
        await producer.send({
            topic,
            messages: [{ value: JSON.stringify(message) }],
        });
        console.log(`📤 Sent message to Kafka topic [${topic}]:`, message);
    } catch (error) {
        console.error("❌ Error sending message to Kafka:", error);
    }
};

process.on("SIGINT", async () => {
    console.log("🔴 Disconnecting Kafka Producer...");
    await producer.disconnect();
    process.exit(0);
});

module.exports = { connectProducer, sendMessage };