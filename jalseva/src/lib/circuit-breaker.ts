// =============================================================================
// JalSeva - Circuit Breaker
// =============================================================================
// Prevents cascade failures when external services (Firestore, Redis, Maps API)
// degrade. At 50K RPS, a single slow service can exhaust all connections.
// Circuit breaker fast-fails after threshold, letting the system shed load.
//
// States:
//   CLOSED  → requests flow normally, failures counted
//   OPEN    → requests fast-fail with fallback, no external calls
//   HALF_OPEN → one probe request allowed to test recovery
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
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly recoveryTimeout: number;
  private readonly callTimeout: number;

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
      // Check if recovery timeout has elapsed
      if (Date.now() - this.lastFailureTime >= this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        this.rejectedCalls++;
        if (fallback) return fallback();
        throw new Error(`[CircuitBreaker:${this.name}] Circuit is OPEN`);
      }
    }

    try {
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
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
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`[CircuitBreaker:${this.name}] Call timed out after ${this.callTimeout}ms`));
      }, this.callTimeout);

      fn()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private onSuccess(): void {
    this.successCalls++;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
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

/** Firestore circuit breaker - opens after 5 failures, recovers after 30s */
export const firestoreBreaker = new CircuitBreaker({
  name: 'firestore',
  failureThreshold: 5,
  recoveryTimeout: 30_000,
  callTimeout: 8_000,
});

/** Redis circuit breaker - opens after 3 failures, recovers after 15s */
export const redisBreaker = new CircuitBreaker({
  name: 'redis',
  failureThreshold: 3,
  recoveryTimeout: 15_000,
  callTimeout: 3_000,
});

/** Google Maps API circuit breaker */
export const mapsBreaker = new CircuitBreaker({
  name: 'google-maps',
  failureThreshold: 5,
  recoveryTimeout: 60_000,
  callTimeout: 10_000,
});

/** Gemini AI circuit breaker */
export const geminiBreaker = new CircuitBreaker({
  name: 'gemini',
  failureThreshold: 3,
  recoveryTimeout: 60_000,
  callTimeout: 15_000,
});
