/**
 * Circuit Breaker for Redis Connections
 * Prevents cascading failures when Redis is unavailable
 *
 * States:
 * - CLOSED: Normal operation, Redis calls allowed
 * - OPEN: Redis failing, all calls rejected
 * - HALF_OPEN: Testing if Redis recovered
 */

import {
  circuitBreakerState,
  circuitBreakerFailures,
  CIRCUIT_STATE_VALUES,
} from './prometheus-metrics-registry';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;  // Failures before opening circuit
  resetTimeout: number;      // Time in ms before attempting recovery
  halfOpenRequests: number;  // Successful requests to close circuit
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private lastFailure = 0;
  private halfOpenSuccesses = 0;
  private config: CircuitBreakerConfig;
  private readonly name: string;

  constructor(config: Partial<CircuitBreakerConfig> = {}, name = 'redis') {
    this.name = name;
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      resetTimeout: config.resetTimeout ?? 30000,
      halfOpenRequests: config.halfOpenRequests ?? 3,
    };
    // Initialize metric with CLOSED state
    this.updateStateMetric();
  }

  /**
   * Update Prometheus gauge with current state
   */
  private updateStateMetric(): void {
    circuitBreakerState.set({ name: this.name }, CIRCUIT_STATE_VALUES[this.state]);
  }

  /**
   * Check if operation can be executed
   */
  canExecute(): boolean {
    if (this.state === 'CLOSED') return true;

    if (this.state === 'OPEN') {
      // Check if enough time passed to try recovery
      if (Date.now() - this.lastFailure >= this.config.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.halfOpenSuccesses = 0;
        this.updateStateMetric();
        console.log('[CircuitBreaker] Transitioning to HALF_OPEN');
        return true;
      }
      return false;
    }

    // HALF_OPEN state - allow request to test recovery
    return true;
  }

  /**
   * Record successful operation
   */
  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.config.halfOpenRequests) {
        this.state = 'CLOSED';
        this.failures = 0;
        this.updateStateMetric();
        console.log('[CircuitBreaker] Circuit CLOSED (recovered)');
      }
    } else {
      this.failures = 0;
    }
  }

  /**
   * Record failed operation
   */
  recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
    circuitBreakerFailures.inc({ name: this.name });

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.updateStateMetric();
      console.warn('[CircuitBreaker] Circuit OPEN (failed in half-open)');
    } else if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.updateStateMetric();
      console.warn('[CircuitBreaker] Circuit OPEN (threshold exceeded)');
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Manually open circuit (for testing or emergency)
   */
  forceOpen(): void {
    this.state = 'OPEN';
    this.lastFailure = Date.now();
    this.updateStateMetric();
  }

  /**
   * Manually close circuit (for testing or recovery)
   */
  forceClosed(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.updateStateMetric();
  }
}

// Singleton instance for Redis
export const redisCircuitBreaker = new CircuitBreaker();
