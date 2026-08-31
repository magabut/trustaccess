import { beforeAll, describe, it, expect } from 'vitest';
import { initDb, seedDemo, type DBSession } from '../src/lib/db';

let db: DBSession;
beforeAll(() => {
  db = initDb(':memory:');
});

describe('db layer', () => {
  it('seeds demo org with areas, gates, rules, tariffs', () => {
    const { orgId, counts } = seedDemo(db);
    expect(counts.areas).toBeGreaterThanOrEqual(3);
    expect(counts.accessPoints).toBeGreaterThanOrEqual(3);
    expect(counts.rules).toBeGreaterThanOrEqual(3);
    const org = db.get<any>('SELECT * FROM organizations WHERE id = ?', [orgId]);
    expect(org.currency).toBe('IDR');
    const rule = db.get<any>('SELECT * FROM access_rules WHERE access_point_id = (SELECT id FROM access_points WHERE name = ?)', ['Pintu Lab']);
    expect(JSON.parse(rule.prerequisites)).toEqual(['SafetyInduction']);
  });

  it('persists an access event', () => {
    const { orgId } = seedDemo(db);
    const { lastInsertRowid } = db.run(
      'INSERT INTO access_events (org_id, pass_id, access_point_id, verdict, reasons, credential_id, action, actuator_detail, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
      [orgId, 'pass_1', 1, 'GRANT', '[]', 'cred_1', 'open_gate', 'LED_HIJAU', new Date().toISOString()],
    );
    expect(lastInsertRowid).toBeTruthy();
  });
});
