const { Kafka, logLevel } = require('kafkajs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const Minio = require('minio');
const fs = require('fs');
const { createTopicWithReplicationFactor } = require('./kafka-producer');

const kafka = new Kafka({
    clientId: 'user-behavior-consumer',
    brokers: ['kafka-service:9092'],
    logLevel: logLevel.WARN,
});

const consumer = kafka.consumer({ groupId: 'user-behavior-group' });

const csvFilePath = 'user_behavior_data.csv';

// ✅ CSV Writer Setup
const csvWriter = createCsvWriter({
    path: csvFilePath,
    header: [
        { id: 'sessionId', title: 'SessionId' },
        { id: 'SessionActionId', title: 'SessionActionId' },
        { id: 'user', title: 'User' },
        { id: 'product', title: 'Product' },
        { id: 'product_name', title: 'Product Name' },
        { id: 'behavior', title: 'Behavior' },
    ],
    append: fs.existsSync(csvFilePath),
});

// ✅ MinIO Configuration
const minioClient = new Minio.Client({
    endPoint: '103.155.161.94',
    port: 9000,
    useSSL: false,
    accessKey: 'minioadmin',
    secretKey: 'minioadmin',
});

const bucketName = 'user-behavior-bucket';

// ✅ Ensure MinIO Bucket Exists
async function ensureMinioBucket() {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
        await minioClient.makeBucket(bucketName);
        console.log(`✅ MinIO Bucket "${bucketName}" created`);
    } else {
        console.log(`✅ MinIO Bucket "${bucketName}" already exists`);
    }
}

// ✅ Upload CSV to MinIO
async function uploadToMinio() {
    try {
        await ensureMinioBucket();
        await minioClient.fPutObject(bucketName, csvFilePath, csvFilePath);
        console.log(`📤 CSV file uploaded to MinIO: ${csvFilePath}`);
    } catch (err) {
        console.error('❌ MinIO Upload Error:', err);
    }
}

// ✅ Ensure CSV Has a Header
async function ensureCsvHeader() {
    if (!fs.existsSync(csvFilePath) || fs.statSync(csvFilePath).size === 0) {
        console.log('📝 CSV file is missing or empty. Writing header row...');
        const headers = 'SessionId,SessionActionId,User,Product,Product Name,Behavior\n';
        fs.writeFileSync(csvFilePath, headers, 'utf8');
        console.log('✅ CSV header row written');
    }
}

// ✅ Ensure Kafka Topic Exists
async function ensureTopicReady(topic) {
    const admin = kafka.admin();
    await admin.connect();
    let retries = 5;
    while (retries > 0) {
        const topics = await admin.listTopics();
        if (topics.includes(topic)) {
            console.log(`✅ Topic "${topic}" exists`);
            break;
        }
        console.log(`⏳ Waiting for topic "${topic}" to be ready...`);
        await new Promise((res) => setTimeout(res, 2000));
        retries--;
    }
    if (retries === 0) {
        console.error(`❌ Topic "${topic}" not found after retries`);
    }
    await admin.disconnect();
}

// ✅ Start Kafka Consumer
async function startKafkaConsumer() {
    try {
        await createTopicWithReplicationFactor();
        await ensureTopicReady('user-behavior-topic');

        await consumer.connect();
        console.log('✅ Kafka consumer connected');

        await consumer.subscribe({ topic: 'user-behavior-topic', fromBeginning: true });
        console.log('✅ Subscribed to Kafka topic: user-behavior-topic');

        await ensureCsvHeader();

        const messageQueue = [];
        let processingQueue = false;

        async function processQueue() {
            if (processingQueue) return;
            processingQueue = true;

            while (messageQueue.length > 0) {
                const behaviorData = messageQueue.shift();
                try {
                    await csvWriter.writeRecords([behaviorData]);
                    console.log('✅ Data written to CSV:', behaviorData);
                    await uploadToMinio();
                } catch (err) {
                    console.error('❌ Error writing to CSV:', err);
                }
            }

            processingQueue = false;
        }

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                try {
                    if (!message.value) throw new Error('Empty message value');
                    const behaviorData = JSON.parse(message.value.toString());
                    messageQueue.push(behaviorData);
                    processQueue();
                    console.log('📩 Received message:', behaviorData);
                } catch (err) {
                    console.error('❌ Error processing message:', err.message);
                }
            },
        });

        consumer.on(consumer.events.GROUP_JOIN, () => {
            console.log('🔄 Consumer rebalancing...');
        });

        consumer.on('consumer.crash', (event) => {
            console.error('❌ Kafka consumer crashed:', event.payload);
        });

    } catch (err) {
        console.error('❌ Error starting Kafka consumer:', err);
    }
}

startKafkaConsumer().catch((err) => console.error('❌ Error starting Kafka consumer:', err));

module.exports = { startKafkaConsumer };
