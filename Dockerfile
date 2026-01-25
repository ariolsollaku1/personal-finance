# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY tsconfig*.json ./
COPY src/server ./src/server

# Build the server
RUN npm run build:server

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built server from builder stage
COPY --from=builder /app/dist/server ./dist/server

# Expose port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
