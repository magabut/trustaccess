import type { AccessLogItem } from '../types';

export function forecastNextHour(log: AccessLogItem[]): number {
  if (log.length < 3) return 0;
  const counts = new Array(24).fill(0);
  for (const e of log) counts[e.hour] = (counts[e.hour] || 0) + 1;
  const sum = counts.reduce((a, b) => a + b, 0);
  const mean = sum / 24;
  const recent = counts.slice(-3).reduce((a, b) => a + b, 0) / 3;
  return Math.max(0, Math.round((mean + recent) / 2));
}
