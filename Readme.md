Node.js Application
This is a Node.js application designed to run in a Docker container, utilizing MongoDB for data storage, Cloudinary for image management, MinIO for object storage, Kafka for event streaming, Jina AI for embeddings, Qdrant for vector search, and SendGrid for email services. This README provides instructions on how to set up, configure, and run the application.
Prerequisites
Before running the application, ensure you have the following installed:

Docker (to build and run the container)
Node.js (version 18 LTS, if running locally without Docker)
npm (Node package manager, included with Node.js)
Accounts and API keys for the following services:
MongoDB (e.g., MongoDB Atlas)
Cloudinary
MinIO
Jina AI
Apache Kafka
Qdrant
SendGrid



Getting Started
1. Clone the Repository
Clone this repository to your local machine:
git clone <repository-url>
cd <repository-directory>

2. Configure Environment Variables
The application requires environment variables to be defined in a .env file in the root directory of the project. This file contains sensitive configuration details, such as database credentials, API keys, and service endpoints. Follow these steps to create the .env file:

Create the .env file:In the project root, create a file named .env.

Add the required variables:Copy the template below into the .env file and replace the placeholder comments with your actual values (e.g., API keys, database credentials). Do not share this file publicly or commit it to version control.
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


Secure the .env file:

Add .env to your .gitignore file to prevent it from being committed to version control.
Ensure only authorized users have access to the .env file, as it contains sensitive information.



3. Build and Run with Docker
The application is containerized using Docker. Follow these steps to build and run the application:

Build the Docker image:
docker build -t my-node-app .


Run the Docker container:
docker run --env-file .env -p 3000:3000 my-node-app


The --env-file .env flag loads the environment variables from the .env file.
The -p 3000:3000 flag maps port 3000 on the host to port 3000 in the container.


Access the application:
Once the container is running, the application will be available at http://localhost:3000.


4. Running Locally (Without Docker)
If you prefer to run the application locally without Docker, follow these steps:

Install dependencies:
npm install


Ensure the .env file is configured as described above.

Start the application:
npm start


Access the application at http://localhost:3000.


5. Project Structure
Here’s an overview of the key files and directories:

Dockerfile: Defines the Docker image configuration for the application.
.env: Contains environment variables (not included in the repository; create it as described above).
package.json: Lists project dependencies and scripts.
src/: Contains the application source code (ensure this directory exists with your application logic).

6. Services and Integrations
This application integrates with several external services. Ensure you have valid credentials and that the services are accessible:

MongoDB: Used for data storage. Configure the connection using DB_* variables.
Cloudinary: Handles image uploads and management. Configure with CLOUDINARY_* variables.
MinIO: Provides object storage for images. Configure with MINIO_* variables.
Jina AI: Generates embeddings for AI tasks. Configure with JINA_* variables.
Kafka: Manages event streaming for user behavior data. Configure with KAFKA_* variables.
Qdrant: Provides vector search capabilities. Configure with QDRANT_* variables.
SendGrid: Handles email sending. Configure with SENDGRID_API_KEY.

7. Troubleshooting

Port conflicts: If port 3000 is in use, modify the docker run command to map a different host port (e.g., -p 8080:3000).
Environment variables: Ensure all required variables are set in the .env file and that sensitive values (e.g., API keys) are correct.
Service connectivity: Verify that external services (MongoDB, Kafka, etc.) are running and accessible from your network.
Docker issues: If the container fails to start, check the logs with docker logs <container-id>.

8. Contributing
If you’d like to contribute to this project, please:

Fork the repository.
Create a new branch (git checkout -b feature/your-feature).
Make your changes and commit them (git commit -m "Add your feature").
Push to your branch (git push origin feature/your-feature).
Open a pull request.

9. License
This project is licensed under the MIT License. See the LICENSE file for details.

Happy coding! If you encounter any issues or have questions, feel free to open an issue in the repository.
