# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app/api_gateway

# Copy package.json and package-lock.json (if any)
COPY api_gateway/package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application code
COPY api_gateway/ .

# Expose the port the app runs on
EXPOSE 8080

# Define the command to run the app
CMD ["node", "src/server.js"]
