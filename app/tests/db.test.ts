import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { runMigrations } from '../src/lib/db/migrate';
import { initDb, type DBSession } from '../src/lib/db';
import { seedDemo } from '../src/lib/db/seed';

const url = process.env.TEST_DATABASE_URL;

let db: DBSession;

beforeAll(async () => {
  if (!url) return;
  await runMigrations(url);
  db = await initDb(url);
});

afterAll(async () => {
  if (db) await db.close();
});

describe.skipIf(!url)('db layer', () => {
  it('seeds demo org with areas, gates, rules, tariffs', async () => {
    const { orgId, counts } = await seedDemo(db);
    expect(counts.areas).toBeGreaterThanOrEqual(3);
    expect(counts.accessPoints).toBeGreaterThanOrEqual(3);
    expect(counts.rules).toBeGreaterThanOrEqual(3);
    const org = await db.get<any>('SELECT * FROM organizations WHERE id = $1', [orgId]);
    expect(org!.currency).toBe('IDR');
    const rule = await db.get<any>(
      'SELECT * FROM access_rules WHERE access_point_id = (SELECT id FROM access_points WHERE name = $1)',
      ['Pintu Lab'],
    );
    expect(JSON.parse(rule!.prerequisites)).toEqual(['StudentCredential', 'SafetyInduction']);
  });

  it('is idempotent across repeated calls', async () => {
    const first = await seedDemo(db);
    const second = await seedDemo(db);
    expect(second.orgId).toBe(first.orgId);
    expect(second.counts).toEqual(first.counts);
  });

  it('persists an access event', async () => {
    const { orgId } = await seedDemo(db);
    const { lastInsertRowid } = await db.run(
      'INSERT INTO access_events (org_id, pass_id, access_point_id, verdict, reasons, credential_id, action, actuator_detail, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
      [orgId, 'pass_1', 1, 'GRANT', '[]', 'cred_1', 'open_gate', 'LED_HIJAU', new Date().toISOString()],
    );
    expect(lastInsertRowid).toBeTruthy();
  });
});
