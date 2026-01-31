/**
 * Audit Log Export API
 * GET - Export audit log entries as CSV or JSON
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@repo/database';
import { validateGuildAccess, ApiResponse } from '@/lib/session';
import { logger } from '@/lib/logger';

// Query params schema
const querySchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
  from: z.string().optional(),
  to: z.string().optional(),
  category: z.string().optional(),
  action: z.string().optional(),
});

// Convert entries to CSV format
function convertToCSV(entries: any[]): string {
  if (entries.length === 0) return '';

  const headers = ['id', 'timestamp', 'user_id', 'category', 'action', 'target', 'request_id', 'source', 'ip_address'];
  const rows = entries.map(entry => [
    entry.id,
    entry.createdAt.toISOString(),
    entry.userId,
    entry.category,
    entry.action,
    entry.target || '',
    entry.requestId,
    entry.source,
    entry.ipAddress || '',
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const validationError = await validateGuildAccess(guildId);
  if (validationError) return validationError;

  try {
    // Parse query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = querySchema.safeParse(searchParams);

    if (!query.success) {
      return ApiResponse.badRequest(query.error.errors.map(e => e.message).join(', '));
    }

    const { format, from, to, category, action } = query.data;

    // Default to last 30 days if no date range specified
    const defaultFrom = new Date();
    defaultFrom.setDate(defaultFrom.getDate() - 30);

    // Build where clause
    const where: any = {
      guildId,
      createdAt: {
        gte: from ? new Date(from) : defaultFrom,
        lte: to ? new Date(to) : new Date(),
      },
    };

    if (category && category !== 'all') {
      where.category = category;
    }
    if (action && action !== 'all') {
      where.action = action;
    }

    // Fetch entries (max 10000 for export)
    const entries = await prisma.auditLogEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    // Return based on format
    if (format === 'csv') {
      const csv = convertToCSV(entries);
      const filename = `audit-log-${guildId}-${new Date().toISOString().split('T')[0]}.csv`;

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // JSON format
    const filename = `audit-log-${guildId}-${new Date().toISOString().split('T')[0]}.json`;

    return new Response(JSON.stringify(entries, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error(`Error exporting audit log: ${error}`);
    return ApiResponse.serverError();
  }
}
