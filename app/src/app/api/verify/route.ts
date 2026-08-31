import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { evaluateGate } from '@/lib/engine/gating';
import { detectAnomaly } from '@/lib/engine/anomaly';
import type { GateRule, VerificationResult } from '@/lib/types';

export async function POST(req: Request) {
  const body = await req.json();
  const { accessPointId, presentation } = body;
  if (!accessPointId || !presentation) {
    return NextResponse.json({ error: 'accessPointId and presentation required' }, { status: 400 });
  }

  const db = getDb();
  const ruleRow = db.get<any>(
    `SELECT r.* FROM access_rules r JOIN access_points p ON p.id = r.access_point_id WHERE p.id = ?`,
    [accessPointId],
  );
  if (!ruleRow) return NextResponse.json({ error: 'rule not found' }, { status: 404 });

  const rule: GateRule = {
    id: ruleRow.id,
    accessPointId: ruleRow.access_point_id,
    requiredType: ruleRow.required_type,
    prerequisites: JSON.parse(ruleRow.prerequisites || '[]'),
    openMinute: ruleRow.open_minute,
    closeMinute: ruleRow.close_minute,
    areaScope: JSON.parse(ruleRow.area_scope || '[]'),
  };

  // In real flow the presentation is a signed VC from e.id; here we accept JSON or QR payload
  let creds: VerificationResult;
  try {
    const parsed = JSON.parse(presentation);
    creds = { ok: true, credentials: [parsed] };
  } catch {
    creds = { ok: false, credentials: [] };
  }

  const decision = evaluateGate(creds, rule, new Date());
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO access_events (org_id, pass_id, access_point_id, verdict, reasons, credential_id, action, actuator_detail, created_at)
     VALUES (1, ?, ?, ?, ?, ?, 'check', NULL, ?)`,
    [decision.usedPassId || null, accessPointId, decision.verdict, JSON.stringify(decision.reasons), creds.credentials[0]?.id || null, now],
  );

  const anomaly = detectAnomaly(
    db.all<any>('SELECT * FROM access_events ORDER BY created_at DESC LIMIT 50').map((e) => ({
      passId: e.pass_id || 'unknown',
      accessPointId: e.access_point_id,
      hour: new Date(e.created_at).getHours(),
      verdict: e.verdict,
      tsMs: Date.parse(e.created_at),
    })),
  );
  if (anomaly) {
    db.run(`INSERT INTO anomaly_alerts (org_id, pass_id, severity, reasons, created_at) VALUES (1,?,?,?,?)`, [
      anomaly.passId,
      anomaly.severity,
      JSON.stringify(anomaly.reasons),
      now,
    ]);
  }

  return NextResponse.json({ ...decision, anomaly });
}
