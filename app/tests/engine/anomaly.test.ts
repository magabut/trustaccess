import { describe, it, expect } from 'vitest';
import { detectAnomaly } from '../../src/lib/engine/anomaly';
import type { AccessLogItem } from '../../src/lib/types';

const BASE: AccessLogItem[] = Array.from({ length: 20 }, (_, i) => ({
  passId: `p${i % 3}`,
  accessPointId: 1,
  hour: 9 + (i % 3),
  verdict: 'GRANT',
  tsMs: Date.now() - (20 - i) * 60_000,
}));

describe('detectAnomaly', () => {
  it('returns null when no data or low volume', () => {
    expect(detectAnomaly([])).toBeNull();
    expect(detectAnomaly(BASE.slice(0, 5))).toBeNull();
  });

  it('flags repeated DENY for same pass', () => {
    const log: AccessLogItem[] = [
      ...BASE,
      ...Array.from({ length: 7 }, (_, i) => ({ passId: 'p0', accessPointId: 1, hour: 10, verdict: 'DENY' as const, tsMs: Date.now() + i * 1000 })),
    ];
    const rep = detectAnomaly(log);
    expect(rep).not.toBeNull();
    expect(rep?.severity).toBe('high');
    expect(rep?.reasons.join(' ')).toContain('DENY');
  });

  it('flags unusual hour (outside mean±2σ)', () => {
    const log: AccessLogItem[] = [
      ...BASE,
      { passId: 'p9', accessPointId: 1, hour: 3, verdict: 'GRANT', tsMs: Date.now() },
    ];
    const rep = detectAnomaly(log);
    if (rep) expect(rep.reasons.join(' ')).toMatch(/jam|hour/i);
  });
});
