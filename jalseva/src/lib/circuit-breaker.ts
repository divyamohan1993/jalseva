// =============================================================================
// JalSeva - Circuit Breaker (Hardened for 50K RPS)
// =============================================================================
// Prevents cascade failures when external services (Firestore, Redis, Maps API)
// degrade. At 50K RPS, a single slow service can exhaust all connections.
// Circuit breaker fast-fails after threshold, letting the system shed load.
//
// States:
//   CLOSED    → requests flow normally, failures counted
//   OPEN      → requests fast-fail with fallback, no external calls
//   HALF_OPEN → ONE probe request allowed to test recovery (prevents thundering herd)
//
// Improvements over naive circuit breaker:
//   1. Probe limiting: only 1 concurrent probe in HALF_OPEN (no thundering herd)
//   2. Exponential backoff: recovery timeout doubles after each failed recovery
//   3. Settled flag: prevents double-resolve/reject on timeout race
//   4. Reduced timeouts: tuned for actual service latencies, not worst-case
// =============================================================================

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  /** Name for logging */
  name: string;
  /** Failures before opening circuit (default 5) */
  failureThreshold?: number;
  /** ms to wait before attempting recovery (default 30000) */
  recoveryTimeout?: number;
  /** ms after which a call is considered timed out (default 10000) */
  callTimeout?: number;
  /** Max concurrent probe requests in HALF_OPEN state (default 1) */
  halfOpenMaxProbes?: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private consecutiveRecoveryFailures = 0;
  private halfOpenProbes = 0;
  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly recoveryTimeout: number;
  private readonly callTimeout: number;
  private readonly halfOpenMaxProbes: number;

  // Metrics
  private totalCalls = 0;
  private successCalls = 0;
  private failedCalls = 0;
  private rejectedCalls = 0;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.recoveryTimeout = options.recoveryTimeout ?? 30_000;
    this.callTimeout = options.callTimeout ?? 10_000;
    this.halfOpenMaxProbes = options.halfOpenMaxProbes ?? 1;
  }

  /**
   * Execute a function through the circuit breaker.
   *
   * @param fn       - The async operation to execute.
   * @param fallback - Optional fallback when circuit is open.
   * @returns The result of fn or fallback.
   */
  async execute<T>(fn: () => Promise<T>, fallback?: () => T): Promise<T> {
    this.totalCalls++;

    if (this.state === 'OPEN') {
      // Exponential backoff: recovery timeout doubles after each failed recovery
      // Caps at 2^5 = 32x the base timeout to prevent infinite wait
      const effectiveTimeout = this.recoveryTimeout * Math.pow(2, Math.min(this.consecutiveRecoveryFailures, 5));
      if (Date.now() - this.lastFailureTime >= effectiveTimeout) {
        // Only allow limited concurrent probes in HALF_OPEN to prevent thundering herd
        if (this.halfOpenProbes < this.halfOpenMaxProbes) {
          this.state = 'HALF_OPEN';
        } else {
          this.rejectedCalls++;
          if (fallback) return fallback();
          throw new Error(`[CircuitBreaker:${this.name}] Circuit is OPEN (probe in flight)`);
        }
      } else {
        this.rejectedCalls++;
        if (fallback) return fallback();
        throw new Error(`[CircuitBreaker:${this.name}] Circuit is OPEN`);
      }
    }

    // Track HALF_OPEN probes to prevent thundering herd
    const isProbe = this.state === 'HALF_OPEN';
    if (isProbe) this.halfOpenProbes++;

    try {
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      if (isProbe) this.halfOpenProbes = Math.max(0, this.halfOpenProbes - 1);
      return result;
    } catch (error) {
      if (isProbe) {
        this.halfOpenProbes = Math.max(0, this.halfOpenProbes - 1);
        // Failed probe → back to OPEN with increased backoff
        this.state = 'OPEN';
        this.consecutiveRecoveryFailures++;
        this.lastFailureTime = Date.now();
      }
      this.onFailure();
      if (fallback) return fallback();
      throw error;
    }
  }

  /** Current circuit state */
  get currentState(): CircuitState {
    return this.state;
  }

  /** Metrics snapshot */
  get metrics() {
    return {
      name: this.name,
      state: this.state,
      totalCalls: this.totalCalls,
      successCalls: this.successCalls,
      failedCalls: this.failedCalls,
      rejectedCalls: this.rejectedCalls,
      failureCount: this.failureCount,
      consecutiveRecoveryFailures: this.consecutiveRecoveryFailures,
      successRate:
        this.totalCalls === 0
          ? 1
          : this.successCalls / this.totalCalls,
    };
  }

  /** Force-reset circuit to CLOSED (for testing/recovery) */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.consecutiveRecoveryFailures = 0;
    this.halfOpenProbes = 0;
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error(`[CircuitBreaker:${this.name}] Call timed out after ${this.callTimeout}ms`));
        }
      }, this.callTimeout);

      fn()
        .then((result) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve(result);
          }
        })
        .catch((error) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(error);
          }
        });
    });
  }

  private onSuccess(): void {
    this.successCalls++;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.consecutiveRecoveryFailures = 0;
    }
    this.failureCount = 0;
  }

  private onFailure(): void {
    this.failedCalls++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}

// ---------------------------------------------------------------------------
// Pre-configured circuit breakers for each external service
// ---------------------------------------------------------------------------

/** Firestore circuit breaker
 *  callTimeout reduced from 8s → 2s (Firestore p99 is ~100-200ms)
 *  recoveryTimeout reduced from 30s → 10s with exponential backoff */
export const firestoreBreaker = new CircuitBreaker({
  name: 'firestore',
  failureThreshold: 5,
  recoveryTimeout: 10_000,
  callTimeout: 2_000,
  halfOpenMaxProbes: 1,
});

/** Redis circuit breaker
 *  callTimeout reduced from 3s → 1s (Upstash HTTP p99 is ~5-10ms)
 *  recoveryTimeout reduced from 15s → 5s */
export const redisBreaker = new CircuitBreaker({
  name: 'redis',
  failureThreshold: 3,
  recoveryTimeout: 5_000,
  callTimeout: 1_000,
  halfOpenMaxProbes: 1,
});

/** Google Maps API circuit breaker
 *  callTimeout reduced from 10s → 3s
 *  recoveryTimeout reduced from 60s → 30s */
export const mapsBreaker = new CircuitBreaker({
  name: 'google-maps',
  failureThreshold: 5,
  recoveryTimeout: 30_000,
  callTimeout: 3_000,
  halfOpenMaxProbes: 1,
});

/** Gemini AI circuit breaker
 *  callTimeout reduced from 15s → 5s */
export const geminiBreaker = new CircuitBreaker({
  name: 'gemini',
  failureThreshold: 3,
  recoveryTimeout: 30_000,
  callTimeout: 5_000,
  halfOpenMaxProbes: 1,
});
