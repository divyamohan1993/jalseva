// =============================================================================
// Test: PWA Service Worker Configuration
// Covers: Test plan item #8 (PWA installation and offline caching)
// =============================================================================

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('PWA: Service Worker configuration', () => {
  const swPath = resolve(__dirname, '../app/sw.ts');

  it('sw.ts source file exists', () => {
    expect(existsSync(swPath)).toBe(true);
  });

  it('configures skipWaiting for immediate activation', () => {
    const content = readFileSync(swPath, 'utf-8');
    expect(content).toContain('skipWaiting: true');
  });

  it('configures clientsClaim to control all clients', () => {
    const content = readFileSync(swPath, 'utf-8');
    expect(content).toContain('clientsClaim: true');
  });

  it('enables navigation preload', () => {
    const content = readFileSync(swPath, 'utf-8');
    expect(content).toContain('navigationPreload: true');
  });

  it('uses precache manifest from build', () => {
    const content = readFileSync(swPath, 'utf-8');
    expect(content).toContain('self.__SW_MANIFEST');
  });

  it('uses default runtime caching from Serwist', () => {
    const content = readFileSync(swPath, 'utf-8');
    expect(content).toContain('defaultCache');
    expect(content).toContain('runtimeCaching: defaultCache');
  });

  it('registers event listeners', () => {
    const content = readFileSync(swPath, 'utf-8');
    expect(content).toContain('serwist.addEventListeners()');
  });
});

describe('PWA: Build output', () => {
  it('built sw.js exists in public directory', () => {
    const builtSw = resolve(__dirname, '../../public/sw.js');
    expect(existsSync(builtSw)).toBe(true);
  });
});

describe('PWA: Serwist next config', () => {
  const configPath = resolve(__dirname, '../../next.config.mjs');

  it('next.config.mjs exists', () => {
    expect(existsSync(configPath)).toBe(true);
  });

  it('configures withSerwist', () => {
    const content = readFileSync(configPath, 'utf-8');
    expect(content).toContain('withSerwist');
  });

  it('points to sw.ts source', () => {
    const content = readFileSync(configPath, 'utf-8');
    expect(content).toContain('sw.ts');
  });
});
