// PM2 Ecosystem Configuration
// Use tsx for TypeScript runtime (monorepo-compatible)
module.exports = {
  apps: [
    {
      name: 'bot',
      script: 'node_modules/.bin/tsx',
      args: 'src/index.ts',
      cwd: './apps/bot',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
      },
      // Restart settings
      max_restarts: 10,
      restart_delay: 5000,
      exp_backoff_restart_delay: 100,
      // Logging
      error_file: '/root/.pm2/logs/bot-error.log',
      out_file: '/root/.pm2/logs/bot-out.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'dashboard',
      script: 'pnpm',
      args: 'start',
      cwd: './apps/dashboard',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Restart settings
      max_restarts: 10,
      restart_delay: 5000,
      // Logging
      error_file: '/root/.pm2/logs/dashboard-error.log',
      out_file: '/root/.pm2/logs/dashboard-out.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'manager',
      script: 'node_modules/.bin/tsx',
      args: 'src/index.ts',
      cwd: './apps/manager',
      interpreter: 'none',
      env_file: '../.env',
      env: {
        NODE_ENV: 'production',
        MANAGER_PORT: 3001,
      },
      // Restart settings
      max_restarts: 10,
      restart_delay: 5000,
      // Logging
      error_file: '/root/.pm2/logs/manager-error.log',
      out_file: '/root/.pm2/logs/manager-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
