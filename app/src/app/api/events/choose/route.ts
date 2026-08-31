import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { EVENTS, isKnownEvent, isMainEvent } from '@/lib/events';
import { loadEventCounts, currentSlugs } from '@/lib/events-service';

export async function POST(req: Request) {
  const sess = await getSession();
  if (!sess) return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 });
  const email = sess.email;

  let slug: unknown;
  try {
    const body = await req.json();
    slug = body?.slug;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json_body' }, { status: 400 });
  }
  if (typeof slug !== 'string' || !isKnownEvent(slug)) {
    return NextResponse.json({ ok: false, error: 'invalid_event' }, { status: 400 });
  }

  const db = getDb();
  const user = await db.get<{ id: number }>('SELECT id FROM users WHERE email = $1', [email]);
  if (!user) return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 });

  const before = await currentSlugs(db, email);
  if (before.includes(slug)) {
    return NextResponse.json({ ok: false, error: 'already_chosen' }, { status: 409 });
  }

  const counts = await loadEventCounts(db);
  if (counts[slug] >= EVENTS[slug].capacity) {
    return NextResponse.json({ ok: false, error: 'quota_full' }, { status: 409 });
  }

  if (isMainEvent(slug)) {
    const currentMain = before.find((s) => isMainEvent(s));
    if (currentMain && currentMain !== slug) {
      await db.run('DELETE FROM event_choices WHERE user_id = $1 AND slug = $2', [user.id, currentMain]);
    }
  }

  await db.run(
    `INSERT INTO event_choices (user_id, slug) VALUES ($1, $2)`,
    [user.id, slug],
  );
  const after = await loadEventCounts(db);
  return NextResponse.json({ ok: true, counts: after });
}
