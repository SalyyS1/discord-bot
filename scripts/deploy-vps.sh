#!/bin/bash
# Automated VPS Deployment Script
# Usage: ./scripts/deploy-vps.sh [SSH_HOST] [SSH_USER] [PROJECT_PATH]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Configuration
SSH_HOST="${1:-${VPS_HOST}}"
SSH_USER="${2:-${VPS_USER:-root}}"
PROJECT_PATH="${3:-${VPS_PROJECT_PATH:-/home/sylabot/sylabot}}"
SSH_KEY="${SSH_KEY:-}"

if [ -z "$SSH_HOST" ]; then
    log_error "SSH_HOST is required. Usage: $0 [SSH_HOST] [SSH_USER] [PROJECT_PATH]"
    exit 1
fi

log_step "Starting VPS deployment..."
log_info "Host: $SSH_HOST"
log_info "User: $SSH_USER"
log_info "Project Path: $PROJECT_PATH"

# Build SSH command
SSH_CMD="ssh"
if [ -n "$SSH_KEY" ]; then
    SSH_CMD="$SSH_CMD -i $SSH_KEY"
fi
SSH_CMD="$SSH_CMD $SSH_USER@$SSH_HOST"

# Step 1: Pull latest code
log_step "Step 1: Pulling latest code from repository..."
$SSH_CMD "cd $PROJECT_PATH && git pull origin main" || {
    log_error "Failed to pull code"
    exit 1
}

# Step 2: Install dependencies
log_step "Step 2: Installing dependencies..."
$SSH_CMD "cd $PROJECT_PATH && pnpm install" || {
    log_error "Failed to install dependencies"
    exit 1
}

# Step 3: Generate Prisma client
log_step "Step 3: Generating Prisma client..."
$SSH_CMD "cd $PROJECT_PATH && pnpm db:generate" || {
    log_warn "Prisma generate failed, continuing..."
}

# Step 4: Run database migrations
log_step "Step 4: Running database migrations..."
$SSH_CMD "cd $PROJECT_PATH && pnpm db:push" || {
    log_warn "Database migration failed, continuing..."
}

# Step 5: Build project
log_step "Step 5: Building project..."
$SSH_CMD "cd $PROJECT_PATH && pnpm build" || {
    log_error "Build failed"
    exit 1
}

# Step 6: Run tests
log_step "Step 6: Running tests..."
$SSH_CMD "cd $PROJECT_PATH && pnpm test 2>&1 || pnpm run test 2>&1 || echo 'No test script found'" || {
    log_warn "Tests failed or no test script found"
}

# Step 7: Restart PM2 services
log_step "Step 7: Restarting PM2 services..."
$SSH_CMD "cd $PROJECT_PATH && pm2 restart all" || {
    log_warn "PM2 restart failed, services may not be running"
}

# Step 8: Check service status
log_step "Step 8: Checking service status..."
$SSH_CMD "pm2 status"

log_info "Deployment completed!"
log_info "Check logs with: $SSH_CMD 'pm2 logs'"
