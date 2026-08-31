import { describe, it, expect } from 'vitest';
import { evaluateGate } from '../../src/lib/engine/gating';
import type { VerificationResult, GateRule } from '../../src/lib/types';

const GRANT_CREDS: VerificationResult = {
  ok: true,
  credentials: [
    { id: 'a', type: 'AccessPass', holder: 'x@d.id', validFrom: '2026-08-01T00:00:00Z', validUntil: '2026-09-01T00:00:00Z', claims: {}, revoked: false, areaScope: ['Laboratorium'] },
    { id: 'b', type: 'SafetyInduction', holder: 'x@d.id', validFrom: '2026-08-01T00:00:00Z', validUntil: '2026-12-31T00:00:00Z', claims: {}, revoked: false },
  ],
};

const RULE: GateRule = {
  id: 1, accessPointId: 2, requiredType: 'AccessPass',
  prerequisites: ['SafetyInduction'], areaScope: ['Laboratorium'],
  openMinute: 420, closeMinute: 1080,
};

describe('evaluateGate', () => {
  it('GRANT when all requirements met', () => {
    const now = new Date('2026-08-20T02:00:00Z'); // 09:00 JKT
    const d = evaluateGate(GRANT_CREDS, RULE, now);
    expect(d.verdict).toBe('GRANT');
    expect(d.usedPassId).toBe('a');
  });

  it('DENY when presentation failed or empty', () => {
    expect(evaluateGate({ ok: false, credentials: [] }, RULE, new Date('2026-08-20T02:00:00Z')).verdict).toBe('DENY');
  });

  it('DENY with reason when prerequisite missing', () => {
    const noPrereq: VerificationResult = { ok: true, credentials: [GRANT_CREDS.credentials[0]] };
    const d = evaluateGate(noPrereq, RULE, new Date('2026-08-20T02:00:00Z'));
    expect(d.verdict).toBe('DENY');
    expect(d.reasons.join(' ')).toContain('SafetyInduction');
  });

  it('DENY with reason when outside operating hours', () => {
    const late = new Date('2026-08-20T12:00:00Z'); // 19:00 JKT > 18:00
    const d = evaluateGate(GRANT_CREDS, RULE, late);
    expect(d.verdict).toBe('DENY');
    expect(d.reasons.join(' ')).toContain('jam operasional');
  });

  it('DENY when credential expired', () => {
    const now = new Date('2026-10-01T02:00:00Z');
    const d = evaluateGate(GRANT_CREDS, RULE, now);
    expect(d.verdict).toBe('DENY');
    expect(d.reasons.join(' ')).toContain('kadaluarsa');
  });

  it('DENY when required credential is revoked', () => {
    const revoked: VerificationResult = {
      ok: true,
      credentials: [{ ...GRANT_CREDS.credentials[0], revoked: true }, GRANT_CREDS.credentials[1]],
    };
    expect(evaluateGate(revoked, RULE, new Date('2026-08-20T02:00:00Z')).verdict).toBe('DENY');
  });

  it('DENY when pass does not cover the gate area scope', () => {
    const wrongArea: VerificationResult = { ok: true, credentials: [
      { ...GRANT_CREDS.credentials[0], areaScope: ['Parkir'] },
      GRANT_CREDS.credentials[1],
    ] };
    const d = evaluateGate(wrongArea, RULE, new Date('2026-08-20T02:00:00Z'));
    expect(d.verdict).toBe('DENY');
    expect(d.reasons.join(' ')).toContain('area');
  });

  it('Layer A selects the most-specific / longest-valid pass among candidates', () => {
    const multi: VerificationResult = { ok: true, credentials: [
      { ...GRANT_CREDS.credentials[0], id: 'gen', areaScope: ['Umum'] },
      { ...GRANT_CREDS.credentials[0], id: 'spec', areaScope: ['Laboratorium'] },
      GRANT_CREDS.credentials[1],
    ] };
    expect(evaluateGate(multi, RULE, new Date('2026-08-20T02:00:00Z')).usedPassId).toBe('spec');
  });
});
