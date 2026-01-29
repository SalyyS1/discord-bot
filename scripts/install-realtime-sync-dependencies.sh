#!/bin/bash

# Phase 3: Install Real-time Sync Dependencies

echo "Installing real-time sync dependencies..."

cd /mnt/d/Project/.2_PROJECT_BOT_DISCORD

# Install zustand for dashboard state management
echo "Installing zustand..."
pnpm add zustand --filter @repo/dashboard

# Install ws for WebSocket server
echo "Installing ws and types..."
pnpm add ws --filter @repo/dashboard
pnpm add -D @types/ws --filter @repo/dashboard

echo "✓ Dependencies installed successfully"
echo ""
echo "Next steps:"
echo "1. Update dashboard package.json dev script to use custom server"
echo "2. Run type check: pnpm typecheck"
echo "3. Test the implementation"
