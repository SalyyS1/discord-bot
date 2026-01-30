/**
 * API Key Authentication Middleware with HMAC Signature
 *
 * Implements HMAC-SHA256 signature verification for Manager API endpoints.
 * Prevents replay attacks using timestamp validation.
 */

import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

export function apiKeyAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip health check endpoints (for load balancer probes)
  if (req.path === '/health' || req.path === '/health/summary') {
    return next();
  }

  const apiKey = req.headers['x-api-key'] as string;
  const timestamp = req.headers['x-timestamp'] as string;
  const signature = req.headers['x-signature'] as string;

  if (!apiKey || !timestamp || !signature) {
    return res.status(401).json({
      success: false,
      error: 'Missing authentication headers'
    });
  }

  // Check timestamp freshness (5 minute window prevents replay attacks)
  const now = Date.now();
  const requestTime = parseInt(timestamp, 10);
  if (isNaN(requestTime) || Math.abs(now - requestTime) > 5 * 60 * 1000) {
    return res.status(401).json({
      success: false,
      error: 'Request expired'
    });
  }

  // Verify signature
  const expectedKey = process.env.MANAGER_API_KEY;
  if (!expectedKey) {
    console.error('[API Auth] MANAGER_API_KEY not configured');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error'
    });
  }

  // Generate expected signature: HMAC-SHA256(method:path:timestamp, secret)
  const payload = `${req.method}:${req.path}:${timestamp}`;
  const expectedSignature = crypto
    .createHmac('sha256', expectedKey)
    .update(payload)
    .digest('hex');

  // Ensure buffers are same length before timing-safe comparison
  // Prevents timingSafeEqual() from throwing when signature lengths differ
  if (signature.length !== expectedSignature.length) {
    console.warn(`[API Auth] Signature length mismatch for ${req.method} ${req.path}`);
    return res.status(401).json({
      success: false,
      error: 'Invalid signature'
    });
  }

  // Timing-safe comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    console.warn(`[API Auth] Invalid signature for ${req.method} ${req.path}`);
    return res.status(401).json({
      success: false,
      error: 'Invalid signature'
    });
  }

  next();
}
