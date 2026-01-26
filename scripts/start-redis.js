#!/usr/bin/env node
import { execSync, spawn } from 'child_process';
import { platform } from 'os';

const isWindows = platform() === 'win32';
const isWSL = !isWindows && process.env.WSL_DISTRO_NAME;

function runCommand(cmd, options = {}) {
  try {
    return execSync(cmd, { stdio: 'pipe', ...options }).toString().trim();
  } catch {
    return null;
  }
}

async function startRedis() {
  console.log('Starting Redis...');

  if (isWindows) {
    // Running from Windows - use WSL
    const ping = runCommand('wsl redis-cli ping');
    if (ping === 'PONG') {
      console.log('Redis already running');
      return;
    }
    
    runCommand('wsl -- bash -c "redis-server --bind 0.0.0.0 --daemonize yes"');
    
    // Verify
    const verify = runCommand('wsl redis-cli ping');
    if (verify === 'PONG') {
      console.log('Redis started successfully');
    } else {
      console.error('Failed to start Redis');
      process.exit(1);
    }
  } else {
    // Running from Linux/WSL - direct commands
    const ping = runCommand('redis-cli ping');
    if (ping === 'PONG') {
      console.log('Redis already running');
      return;
    }
    
    runCommand('redis-server --bind 0.0.0.0 --daemonize yes');
    
    const verify = runCommand('redis-cli ping');
    if (verify === 'PONG') {
      console.log('Redis started successfully');
    } else {
      console.error('Failed to start Redis');
      process.exit(1);
    }
  }
}

startRedis();
