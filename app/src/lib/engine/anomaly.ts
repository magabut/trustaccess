import type { AccessLogItem, AnomalyReport } from '../types';

export function detectAnomaly(log: AccessLogItem[]): AnomalyReport | null {
  if (log.length < 10) return null;

  const denies = log.filter((e) => e.verdict === 'DENY');
  if (denies.length >= 5) {
    const pass = denies[0].passId;
    return { passId: pass, severity: 'high', reasons: [`${denies.length} DENY berturut-turut untuk pass ${pass}`] };
  }

  const hours = log.map((e) => e.hour);
  const mean = hours.reduce((a, b) => a + b, 0) / hours.length;
  const variance = hours.reduce((a, b) => a + (b - mean) ** 2, 0) / hours.length;
  const std = Math.sqrt(variance);
  const outliers = log.filter((e) => Math.abs(e.hour - mean) > 2 * std);
  if (outliers.length >= 1) {
    return { passId: outliers[0].passId, severity: 'medium', reasons: [`Akses di jam tidak biasa (${outliers[0].hour}:00)`] };
  }

  return null;
}
