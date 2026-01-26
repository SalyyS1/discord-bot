/**
 * Dashboard Health Check Endpoint
 * GET /api/health - Returns health status of the dashboard
 */

import { NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import Redis from 'ioredis';

// Create a separate Redis connection for health checks
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;

  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: true,
    });
  }
  return redis;
}

interface HealthCheck {
  name: string;
  status: 'ok' | 'error';
  latency?: number;
  error?: string;
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { name: 'database', status: 'ok', latency: Date.now() - start };
  } catch (error) {
    return {
      name: 'database',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkRedis(): Promise<HealthCheck> {
  const redisClient = getRedis();
  if (!redisClient) {
    return { name: 'redis', status: 'ok', latency: 0 }; // Redis is optional
  }

  const start = Date.now();
  try {
    await redisClient.ping();
    return { name: 'redis', status: 'ok', latency: Date.now() - start };
  } catch (error) {
    return {
      name: 'redis',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function GET() {
  const checks = await Promise.all([checkDatabase(), checkRedis()]);

  // Database is required, Redis is optional
  const databaseCheck = checks.find((c) => c.name === 'database');
  const isHealthy = databaseCheck?.status === 'ok';

  const response = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks: checks.reduce(
      (acc, check) => {
        acc[check.name] = {
          status: check.status,
          latency: check.latency,
          ...(check.error && { error: check.error }),
        };
        return acc;
      },
      {} as Record<string, { status: string; latency?: number; error?: string }>
    ),
  };

  return NextResponse.json(response, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
