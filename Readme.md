# Node.js Application

Welcome to the Node.js Application! This project is a Dockerized Node.js application that integrates with MongoDB, Cloudinary, MinIO, Kafka, Jina AI, Qdrant, and SendGrid for a robust backend solution. This README guides you through setup, configuration, and running the application.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Clone the Repository](#clone-the-repository)
  - [Configure Environment Variables](#configure-environment-variables)
  - [Build and Run with Docker](#build-and-run-with-docker)
  - [Running Locally (Without Docker)](#running-locally-without-docker)
- [Project Structure](#project-structure)
- [Services and Integrations](#services-and-integrations)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Prerequisites

Ensure you have the following installed:

- [Docker](https://www.docker.com/get-started) for containerization
- [Node.js](https://nodejs.org/) (version 18 LTS) for local development
- [npm](https://www.npmjs.com/) (included with Node.js)
- Accounts and API keys for:
  - MongoDB (e.g., MongoDB Atlas)
  - Cloudinary
  - MinIO
  - Jina AI
  - Apache Kafka
  - Qdrant
  - SendGrid

## Getting Started

### Clone the Repository

Clone the repository to your local machine:

```bash
git clone https://github.com/RKPH/EcommerceBackend.git
cd EcommerceBackend
```

### Configure Environment Variables

The application requires a `.env` file to manage sensitive configurations like database credentials and API keys. Follow these steps:

1. **Create a `.env` file** in the project root.
2. **Add the required variables** using the template below. Replace placeholder comments with your actual values.
3. **Secure the file** by adding `.env` to `.gitignore` to prevent it from being committed.

**`.env` Template**:

```env
# MongoDB Configuration
DB_USER=Your MongoDB username
DB_PASSWORD=Your MongoDB password
DB_NAME=Your database name
DB_HOST=Your MongoDB host (e.g., cluster0.sewnv.mongodb.net)

# JWT Configuration
JWT_SECRET=Your JWT secret key
JWT_REFRESH_SECRET=Your JWT refresh secret key

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=Your Cloudinary cloud name
CLOUDINARY_API_KEY=Your Cloudinary API key
CLOUDINARY_API_SECRET=Your Cloudinary API secret

# MinIO Configuration
MINIO_ENDPOINT=Your MinIO endpoint
MINIO_USE_SSL=true or false
MINIO_ACCESS_KEY=Your MinIO access key
MINIO_SECRET_KEY=Your MinIO secret key
MINIO_BUCKET_NAME=Your MinIO bucket name

# Jina AI Configuration
JINA_API_KEY=Your Jina AI API key
JINA_ENDPOINT=Your Jina AI endpoint (e.g., https://api.jina.ai/v1/embeddings)
MODEL=Your Jina model name (e.g., jina-embeddings-v3)
TARGET_DIMENSION=Your target dimension (e.g., 128)

# Kafka Configuration (Common)
KAFKA_CONSUMER_CLIENT_ID=Your Kafka consumer client ID
KAFKA_PRODUCER_CLIENT_ID=Your Kafka producer client ID
KAFKA_BROKERS=Your Kafka broker addresses (e.g., kafka:29092)
KAFKA_LOG_LEVEL=Your Kafka log level (e.g., DEBUG)
KAFKA_RETRY_INITIAL_TIME=Initial retry time in milliseconds (e.g., 300)
KAFKA_RETRY_COUNT=Number of retries (e.g., 10)

# Kafka Consumer Configuration
KAFKA_CONSUMER_GROUP_ID=Your Kafka consumer group ID
KAFKA_CONSUMER_SESSION_TIMEOUT=Session timeout in milliseconds (e.g., 45000)
KAFKA_CONSUMER_HEARTBEAT_INTERVAL=Heartbeat interval in milliseconds (e.g., 3000)
KAFKA_CONSUMER_MAX_POLL_INTERVAL=Max poll interval in milliseconds (e.g., 600000)
KAFKA_CONSUMER_REBALANCE_TIMEOUT=Rebalance timeout in milliseconds (e.g., 60000)
KAFKA_CONSUMER_RETRY_COUNT=Consumer retry count (e.g., 10)
KAFKA_CONSUMER_RESTART_DELAY=Restart delay in milliseconds (e.g., 5000)

# Kafka Topic Configuration
KAFKA_TOPIC_RETENTION_MS=Topic retention period in milliseconds (e.g., 2419200000)
KAFKA_TOPIC_NUM_PARTITIONS=Number of topic partitions (e.g., 3)
KAFKA_TOPIC_REPLICATION_FACTOR=Replication factor (e.g., 1)

# AI Service Configuration
AI_API_BASE_URL=Your AI service base URL (e.g., https://ai.d2f.io.vn)

# Qdrant Configuration
QDRANT_API_URL=Your Qdrant API URL (e.g., https://qdrant.d2f.io.vn/collections/test_v2/points)

# SendGrid Configuration
SENDGRID_API_KEY=Your SendGrid API key
```

### Build and Run with Docker

1. **Build the Docker image**:

   ```bash
   docker build -t backend .
   ```

2. **Run the container**:

   ```bash
   docker run --env-file .env -p 3000:3000 backend
   ```

   - `--env-file .env` loads environment variables.
   - `-p 3000:3000` maps port 3000.

3. **Access the application** at `http://localhost:3000`.

### Running Locally (Without Docker)

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Ensure the `.env` file is configured**.

3. **Start the application**:

   ```bash
   npm start
   ```

4. **Access the application** at `http://localhost:3000`.

## Project Structure

- `Dockerfile`: Defines the Docker image.
- `.env`: Environment variables (create as described above).
- `package.json`: Project dependencies and scripts.
- `src/`: Application source code.

## Services and Integrations

The application integrates with:

- **MongoDB**: Data storage (`DB_*` variables).
- **Cloudinary**: Image management (`CLOUDINARY_*` variables).
- **MinIO**: Object storage (`MINIO_*` variables).
- **Jina AI**: Embeddings (`JINA_*` variables).
- **Kafka**: Event streaming (`KAFKA_*` variables).
- **Qdrant**: Vector search (`QDRANT_*` variables).
- **SendGrid**: Email services (`SENDGRID_API_KEY`).

Ensure valid credentials and service accessibility.

## Troubleshooting

- **Port conflicts**: Use a different port (e.g., `-p 8080:3000`).
- **Environment variables**: Verify all variables are set correctly.
- **Service connectivity**: Ensure services (MongoDB, Kafka, etc.) are accessible.
- **Docker issues**: Check logs with `docker logs <container-id>`.

## Contributing

1. Fork the repository.
2. Create a branch (`git checkout -b feature/your-feature`).
3. Commit changes (`git commit -m "Add your feature"`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a pull request.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

---

Happy coding! For issues or questions, open an issue in the repository.
