import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initWebSocketServer, shutdownWebSocketServer } from './src/lib/websocket/websocket-server';
import { subscribeToRedisEvents, unsubscribeFromRedisEvents } from './src/lib/redis/dashboard-redis-event-subscriber';
import { logger } from './src/lib/logger';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url || '/', true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      const error = err as Error;
      logger.error('Error handling request:', { message: error.message, stack: error.stack });
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // Initialize WebSocket server
  initWebSocketServer(server);

  // Subscribe to Redis events from bot
  subscribeToRedisEvents();

  server.listen(port, () => {
    logger.info(`Server ready on http://${hostname}:${port}`);
    logger.info(`WebSocket server ready on ws://${hostname}:${port}/api/ws`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down server...');

    shutdownWebSocketServer();
    await unsubscribeFromRedisEvents();

    server.close(() => {
      logger.info('Server shut down');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.warn('Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
});
