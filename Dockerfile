# Use official Node.js runtime
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application source
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose server port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]