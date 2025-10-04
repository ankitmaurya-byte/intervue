# Multi-stage build for production
FROM node:18-alpine as builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm install
RUN cd server && npm install
RUN cd client && npm install

# Copy source code
COPY . .

# Build client
RUN cd client && npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy server files
COPY server/package*.json ./
RUN npm install --only=production

# Copy built client and server code
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/build ./client/build

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "server/index.js"]
