import { describe, expect, it } from 'vitest';
import { hasMainChoice, currentSlugs, loadEventCounts } from '../src/lib/events-service';
import { EVENTS, MAIN_SLUGS, isMainEvent } from '../src/lib/events';
import { runMigrations } from '../src/lib/db/migrate';
import type { DBSession } from '../src/lib/db';
import { createTestDb, closeTestDb } from './test-db';

async function seed(db: DBSession) {
  await db.run('DELETE FROM event_choices');
  await db.run('DELETE FROM events');
  await db.run('INSERT INTO organizations (name) VALUES ($1)', ['Test Org']);
  await db.run(
    `INSERT INTO users (org_id, name, email) VALUES ((SELECT id FROM organizations LIMIT 1), $1, $2)`,
    ['Test User', 'choose@example.com'],
  );
  for (const [s, e] of Object.entries(EVENTS)) {
    await db.run('INSERT INTO events (slug, name, capacity) VALUES ($1, $2, $3)', [s, e.name, e.capacity]);
  }
  return (await db.get<{ id: number }>('SELECT id FROM users WHERE email = $1', ['choose@example.com']))!.id;
}

describe('events decision rules', () => {
  it('flags main events and not concert', () => {
    expect(isMainEvent('workshop')).toBe(true);
    expect(isMainEvent('concert')).toBe(false);
  });

  it('exposes exactly the three main slugs', () => {
    expect(MAIN_SLUGS.sort()).toEqual(['panel-discussion', 'vibe-coding', 'workshop']);
  });

  it('hasMainChoice is true only when a main event is present', () => {
    expect(hasMainChoice(['workshop'])).toBe(true);
    expect(hasMainChoice(['concert'])).toBe(false);
    expect(hasMainChoice(['concert', 'panel-discussion'])).toBe(true);
    expect(hasMainChoice([])).toBe(false);
  });

  it('every known event has a positive capacity', () => {
    for (const e of Object.values(EVENTS)) expect(e.capacity).toBeGreaterThan(0);
  });
});

describe('events service against database', () => {
  it.skipIf(!process.env.TEST_DATABASE_URL)('loads counts and current slugs from a real session', async () => {
    const db = await createTestDb();
    if (!db) return;

    try {
      await runMigrations(process.env.TEST_DATABASE_URL!);
      const userId = await seed(db);
      expect(await loadEventCounts(db)).toMatchObject({ workshop: 0, concert: 0 });

      await db.run('INSERT INTO event_choices (user_id, slug) VALUES ($1, $2)', [userId, 'workshop']);
      expect((await loadEventCounts(db)).workshop).toBe(1);
      expect(await currentSlugs(db, 'choose@example.com')).toEqual(['workshop']);
    } finally {
      await db.run('DELETE FROM event_choices');
      await db.run('DELETE FROM events');
      await closeTestDb(db);
    }
  });
});
