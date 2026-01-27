/**
 * REST API for Bot Manager
 * 
 * Internal API for controlling bot instances.
 * Not exposed publicly - used by dashboard.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { BotSpawner } from './spawner.js';
import { HealthMonitor } from './health.js';
import { prisma } from '@repo/database';
import { ApiResponse, BotStatusResponse, BotListResponse } from './types.js';

// Request interface with typed params
interface TenantParams {
  tenantId: string;
}

// Build database URL with tenant schema
function buildTenantDatabaseUrl(tenantId: string): string {
  const baseUrl = process.env.DATABASE_URL || '';
  const url = new URL(baseUrl);
  url.searchParams.set('schema', `tenant_${tenantId}`);
  return url.toString();
}

export function createApi(spawner: BotSpawner, healthMonitor: HealthMonitor): express.Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Error handler with generic param types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const asyncHandler = <P = any>(fn: (req: Request<P>, res: Response) => Promise<void>) => {
    return (req: Request<P>, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res)).catch(next);
    };
  };

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // List all bots
  app.get('/bots', asyncHandler(async (_req, res) => {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        tier: true,
        isRunning: true,
        currentGuilds: true,
      },
    });

    const bots: BotStatusResponse[] = tenants.map(tenant => ({
      tenantId: tenant.id,
      status: spawner.getStatus(tenant.id),
      health: healthMonitor.getHealth(tenant.id),
      processId: spawner.getProcessInfo(tenant.id).pid,
    }));

    const response: ApiResponse<BotListResponse> = {
      success: true,
      data: {
        bots,
        total: bots.length,
        running: bots.filter(b => b.status === 'running').length,
      },
    };

    res.json(response);
  }));

  // Get bot status
  app.get('/bots/:tenantId/status', asyncHandler<TenantParams>(async (req, res) => {
    const tenantId = req.params.tenantId;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        error: 'Tenant not found',
      } as ApiResponse);
      return;
    }

    const response: ApiResponse<BotStatusResponse> = {
      success: true,
      data: {
        tenantId,
        status: spawner.getStatus(tenantId),
        health: healthMonitor.getHealth(tenantId),
        processId: spawner.getProcessInfo(tenantId).pid,
      },
    };

    res.json(response);
  }));

  // Start a bot
  app.post('/bots/:tenantId/start', asyncHandler<TenantParams>(async (req, res) => {
    const tenantId = req.params.tenantId;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        error: 'Tenant not found',
      } as ApiResponse);
      return;
    }

    if (tenant.status === 'SUSPENDED') {
      res.status(403).json({
        success: false,
        error: 'Tenant is suspended',
      } as ApiResponse);
      return;
    }

    const currentStatus = spawner.getStatus(tenantId);
    if (currentStatus === 'running' || currentStatus === 'starting') {
      res.status(400).json({
        success: false,
        error: 'Bot is already running',
      } as ApiResponse);
      return;
    }

    try {
      // Token stays encrypted - spawner handles secure decryption
      await spawner.spawn({
        tenantId,
        discordTokenEncrypted: tenant.discordToken, // Encrypted in DB
        discordClientId: tenant.discordClientId,
        databaseUrl: buildTenantDatabaseUrl(tenantId),
      });

      // Update tenant status
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          isRunning: true,
          status: 'ACTIVE',
          lastStartedAt: new Date(),
          errorCount: 0,
          lastError: null,
        },
      });

      res.json({
        success: true,
        data: { tenantId, status: 'starting' },
      } as ApiResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          status: 'ERROR',
          lastError: message,
          errorCount: { increment: 1 },
        },
      });

      res.status(500).json({
        success: false,
        error: `Failed to start bot: ${message}`,
      } as ApiResponse);
    }
  }));

  // Stop a bot
  app.post('/bots/:tenantId/stop', asyncHandler<TenantParams>(async (req, res) => {
    const tenantId = req.params.tenantId;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        error: 'Tenant not found',
      } as ApiResponse);
      return;
    }

    const currentStatus = spawner.getStatus(tenantId);
    if (currentStatus === 'stopped') {
      res.status(400).json({
        success: false,
        error: 'Bot is not running',
      } as ApiResponse);
      return;
    }

    try {
      await spawner.stop(tenantId);

      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          isRunning: false,
          status: 'SUSPENDED',
          lastStoppedAt: new Date(),
        },
      });

      res.json({
        success: true,
        data: { tenantId, status: 'stopped' },
      } as ApiResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        error: `Failed to stop bot: ${message}`,
      } as ApiResponse);
    }
  }));

  // Restart a bot
  app.post('/bots/:tenantId/restart', asyncHandler<TenantParams>(async (req, res) => {
    const tenantId = req.params.tenantId;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        error: 'Tenant not found',
      } as ApiResponse);
      return;
    }

    try {
      // Stop first
      if (spawner.getStatus(tenantId) !== 'stopped') {
        await spawner.stop(tenantId);
      }

      // Token stays encrypted - spawner handles secure decryption
      await spawner.spawn({
        tenantId,
        discordTokenEncrypted: tenant.discordToken, // Encrypted in DB
        discordClientId: tenant.discordClientId,
        databaseUrl: buildTenantDatabaseUrl(tenantId),
      });

      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          isRunning: true,
          status: 'ACTIVE',
          lastStartedAt: new Date(),
        },
      });

      res.json({
        success: true,
        data: { tenantId, status: 'restarting' },
      } as ApiResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        error: `Failed to restart bot: ${message}`,
      } as ApiResponse);
    }
  }));

  // Get health summary
  app.get('/health/summary', (_req, res) => {
    const summary = healthMonitor.getSummary();
    res.json({
      success: true,
      data: summary,
    } as ApiResponse);
  });

  // Error handling middleware
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[API] Error:', err);
    res.status(500).json({
      success: false,
      error: err.message,
    } as ApiResponse);
  });

  return app;
}
