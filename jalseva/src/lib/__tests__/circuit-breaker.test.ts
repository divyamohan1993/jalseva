// =============================================================================
// Test: Circuit Breaker — State Machine & Recovery
// Covers: Test plan item #11 (circuit breaker opens on timeout simulation)
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitBreaker } from '../circuit-breaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      name: 'test',
      failureThreshold: 3,
      recoveryTimeout: 500, // 500ms for fast tests
      callTimeout: 200,
    });
  });

  it('starts in CLOSED state', () => {
    expect(breaker.currentState).toBe('CLOSED');
  });

  it('stays CLOSED on successful calls', async () => {
    const result = await breaker.execute(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
    expect(breaker.currentState).toBe('CLOSED');
  });

  it('opens after reaching failure threshold', async () => {
    const fail = () => Promise.reject(new Error('fail'));

    for (let i = 0; i < 3; i++) {
      await breaker.execute(fail, () => 'fallback');
    }

    expect(breaker.currentState).toBe('OPEN');
  });

  it('returns fallback when circuit is OPEN', async () => {
    const fail = () => Promise.reject(new Error('fail'));

    // Trip the circuit
    for (let i = 0; i < 3; i++) {
      await breaker.execute(fail, () => 'fallback');
    }
    expect(breaker.currentState).toBe('OPEN');

    // Next call should return fallback without executing fn
    const result = await breaker.execute(
      () => Promise.resolve('should-not-run'),
      () => 'circuit-open-fallback'
    );
    expect(result).toBe('circuit-open-fallback');
  });

  it('throws when OPEN with no fallback', async () => {
    const fail = () => Promise.reject(new Error('fail'));

    for (let i = 0; i < 3; i++) {
      await breaker.execute(fail, () => 'fb');
    }

    await expect(
      breaker.execute(() => Promise.resolve('x'))
    ).rejects.toThrow('Circuit is OPEN');
  });

  it('transitions to HALF_OPEN after recovery timeout', async () => {
    const fail = () => Promise.reject(new Error('fail'));

    for (let i = 0; i < 3; i++) {
      await breaker.execute(fail, () => 'fb');
    }
    expect(breaker.currentState).toBe('OPEN');

    // Wait for recovery
    await new Promise((r) => setTimeout(r, 600));

    // Next call should attempt (HALF_OPEN)
    const result = await breaker.execute(() => Promise.resolve('recovered'));
    expect(result).toBe('recovered');
    expect(breaker.currentState).toBe('CLOSED');
  });

  it('re-opens if HALF_OPEN probe fails', async () => {
    const fail = () => Promise.reject(new Error('fail'));

    // Trip circuit
    for (let i = 0; i < 3; i++) {
      await breaker.execute(fail, () => 'fb');
    }

    // Wait for recovery
    await new Promise((r) => setTimeout(r, 600));

    // Probe fails
    await breaker.execute(fail, () => 'fb');
    expect(breaker.currentState).toBe('OPEN');
  });

  it('handles call timeout', async () => {
    const slow = () =>
      new Promise<string>((resolve) => setTimeout(() => resolve('late'), 500));

    const result = await breaker.execute(slow, () => 'timed-out');
    expect(result).toBe('timed-out');
  });

  it('tracks metrics correctly', async () => {
    await breaker.execute(() => Promise.resolve('ok'));
    await breaker.execute(() => Promise.reject(new Error('fail')), () => 'fb');

    const m = breaker.metrics;
    expect(m.totalCalls).toBe(2);
    expect(m.successCalls).toBe(1);
    expect(m.failedCalls).toBe(1);
    expect(m.name).toBe('test');
  });

  it('reset() restores CLOSED state', async () => {
    const fail = () => Promise.reject(new Error('fail'));
    for (let i = 0; i < 3; i++) {
      await breaker.execute(fail, () => 'fb');
    }
    expect(breaker.currentState).toBe('OPEN');

    breaker.reset();
    expect(breaker.currentState).toBe('CLOSED');

    const result = await breaker.execute(() => Promise.resolve('after-reset'));
    expect(result).toBe('after-reset');
  });

  it('simulates Firestore timeout and opens circuit', async () => {
    // Simulates the Firestore breaker config
    const firestoreBreaker = new CircuitBreaker({
      name: 'firestore-sim',
      failureThreshold: 5,
      recoveryTimeout: 300,
      callTimeout: 100, // Short timeout for test
    });

    const slowFirestoreCall = () =>
      new Promise<string>((resolve) => setTimeout(() => resolve('data'), 500));

    // 5 timeouts should open the circuit
    for (let i = 0; i < 5; i++) {
      await firestoreBreaker.execute(slowFirestoreCall, () => 'timeout-fallback');
    }

    expect(firestoreBreaker.currentState).toBe('OPEN');
    expect(firestoreBreaker.metrics.failedCalls).toBe(5);

    // Verify it fast-fails now
    const result = await firestoreBreaker.execute(
      slowFirestoreCall,
      () => 'circuit-open'
    );
    expect(result).toBe('circuit-open');
    expect(firestoreBreaker.metrics.rejectedCalls).toBe(1);
  });
});
