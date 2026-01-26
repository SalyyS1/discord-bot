import { mkdirSync } from 'fs';
import winston from 'winston';
import { config } from '../config/index.js';

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  })
);

export const logger = winston.createLogger({
  level: config.logLevel,
  format,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), format),
    }),
  ],
});

if (config.isProd) {
  mkdirSync('logs', { recursive: true });
  logger.add(
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' })
  );
  logger.add(new winston.transports.File({ filename: 'logs/combined.log' }));
}
