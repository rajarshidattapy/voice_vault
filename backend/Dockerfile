FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy backend files
COPY backend/ ./

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]

