#!/bin/bash
set -e

# Configuration
SERVER_IP="207.180.192.49"
SERVER_USER="root"
APP_DIR="/opt/finance-backend"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Copy SSH key to temp location with proper permissions (Windows filesystem has 0777)
SSH_KEY_TEMP="/tmp/finance-deploy-key-$$"
cp "$SCRIPT_DIR/ssh_key/id_rsa" "$SSH_KEY_TEMP"
chmod 600 "$SSH_KEY_TEMP"

# SSH options with key
SSH_OPTS="-i $SSH_KEY_TEMP -o StrictHostKeyChecking=no"

echo "=== Finance Backend Deployment ==="
echo "Server: $SERVER_USER@$SERVER_IP"
echo "Domain: api.0ec.ai"
echo ""

# Create temp directory for files to copy
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR $SSH_KEY_TEMP" EXIT

echo "Preparing files..."
cp "$PROJECT_DIR/package.json" "$TEMP_DIR/"
cp "$PROJECT_DIR/package-lock.json" "$TEMP_DIR/"
cp "$PROJECT_DIR/Dockerfile" "$TEMP_DIR/"
cp -r "$PROJECT_DIR/src/server" "$TEMP_DIR/src_server"
cp -r "$PROJECT_DIR/src/shared" "$TEMP_DIR/src_shared"
cp "$PROJECT_DIR/tsconfig.server.json" "$TEMP_DIR/"

mkdir -p "$TEMP_DIR/src"
mv "$TEMP_DIR/src_server" "$TEMP_DIR/src/server"
mv "$TEMP_DIR/src_shared" "$TEMP_DIR/src/shared"

# Copy config files to temp
cp "$SCRIPT_DIR/.env.production" "$TEMP_DIR/.env"
cp "$SCRIPT_DIR/nginx.conf" "$TEMP_DIR/"
cp "$SCRIPT_DIR/docker-compose.yml" "$TEMP_DIR/"
mkdir -p "$TEMP_DIR/cert"
cp "$SCRIPT_DIR/cert/orig.cert" "$SCRIPT_DIR/cert/origin.key" "$TEMP_DIR/cert/"

# Create app directory on server
echo "Connecting to server..."
ssh $SSH_OPTS "$SERVER_USER@$SERVER_IP" "mkdir -p $APP_DIR/src $APP_DIR/cert"

# Copy all files in one tar stream
echo "Copying files to server..."
tar -C "$TEMP_DIR" -cf - . | ssh $SSH_OPTS "$SERVER_USER@$SERVER_IP" "tar -C $APP_DIR -xf -"

# Build and run on server
echo "Building and restarting backend..."
ssh $SSH_OPTS "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
cd /opt/finance-backend

echo "Building Docker image..."
docker build -t finance-backend:latest .

# Ensure postgres and nginx are running (start if not)
docker compose up -d postgres nginx

# Restart only the backend container
echo "Restarting backend container..."
docker compose up -d --force-recreate --no-deps finance-backend

echo "Cleaning up old images..."
docker image prune -f

echo ""
echo "Container status:"
docker compose ps
ENDSSH

echo ""
echo "=== Deployment complete! ==="
echo "Backend is running at https://api.0ec.ai"
