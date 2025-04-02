const { Kafka, logLevel } = require("kafkajs");
require("dotenv").config();

// Map logLevel string to KafkaJS logLevel enum
const logLevelMap = {
    NOTHING: logLevel.NOTHING,
    ERROR: logLevel.ERROR,
    WARN: logLevel.WARN,
    INFO: logLevel.INFO,
    DEBUG: logLevel.DEBUG,
};

// Validate required environment variables
const validateEnvVars = (requiredVars) => {
    for (const envVar of requiredVars) {
        if (!process.env[envVar]) {
            throw new Error(`Missing required environment variable: ${envVar}`);
        }
    }
};

// Initialize Kafka client with common configuration
const initializeKafka = (clientType, defaultLogLevel = "INFO") => {
    const clientIdEnvVar = clientType === "producer" ? "KAFKA_PRODUCER_CLIENT_ID" : "KAFKA_CONSUMER_CLIENT_ID";
    validateEnvVars([clientIdEnvVar, "KAFKA_BROKERS", "KAFKA_LOG_LEVEL"]);

    const kafkaLogLevel = logLevelMap[process.env.KAFKA_LOG_LEVEL] || logLevelMap[defaultLogLevel];
    const kafkaBrokers = process.env.KAFKA_BROKERS.split(",").map(broker => broker.trim());

    const retryConfig = process.env.KAFKA_RETRY_INITIAL_TIME && process.env.KAFKA_RETRY_COUNT
        ? {
            initialRetryTime: parseInt(process.env.KAFKA_RETRY_INITIAL_TIME, 10),
            retries: parseInt(process.env.KAFKA_RETRY_COUNT, 10),
        }
        : undefined;

    return new Kafka({
        clientId: process.env[clientIdEnvVar],
        brokers: kafkaBrokers,
        logLevel: kafkaLogLevel,
        retry: retryConfig,
    });
};

module.exports = { validateEnvVars, initializeKafka };