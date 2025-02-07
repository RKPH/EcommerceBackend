# Use the official Node.js image as the base image
FROM node:16-slim

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose the application's port
EXPOSE 3000

# Load environment variables (if using Docker Compose, this will be handled there)
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
