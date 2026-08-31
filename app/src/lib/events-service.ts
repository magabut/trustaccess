import { EVENTS, isKnownEvent, isMainEvent } from './events';
import type { DBSession } from './db';

export type EventCounts = Record<string, number>;

export async function loadEventCounts(db: DBSession): Promise<EventCounts> {
  const rows = await db.all<{ slug: string; n: number }>(
    `SELECT slug, COUNT(*)::int AS n FROM event_choices GROUP BY slug`,
  );
  const counts: EventCounts = {};
  for (const s of Object.keys(EVENTS)) counts[s] = 0;
  for (const r of rows) counts[r.slug] = r.n;
  return counts;
}

export function hasMainChoice(slugs: string[]): boolean {
  return slugs.some((s) => isMainEvent(s));
}

export async function currentSlugs(db: DBSession, userEmail: string): Promise<string[]> {
  const rows = await db.all<{ slug: string }>(
    `SELECT c.slug FROM event_choices c JOIN users u ON u.id = c.user_id WHERE u.email = $1`,
    [userEmail],
  );
  return rows.map((r) => r.slug);
}
