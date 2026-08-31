import type { DBSession } from '../db';
import { toOrgLocal } from '../time';
import type { EidClient } from '../types';

export function seedDemo(
  db: DBSession,
  eid?: EidClient,
): { orgId: number; counts: Record<string, number> } {
  const counts: Record<string, number> = {};

  const orgId = db.run(
    "INSERT INTO organizations (name, tz_offset_min, currency) VALUES ('UPN Kampus', 420, 'IDR')",
  ).lastInsertRowid as number;

  const areaIds: Record<string, number> = {};
  for (const area of ['Ruang Umum', 'Laboratorium', 'Parkir']) {
    areaIds[area] = db.run('INSERT INTO areas (org_id, name) VALUES (?, ?)', [orgId, area]).lastInsertRowid as number;
  }

  const pointIds: Record<string, number> = {};
  const points: Array<[string, 'gate' | 'locker', string]> = [
    ['Pintu Utama', 'gate', 'Ruang Umum'],
    ['Pintu Lab', 'gate', 'Laboratorium'],
    ['Loker A-12', 'locker', 'Ruang Umum'],
  ];
  for (const [name, kind, area] of points) {
    pointIds[name] = db.run(
      'INSERT INTO access_points (org_id, area_id, name, kind) VALUES (?, ?, ?, ?)',
      [orgId, areaIds[area], name, kind],
    ).lastInsertRowid as number;
  }

  db.run('INSERT INTO access_rules (access_point_id, required_type, prerequisites, area_scope, open_minute, close_minute) VALUES (?,?,?,?,?,?)',
    [pointIds['Pintu Utama'], 'AccessPass', '[]', '["Ruang Umum"]', 420, 1260]);
  db.run('INSERT INTO access_rules (access_point_id, required_type, prerequisites, area_scope, open_minute, close_minute) VALUES (?,?,?,?,?,?)',
    [pointIds['Pintu Lab'], 'LaboratoryAccess', '["StudentCredential","SafetyInduction"]', '["Laboratorium"]', 420, 1080]);
  db.run('INSERT INTO access_rules (access_point_id, required_type, prerequisites, area_scope, open_minute, close_minute) VALUES (?,?,?,?,?,?)',
    [pointIds['Loker A-12'], 'AccessPass', '[]', '["Ruang Umum"]', 0, 1440]);

  db.run('INSERT INTO tariffs (org_id, name, area_scope, price_cents, valid_hours) VALUES (?,?,?,?,?)',
    [orgId, 'Day Pass Umum', '["Ruang Umum"]', 25_000, 24]);
  db.run('INSERT INTO tariffs (org_id, name, area_scope, price_cents, valid_hours) VALUES (?,?,?,?,?)',
    [orgId, 'Parkir Harian', '["Parkir"]', 10_000, 24]);
  db.run('INSERT INTO tariffs (org_id, name, area_scope, price_cents, valid_hours) VALUES (?,?,?,?,?)',
    [orgId, 'Akses Lab', '["Laboratorium"]', 15_000, 24]);

  db.run('INSERT INTO credential_templates (org_id, name, fields_json) VALUES (?,?,?)',
    [orgId, 'AccessPass', '["fullName","area","validFrom","validUntil"]']);
  db.run('INSERT INTO credential_templates (org_id, name, fields_json) VALUES (?,?,?)',
    [orgId, 'SafetyInduction', '["fullName","expiry"]']);

  db.run("INSERT INTO users (org_id, eid_subject, name, email, role) VALUES (?,?,?,?,?)",
    [orgId, 'did:eid:demo-admin', 'Demo Admin', 'admin@kampus.demo', 'admin']);
  db.run("INSERT INTO users (org_id, eid_subject, name, email, role) VALUES (?,?,?,?,?)",
    [orgId, 'did:eid:demo-host', 'Budi Manahan', 'budi@kampus.demo', 'host']);

  if (eid) {
    eid.issueCredential({
      templateName: 'SafetyInduction',
      holderEmail: 'budi@kampus.demo',
      claims: { fullName: 'Budi Manahan', expiry: '2027-12-31' },
      validUntil: '2027-12-31T00:00:00.000Z',
    });
  }

  counts.areas = db.get<{ n: number }>('SELECT COUNT(*) AS n FROM areas WHERE org_id = ?', [orgId])?.n ?? 0;
  counts.accessPoints = db.get<{ n: number }>('SELECT COUNT(*) AS n FROM access_points WHERE org_id = ?', [orgId])?.n ?? 0;
  counts.rules = db.get<{ n: number }>('SELECT COUNT(*) AS n FROM access_rules r JOIN access_points p ON p.id = r.access_point_id WHERE p.org_id = ?', [orgId])?.n ?? 0;
  counts.tariffs = db.get<{ n: number }>('SELECT COUNT(*) AS n FROM tariffs WHERE org_id = ?', [orgId])?.n ?? 0;

  return { orgId, counts };
}

export function addHoursISO(iso: string, hours: number): string {
  return new Date(Date.parse(iso) + hours * 3_600_000).toISOString();
}
