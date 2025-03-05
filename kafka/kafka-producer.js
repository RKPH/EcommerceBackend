const { Kafka, logLevel } = require('kafkajs');

// Kafka setup
const kafka = new Kafka({
    clientId: 'user-behavior-producer',
    brokers: ['103.155.161.94:9092'],
    logLevel: logLevel.WARN,
});

const producer = kafka.producer();
const admin = kafka.admin();

const topic = 'user-behavior-topic';

// ✅ Create Kafka Topic
async function createTopic() {
    try {
        await admin.connect();
        console.log('✅ Connected to Kafka admin');

        const topics = await admin.listTopics();
        if (!topics.includes(topic)) {
            await admin.createTopics({
                topics: [{ topic, numPartitions: 1, replicationFactor: 1 }],
            });
            console.log(`✅ Topic "${topic}" created.`);
        } else {
            console.log(`✅ Topic "${topic}" already exists.`);
        }
    } catch (error) {
        console.error('❌ Error creating topic:', error);
    } finally {
        await admin.disconnect();
    }
}

// ✅ Send Data to Kafka
async function sendMessages() {
    try {
        await producer.connect();
        console.log('✅ Kafka producer connected');

        for (let i = 1; i <= 10; i++) {
            const message = {
                sessionId: `session-${i}`,
                SessionActionId: `action-${i}`,
                user: `user-${i}`,
                product: `product-${i}`,
                product_name: `Product ${i}`,
                behavior: 'view',
            };

            await producer.send({
                topic,
                messages: [{ value: JSON.stringify(message) }],
            });

            console.log(`📩 Sent message ${i}:`, message);
        }

        console.log('✅ All 10 messages sent');
    } catch (error) {
        console.error('❌ Error sending messages:', error);
    } finally {
        await producer.disconnect();
    }
}

// Run the producer
async function runProducer() {
    await createTopic();
    await sendMessages();
}

runProducer();
