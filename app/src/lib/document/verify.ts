import type { DocumentVerificationTrace, TraceItem } from '../types';

export function verifyDocument(claims: Record<string, unknown>): DocumentVerificationTrace {
  const items: TraceItem[] = [];
  const reasons: string[] = [];

  const ok = (label: string, detail?: string) => items.push({ label, ok: true, detail });
  const fail = (label: string, detail?: string) => { items.push({ label, ok: false, detail }); reasons.push(detail || label); };

  if (claims.signature === false) fail('Signature', 'Signature tidak valid');
  else ok('Signature');

  if (!claims.issuer) fail('Issuer', 'Issuer tidak ditemukan');
  else ok('Issuer', String(claims.issuer));

  if (!claims.holder) fail('Holder', 'Holder tidak ditemukan');
  else ok('Holder');

  const exp = claims.validUntil ? Date.parse(String(claims.validUntil)) : 0;
  if (exp && exp < Date.now()) fail('Expiry', `Kadaluarsa ${new Date(exp).toISOString()}`);
  else ok('Expiry');

  return { valid: reasons.length === 0, items, reasons };
}
