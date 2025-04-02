const { validateEnvVars, initializeKafka } = require("./kafka-config");
require("dotenv").config(); // Load environment variables from .env file
const producerRequiredEnvVars = [
    "KAFKA_TOPIC_RETENTION_MS",
    "KAFKA_TOPIC_NUM_PARTITIONS",
    "KAFKA_TOPIC_REPLICATION_FACTOR",
];

// Validate producer-specific environment variables
validateEnvVars(producerRequiredEnvVars);

// Initialize Kafka client
const kafka = initializeKafka("producer", "INFO");

const admin = kafka.admin();
const producer = kafka.producer();

const RETENTION_MS = parseInt(process.env.KAFKA_TOPIC_RETENTION_MS, 10);

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
                        numPartitions: parseInt(process.env.KAFKA_TOPIC_NUM_PARTITIONS, 10),
                        replicationFactor: parseInt(process.env.KAFKA_TOPIC_REPLICATION_FACTOR, 10),
                        configEntries: [
                            { name: "retention.ms", value: RETENTION_MS.toString() },
                        ],
                    },
                ],
            });
            console.log(`✅ Kafka topic [${topic}] created with retention of ${RETENTION_MS}ms.`);
        } else {
            console.log(`✅ Kafka topic [${topic}] already exists. Checking retention settings...`);
            await updateTopicRetention(topic);
        }
    } catch (error) {
        console.error(`❌ Kafka Admin Error: ${error.message}`);
    } finally {
        await admin.disconnect();
    }
};

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
            console.log(`📝 Updating retention for topic [${topic}] to ${RETENTION_MS}ms...`);
            await admin.alterConfigs({
                resources: [
                    {
                        resourceType: 2, // 2 = TOPIC
                        resourceName: topic,
                        configEntries: [{ name: "retention.ms", value: RETENTION_MS.toString() }],
                    },
                ],
            });
            console.log(`✅ Retention for topic [${topic}] updated to ${RETENTION_MS}ms.`);
        } else {
            console.log(`✅ Topic [${topic}] already has retention set to ${RETENTION_MS}ms.`);
        }
    } catch (error) {
        console.error(`❌ Error updating retention for topic [${topic}]: ${error.message}`);
    } finally {
        await admin.disconnect();
    }
};

const connectProducer = async () => {
    try {
        await producer.connect();
        console.log("✅ Kafka Producer connected.");

        producer.on(producer.events.CONNECT, () => {
            console.log("✅ Producer successfully connected to broker.");
        });

        producer.on(producer.events.DISCONNECT, async () => {
            console.log("⚠️ Producer disconnected unexpectedly. Attempting to reconnect...");
            await producer.connect().catch((err) => console.error(`❌ Reconnect failed: ${err.message}`));
        });

        producer.on(producer.events.REQUEST_TIMEOUT, (event) => {
            console.log(`⏳ Network request timeout: ${JSON.stringify(event, null, 2)}`);
        });

    } catch (error) {
        console.error(`❌ Kafka Producer Connection Error: ${error.message}`);
    }
};

const sendMessage = async (topic, message) => {
    try {
        await createTopicIfNotExists(topic);
        await producer.send({
            topic,
            messages: [{ value: JSON.stringify(message) }],
        });
        console.log(`📤 Sent message to Kafka topic [${topic}]: ${JSON.stringify(message)}`);
    } catch (error) {
        console.error(`❌ Error sending message to Kafka: ${error.message}`);
    }
};

const shutdown = async () => {
    console.log("🔴 Disconnecting Kafka Producer...");
    try {
        await producer.disconnect();
        console.log("✅ Kafka Producer disconnected.");
        process.exit(0);
    } catch (err) {
        console.error(`❌ Error during shutdown: ${err.message}`);
        process.exit(1);
    }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

module.exports = { connectProducer, sendMessage };