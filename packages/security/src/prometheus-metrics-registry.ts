/**
 * Prometheus Metrics for Security Package
 * Centralized registry for rate limiting and circuit breaker metrics
 */

import { Registry, Counter, Gauge, collectDefaultMetrics } from 'prom-client';

// Create dedicated registry (allows multiple apps to have separate metrics)
export const securityMetricsRegistry = new Registry();

// Collect default Node.js metrics (memory, CPU, etc.)
collectDefaultMetrics({ register: securityMetricsRegistry });

/**
 * Rate Limit Metrics
 */
export const rateLimitRequestsTotal = new Counter({
  name: 'ratelimit_requests_total',
  help: 'Total rate limit checks',
  labelNames: ['allowed', 'source'] as const,
  registers: [securityMetricsRegistry],
});

export const rateLimitRejectedTotal = new Counter({
  name: 'ratelimit_rejected_total',
  help: 'Total rate limited (rejected) requests',
  labelNames: ['key_prefix'] as const,
  registers: [securityMetricsRegistry],
});

/**
 * Circuit Breaker Metrics
 */
export const circuitBreakerState = new Gauge({
  name: 'circuit_breaker_state',
  help: 'Circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)',
  labelNames: ['name'] as const,
  registers: [securityMetricsRegistry],
});

export const circuitBreakerFailures = new Counter({
  name: 'circuit_breaker_failures_total',
  help: 'Total circuit breaker recorded failures',
  labelNames: ['name'] as const,
  registers: [securityMetricsRegistry],
});

/**
 * Memory Fallback Store Metrics
 */
export const memoryStoreEntries = new Gauge({
  name: 'ratelimit_memory_store_entries',
  help: 'Current number of entries in memory fallback store',
  registers: [securityMetricsRegistry],
});

export const memoryStoreMaxSize = new Gauge({
  name: 'ratelimit_memory_store_max_size',
  help: 'Maximum size of memory fallback store',
  registers: [securityMetricsRegistry],
});

/**
 * Get all metrics in Prometheus exposition format
 */
export async function getMetrics(): Promise<string> {
  return securityMetricsRegistry.metrics();
}

/**
 * Get content type for metrics response
 */
export function getMetricsContentType(): string {
  return securityMetricsRegistry.contentType;
}

// State enum mapping for circuit breaker gauge
export const CIRCUIT_STATE_VALUES = {
  CLOSED: 0,
  HALF_OPEN: 1,
  OPEN: 2,
} as const;
