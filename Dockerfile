# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY tsconfig*.json ./
COPY src/server ./src/server
COPY src/shared ./src/shared

# Build the server
RUN npm run build:server

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built server and shared modules from builder stage
COPY --from=builder /app/dist/server ./dist/server
COPY --from=builder /app/dist/shared ./dist/shared

# Expose port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
