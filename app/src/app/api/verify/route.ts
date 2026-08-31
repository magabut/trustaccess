import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { evaluateGate } from '@/lib/engine/gating';
import { detectAnomaly } from '@/lib/engine/anomaly';
import { createClient } from '@/lib/eid/client';
import type { GateRule, VerificationResult } from '@/lib/types';

const client = createClient();

type AccessRuleRow = {
  id: number;
  access_point_id: number;
  required_type: string;
  prerequisites: string;
  open_minute: number;
  close_minute: number;
  area_scope: string;
};

type AccessEventRow = {
  pass_id: string | null;
  access_point_id: number;
  verdict: string;
  created_at: string;
};

export async function POST(req: Request) {
  const body = await req.json();

  // === Mode 1: Create VP Request (real e.id Verifier flow) ===
  if (body.action === 'create') {
    const { verification_id } = body;
    const vp = await client.createVPRequest(verification_id || 'vs_demo');
    return NextResponse.json(vp);
  }

  // === Mode 2: Get VP Result (session-based) ===
  if (body.action === 'result') {
    const sessionId = body.sessionId || body.qr_token;
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: 'sessionId required' }, { status: 400 });
    }
    const result = await client.getVPResultBySession(sessionId);
    return NextResponse.json(result);
  }

  // === Mode 3: Legacy verify (for demo gate) ===
  const { accessPointId, presentation } = body;
  if (!accessPointId || !presentation) {
    return NextResponse.json({ error: 'accessPointId and presentation required' }, { status: 400 });
  }

  const db = getDb();
  const ruleRow = await db.get<AccessRuleRow>(
    `SELECT r.* FROM access_rules r JOIN access_points p ON p.id = r.access_point_id WHERE p.id = $1`,
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

  let creds: VerificationResult;
  try {
    const parsed = JSON.parse(presentation);
    creds = { ok: true, credentials: [parsed] };
  } catch {
    creds = { ok: false, credentials: [] };
  }

  const decision = evaluateGate(creds, rule, new Date());
  const now = new Date().toISOString();

  await db.run(
    `INSERT INTO access_events (org_id, pass_id, access_point_id, verdict, reasons, credential_id, action, actuator_detail, created_at)
     VALUES (1, $1, $2, $3, $4, $5, 'check', NULL, $6)`,
    [decision.usedPassId || null, accessPointId, decision.verdict, JSON.stringify(decision.reasons), creds.credentials[0]?.id || null, now],
  );

  const anomaly = detectAnomaly(
    (await db.all<AccessEventRow>('SELECT pass_id, access_point_id, verdict, created_at FROM access_events ORDER BY created_at DESC LIMIT 50')).map((e) => ({
      passId: e.pass_id || 'unknown',
      accessPointId: e.access_point_id,
      hour: new Date(e.created_at).getHours(),
      verdict: e.verdict,
      tsMs: Date.parse(e.created_at),
    })),
  );
  if (anomaly) {
    await db.run(`INSERT INTO anomaly_alerts (org_id, pass_id, severity, reasons, created_at) VALUES (1,$1,$2,$3,$4)`, [
      anomaly.passId,
      anomaly.severity,
      JSON.stringify(anomaly.reasons),
      now,
    ]);
  }

  return NextResponse.json({ ...decision, anomaly });
}
