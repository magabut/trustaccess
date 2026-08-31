import type { CredentialData, GateDecision, GateRule, VerificationResult } from '../types';

function hhmm(min: number): string {
  const h = String(Math.floor(min / 60)).padStart(2, '0');
  const m = String(min % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export function resolveMainPass(passes: CredentialData[], rule: GateRule, nowMs: number): CredentialData | null {
  const candidates = passes.filter((c) => {
    if (c.type !== rule.requiredType || c.revoked) return false;
    if (nowMs < Date.parse(c.validFrom) || nowMs > Date.parse(c.validUntil)) return false;
    const scope = c.areaScope ?? [];
    const matchesArea = rule.areaScope.length === 0 || rule.areaScope.some((a) => scope.includes(a));
    return matchesArea;
  });
  if (candidates.length === 0) return null;
  return candidates.sort((x, y) => {
    const xSpec = rule.areaScope.filter((a) => (x.areaScope ?? []).includes(a)).length;
    const ySpec = rule.areaScope.filter((a) => (y.areaScope ?? []).includes(a)).length;
    if (xSpec !== ySpec) return ySpec - xSpec;
    return Date.parse(y.validUntil) - Date.parse(x.validUntil);
  })[0];
}

export function checkPrerequisites(passes: CredentialData[], rule: GateRule, nowMs: number): string[] {
  return rule.prerequisites.filter((p) =>
    !passes.some((c) => c.type === p && !c.revoked
      && nowMs >= Date.parse(c.validFrom) && nowMs <= Date.parse(c.validUntil)));
}

export function evaluateGate(
  result: VerificationResult,
  rule: GateRule,
  localNow: Date,
): GateDecision {
  if (!result.ok || result.credentials.length === 0) {
    return { verdict: 'DENY', score: 0, reasons: ['Tidak ada credential yang dipresentasikan.'] };
  }

  const nowMs = localNow.getTime();
  const nowMin = localNow.getHours() * 60 + localNow.getMinutes();
  const main = resolveMainPass(result.credentials, rule, nowMs);

  const passChecks = result.credentials.map((c) => ({
    passId: c.id,
    matched: c === main,
    note: c === main ? 'Dipilih sebagai pass utama' : c.type === rule.requiredType ? 'Kandidat tapi tidak terpilih' : 'Tidak relevan',
  }));

  const reasons: string[] = [];

  if (!main) {
    const expired = result.credentials.find((c) => c.type === rule.requiredType && nowMs > Date.parse(c.validUntil));
    if (expired) reasons.push('Kredensial utama sudah kadaluarsa.');
    else reasons.push('Tidak ada pass utama yang cocok (tipe/area/validitas).');
  }

  const missing = checkPrerequisites(result.credentials, rule, nowMs);
  if (missing.length > 0) {
    reasons.push(`Prasyarat belum terpenuhi: ${missing.join(', ')}`);
  }

  if (nowMin < rule.openMinute || nowMin > rule.closeMinute) {
    reasons.push(`Di luar jam operasional (${hhmm(rule.openMinute)}–${hhmm(rule.closeMinute)}).`);
  }

  if (reasons.length > 0) {
    return { verdict: 'DENY', score: 0, reasons, usedPassId: main?.id, passChecks };
  }

  return {
    verdict: 'GRANT',
    score: 1,
    reasons: ['Semua persyaratan terpenuhi.'],
    usedPassId: main?.id,
    passChecks,
  };
}
