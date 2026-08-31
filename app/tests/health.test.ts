import { describe, expect, it } from 'vitest';
import { buildHealthResponse, checkHealth } from '../src/app/api/health/route';
import {
  EID_REQUEST_TIMEOUT_MS,
  VerifierApiError,
  fetchWithTimeout,
  parseJsonSafe,
} from '../src/lib/eid/client';
import type { DBSession } from '../src/lib/db';

describe('buildHealthResponse', () => {
  it('returns { ok: true } with 200 when the database responds', async () => {
    const res = buildHealthResponse(true);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('returns { ok: false } with 503 when the database is unavailable', async () => {
    const res = buildHealthResponse(false);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false });
  });
});

describe('checkHealth', () => {
  it('reports healthy when the database answers SELECT 1', async () => {
    const db = { get: async () => ({ '?column?': 1 }) } as Pick<DBSession, 'get'>;
    await expect(checkHealth(db)).resolves.toBe(true);
  });

  it('reports unhealthy without throwing when the database is unavailable', async () => {
    const db = { get: async () => { throw new Error('connection refused'); } } as Pick<DBSession, 'get'>;
    await expect(checkHealth(db)).resolves.toBe(false);
  });
});

describe('verifier failure isolation', () => {
  it('never leaks tokens or secrets in error messages', async () => {
    const fakeResponse = new Response(JSON.stringify({ data: { token: 'super-secret-token-value' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
    const err = await parseJsonSafe<unknown>(fakeResponse).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(VerifierApiError);
    const message = err instanceof Error ? err.message : String(err);
    expect(message).not.toContain('super-secret-token-value');
    expect(message).not.toContain('client_secret');
  });

  it('returns a bounded safe message on request timeout', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = ((_url: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        (init?.signal as AbortSignal | undefined)?.addEventListener('abort', () =>
          reject(new Error('The operation was aborted')),
        );
      })) as typeof fetch;
    try {
      const err = await fetchWithTimeout('https://example.invalid', {}, 10).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(VerifierApiError);
      expect(err instanceof Error ? err.message : String(err)).toBe('eid_request_timeout');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('hides non-OK response bodies from the surfaced message', async () => {
    const err = await parseJsonSafe<unknown>(new Response('auth-signature-mismatch', { status: 401 })).catch(
      (e: unknown) => e,
    );
    expect(err instanceof Error ? err.message : String(err)).not.toContain('auth-signature-mismatch');
  });

  it('uses a bounded default timeout', () => {
    expect(EID_REQUEST_TIMEOUT_MS).toBeGreaterThan(0);
    expect(EID_REQUEST_TIMEOUT_MS).toBeLessThanOrEqual(30_000);
  });
});
