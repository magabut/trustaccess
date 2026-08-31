import { describe, it, expect } from 'vitest';
import { forecastNextHour } from '../../src/lib/engine/stats';
import type { AccessLogItem } from '../../src/lib/types';

const LOG: AccessLogItem[] = Array.from({ length: 24 }, (_, i) => ({
  passId: `p${i % 4}`,
  accessPointId: 1,
  hour: i,
  verdict: i % 3 === 0 ? 'DENY' : 'GRANT',
  tsMs: Date.now() - (24 - i) * 3600_000,
}));

describe('forecastNextHour', () => {
  it('returns baseline when insufficient data', () => {
    expect(forecastNextHour([])).toBeGreaterThanOrEqual(0);
  });

  it('forecasts non-negative value', () => {
    const f = forecastNextHour(LOG);
    expect(f).toBeGreaterThanOrEqual(0);
  });
});
