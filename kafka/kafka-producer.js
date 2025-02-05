const { Kafka, logLevel } = require('kafkajs');

// Kafka setup
const kafka = new Kafka({
    clientId: 'user-behavior-producer',
    brokers: ['kafka-service:9092'],
    logLevel: logLevel.WARN,
});

const producer = kafka.producer();
const admin = kafka.admin();

// ✅ Create Kafka Topic
async function createTopicWithReplicationFactor() {
    try {
        await admin.connect();
        console.log('✅ Connected to Kafka admin');

        const topics = await admin.listTopics();
        if (!topics.includes('user-behavior-topic')) {
            await admin.createTopics({
                topics: [
                    {
                        topic: 'user-behavior-topic',
                        numPartitions: 1,
                        replicationFactor: 1,
                    },
                ],
            });
            console.log('✅ Topic "user-behavior-topic" created successfully.');
        } else {
            console.log('✅ Topic "user-behavior-topic" already exists.');
        }
    } catch (error) {
        console.error('❌ Error creating or verifying topic:', error);
    } finally {
        await admin.disconnect();
    }
}

// ✅ Send Data to Kafka
async function sendToKafka(trackingData) {
    try {
        await producer.connect();
        await producer.send({
            topic: 'user-behavior-topic',
            messages: [{ value: JSON.stringify(trackingData) }],
        });
        console.log('📩 Message sent:', JSON.stringify(trackingData));
    } catch (error) {
        console.error('❌ Error sending to Kafka:', error);
    }
}

// Ensure the topic exists before sending messages
createTopicWithReplicationFactor();

module.exports = { sendToKafka, createTopicWithReplicationFactor };
