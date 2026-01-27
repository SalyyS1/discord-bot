# SylaBot VPS Deployment Guide

## Overview

Hướng dẫn deploy SylaBot platform lên VPS sau khi code xong.

---

## Prerequisites

### Required Software
```bash
# Node.js 18+ (recommend 20 LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# pnpm
npm install -g pnpm

# PM2 (process manager)
npm install -g pm2

# PostgreSQL 15+
sudo apt install postgresql postgresql-contrib

# Redis 7+
sudo apt install redis-server

# Nginx (reverse proxy)
sudo apt install nginx

# Git
sudo apt install git
```

---

## Step 1: Clone Repository

```bash
cd /home/sylabot
git clone https://github.com/YOUR_REPO/sylabot.git
cd sylabot
git checkout main
```

---

## Step 2: Setup Environment

### Create `.env` file
```bash
cp .env.example .env
nano .env
```

### Required Environment Variables
```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://sylabot:YOUR_PASSWORD@localhost:5432/sylabot?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# Discord OAuth
DISCORD_CLIENT_ID="your_client_id"
DISCORD_CLIENT_SECRET="your_client_secret"

# Bot Token (encrypted)
DISCORD_BOT_TOKEN="your_encrypted_token"

# Encryption Key (32 bytes hex)
ENCRYPTION_KEY="your_32_byte_hex_key"

# Auth Secret (random 32+ chars)
AUTH_SECRET="your_auth_secret"

# Dashboard URL
NEXTAUTH_URL="https://dashboard.sylabot.io"
NEXT_PUBLIC_APP_URL="https://dashboard.sylabot.io"
```

---

## Step 3: Create PostgreSQL Database

```bash
# Login as postgres
sudo -u postgres psql

# Create user and database
CREATE USER sylabot WITH PASSWORD 'YOUR_STRONG_PASSWORD';
CREATE DATABASE sylabot OWNER sylabot;
GRANT ALL PRIVILEGES ON DATABASE sylabot TO sylabot;
\q
```

---

## Step 4: Install Dependencies & Build

```bash
# Install all dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:push

# Build all packages
pnpm build
```

---

## Step 5: Start with PM2

### Create PM2 ecosystem file
```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'sylabot-dashboard',
      script: 'pnpm',
      args: '--filter @repo/dashboard start',
      cwd: '/home/sylabot/sylabot',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'sylabot-bot',
      script: 'pnpm',
      args: '--filter @repo/bot start',
      cwd: '/home/sylabot/sylabot',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'sylabot-manager',
      script: 'pnpm',
      args: '--filter @repo/manager start',
      cwd: '/home/sylabot/sylabot',
      env: {
        NODE_ENV: 'production',
        MANAGER_PORT: 3001,
      },
    },
  ],
};
```

### Start all services
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## Step 6: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/sylabot
```

```nginx
# Dashboard
server {
    listen 80;
    server_name dashboard.sylabot.io;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Manager API (internal only)
server {
    listen 80;
    server_name manager.sylabot.io;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/sylabot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 7: SSL with Certbot

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificates
sudo certbot --nginx -d dashboard.sylabot.io

# Auto-renew
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## Step 8: Verify Deployment

### Check service status
```bash
pm2 status
pm2 logs sylabot-bot --lines 50
pm2 logs sylabot-dashboard --lines 50
```

### Test endpoints
```bash
# Dashboard
curl -I https://dashboard.sylabot.io

# Health check (if implemented)
curl https://dashboard.sylabot.io/api/health
```

---

## Common Commands

### Update Code
```bash
cd /home/sylabot/sylabot
git pull origin main
pnpm install
pnpm build
pm2 restart all
```

### View Logs
```bash
pm2 logs sylabot-bot
pm2 logs sylabot-dashboard
pm2 logs sylabot-manager
```

### Restart Services
```bash
pm2 restart all
pm2 restart sylabot-bot
pm2 restart sylabot-dashboard
```

### Database Operations
```bash
# Backup database
pg_dump -U sylabot sylabot > backup_$(date +%Y%m%d).sql

# Restore database
psql -U sylabot sylabot < backup.sql

# Push schema changes
pnpm db:push
```

### Redis Operations
```bash
# Check Redis status
redis-cli ping

# Flush cache (careful!)
redis-cli FLUSHALL
```

---

## Troubleshooting

### Bot not starting
```bash
# Check logs
pm2 logs sylabot-bot --lines 100

# Verify token encryption
node -e "console.log(require('@repo/security').getEncryptionService().decrypt('YOUR_TOKEN'))"
```

### Dashboard not accessible
```bash
# Check Nginx
sudo nginx -t
sudo systemctl status nginx

# Check Next.js
pm2 logs sylabot-dashboard
```

### Database connection issues
```bash
# Test connection
psql -U sylabot -d sylabot -h localhost

# Check Prisma
cd apps/dashboard
npx prisma db push --force-reset  # WARNING: Clears data!
```

---

## Security Checklist

- [ ] Change default PostgreSQL password
- [ ] Enable UFW firewall
- [ ] Disable root SSH login
- [ ] Set up fail2ban
- [ ] Enable HTTPS only
- [ ] Keep system updated

```bash
# Basic firewall setup
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## Quick Reference

| Service | Port | PM2 Name |
|---------|------|----------|
| Dashboard | 3000 | sylabot-dashboard |
| Bot | - | sylabot-bot |
| Manager | 3001 | sylabot-manager |
| PostgreSQL | 5432 | - |
| Redis | 6379 | - |
