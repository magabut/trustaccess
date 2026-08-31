import type { DBSession } from '../db';
import type { EidClient } from '../types';

export async function seedDemo(
  db: DBSession,
  eid?: EidClient,
): Promise<{ orgId: number; counts: Record<string, number> }> {
  const counts: Record<string, number> = {};

  let org = await db.get<{ id: number }>("SELECT id FROM organizations WHERE name = $1", ['UPN Kampus']);
  let orgId: number;
  if (org) {
    orgId = org.id;
  } else {
    const { lastInsertRowid } = await db.run(
      "INSERT INTO organizations (name, tz_offset_min, currency) VALUES ($1, $2, $3) RETURNING id",
      ['UPN Kampus', 420, 'IDR'],
    );
    orgId = lastInsertRowid;
  }

  const areaIds: Record<string, number> = {};
  for (const area of ['Ruang Umum', 'Laboratorium', 'Parkir']) {
    const existing = await db.get<{ id: number }>('SELECT id FROM areas WHERE org_id = $1 AND name = $2', [orgId, area]);
    if (existing) {
      areaIds[area] = existing.id;
      continue;
    }
    const { lastInsertRowid } = await db.run(
      'INSERT INTO areas (org_id, name) VALUES ($1, $2) RETURNING id',
      [orgId, area],
    );
    areaIds[area] = lastInsertRowid;
  }

  const pointIds: Record<string, number> = {};
  const points: Array<[string, 'gate' | 'locker', string]> = [
    ['Pintu Utama', 'gate', 'Ruang Umum'],
    ['Pintu Lab', 'gate', 'Laboratorium'],
    ['Loker A-12', 'locker', 'Ruang Umum'],
  ];
  for (const [name, kind, area] of points) {
    const existing = await db.get<{ id: number }>(
      'SELECT id FROM access_points WHERE org_id = $1 AND name = $2',
      [orgId, name],
    );
    if (existing) {
      pointIds[name] = existing.id;
      continue;
    }
    const { lastInsertRowid } = await db.run(
      'INSERT INTO access_points (org_id, area_id, name, kind) VALUES ($1, $2, $3, $4) RETURNING id',
      [orgId, areaIds[area], name, kind],
    );
    pointIds[name] = lastInsertRowid;
  }

  const rules: Array<[string, string, string, string, number, number]> = [
    ['Pintu Utama', 'AccessPass', '[]', '["Ruang Umum"]', 420, 1260],
    ['Pintu Lab', 'LaboratoryAccess', '["StudentCredential","SafetyInduction"]', '["Laboratorium"]', 420, 1080],
    ['Loker A-12', 'AccessPass', '[]', '["Ruang Umum"]', 0, 1440],
  ];
  for (const [pointName, requiredType, prerequisites, areaScope, openMinute, closeMinute] of rules) {
    const pointId = pointIds[pointName];
    const existing = await db.get<{ id: number }>(
      'SELECT id FROM access_rules WHERE access_point_id = $1 AND required_type = $2',
      [pointId, requiredType],
    );
    if (existing) continue;
    await db.run(
      'INSERT INTO access_rules (access_point_id, required_type, prerequisites, area_scope, open_minute, close_minute) VALUES ($1,$2,$3,$4,$5,$6)',
      [pointId, requiredType, prerequisites, areaScope, openMinute, closeMinute],
    );
  }

  const tariffs: Array<[string, string, number, number]> = [
    ['Day Pass Umum', '["Ruang Umum"]', 25_000, 24],
    ['Parkir Harian', '["Parkir"]', 10_000, 24],
    ['Akses Lab', '["Laboratorium"]', 15_000, 24],
  ];
  for (const [name, areaScope, priceCent, validHours] of tariffs) {
    const existing = await db.get<{ id: number }>(
      'SELECT id FROM tariffs WHERE org_id = $1 AND name = $2',
      [orgId, name],
    );
    if (existing) continue;
    await db.run(
      'INSERT INTO tariffs (org_id, name, area_scope, price_cents, valid_hours) VALUES ($1,$2,$3,$4,$5)',
      [orgId, name, areaScope, priceCent, validHours],
    );
  }

  const templates: Array<[string, string]> = [
    ['AccessPass', '["fullName","area","validFrom","validUntil"]'],
    ['SafetyInduction', '["fullName","expiry"]'],
  ];
  for (const [name, fieldsJson] of templates) {
    const existing = await db.get<{ id: number }>(
      'SELECT id FROM credential_templates WHERE org_id = $1 AND name = $2',
      [orgId, name],
    );
    if (existing) continue;
    await db.run(
      'INSERT INTO credential_templates (org_id, name, fields_json) VALUES ($1,$2,$3)',
      [orgId, name, fieldsJson],
    );
  }

  const users: Array<[string, string, string, string]> = [
    ['did:eid:demo-admin', 'Demo Admin', 'admin@kampus.demo', 'admin'],
    ['did:eid:demo-host', 'Budi Manahan', 'budi@kampus.demo', 'host'],
  ];
  for (const [eidSubject, name, email, role] of users) {
    const existing = await db.get<{ id: number }>('SELECT id FROM users WHERE email = $1', [email]);
    if (existing) continue;
    await db.run(
      'INSERT INTO users (org_id, eid_subject, name, email, role) VALUES ($1,$2,$3,$4,$5)',
      [orgId, eidSubject, name, email, role],
    );
  }

  const events: Array<[string, string, number]> = [
    ['workshop-ai', 'Workshop Kecerdasan Buatan', 40],
    ['seminar-cyber', 'Seminar Keamanan Siber', 120],
    ['expo-iot', 'Expo Internet of Things', 200],
    ['competition-hackathon', 'Kompetisi Hackathon', 60],
  ];
  for (const [slug, name, capacity] of events) {
    const existing = await db.get<{ id: number }>('SELECT id FROM events WHERE slug = $1', [slug]);
    if (existing) continue;
    await db.run(
      'INSERT INTO events (slug, name, capacity) VALUES ($1, $2, $3)',
      [slug, name, capacity],
    );
  }

  if (eid) {
    eid.issueCredential({
      templateName: 'SafetyInduction',
      holderEmail: 'budi@kampus.demo',
      claims: { fullName: 'Budi Manahan', expiry: '2027-12-31' },
      validUntil: '2027-12-31T00:00:00.000Z',
    });
  }

  counts.areas = (await db.get<{ n: number }>('SELECT COUNT(*)::int AS n FROM areas WHERE org_id = $1', [orgId]))?.n ?? 0;
  counts.accessPoints = (await db.get<{ n: number }>('SELECT COUNT(*)::int AS n FROM access_points WHERE org_id = $1', [orgId]))?.n ?? 0;
  counts.rules = (await db.get<{ n: number }>('SELECT COUNT(*)::int AS n FROM access_rules r JOIN access_points p ON p.id = r.access_point_id WHERE p.org_id = $1', [orgId]))?.n ?? 0;
  counts.tariffs = (await db.get<{ n: number }>('SELECT COUNT(*)::int AS n FROM tariffs WHERE org_id = $1', [orgId]))?.n ?? 0;

  return { orgId, counts };
}

export function addHoursISO(iso: string, hours: number): string {
  return new Date(Date.parse(iso) + hours * 3_600_000).toISOString();
}
