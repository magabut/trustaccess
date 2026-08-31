# Event Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After e.id login, force every user to choose one of three main events (Concert optional as a bonus) before entering the dashboard, with capacity enforcement and per-event count/capacity shown on both the selection page and the dashboard.

**Architecture:** Add an `events` + `event_choices` schema (new migration), a constants/validation module, a `GET /events` selection page, a `POST /api/events/choose` mutation endpoint, redirect the post-login client to `/events`, and guard `/dashboard` to redirect users without a main choice. Both `/events` and `/dashboard` display each event's chooser count and capacity.

**Tech Stack:** Next.js 16.3.3 (server components + route handlers), React 19, TypeScript, `pg`, PostgreSQL 16, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-31-event-selection-design.md`

## Global Constraints

- Work in the **docker worktree** path `app/` (resolves to `.worktrees/docker-postgresql-vps/app`), the environment with `pg` installed and where `npm run build`/`npm test` pass.
- Use PostgreSQL `$1` placeholders and `await` on all DB calls (async `pg` pool).
- Migrations live in `app/src/lib/db/migrations/` and are applied by `runMigrations` at startup; new migration must be idempotent-agnostic (migration runner tracks applied versions).
- Seeding must be idempotent (guard against duplicate inserts).
- Every server page/route that needs identity uses `getSession()` from `@/lib/session`; resolve the user row by `email`.
- Do not change existing API response shapes (login result contract is preserved).
- Run builds and tests from `app/` before committing. Commit on the docker branch first, then mirror to `main`.

---

### Task 1: Add events schema migration

**Files:**
- Create: `app/src/lib/db/migrations/002_events.sql`

**Interfaces:**
- Produces: tables `events(id, slug UNIQUE, name, capacity, created_at)` and `event_choices(id, user_id FK users, slug FK events, created_at, UNIQUE(user_id, slug))`.

- [ ] **Step 1: Create the migration file**

`app/src/lib/db/migrations/002_events.sql`:

```sql
CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE event_choices (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL REFERENCES events(slug),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);
```

- [ ] **Step 2: Verify the migration applies**

Run (against a disposable test DB or the migration runner):

```bash
cd app
DATABASE_URL="postgresql://..." npx tsx -e "import {runMigrations} from './src/lib/db/migrate'; await runMigrations(process.env.DATABASE_URL!)"
```

Expected: succeeds, and `SELECT to_regclass('public.events')` and `public.event_choices` are non-null.

- [ ] **Step 3: Commit**

```bash
git add app/src/lib/db/migrations/002_events.sql
git commit -m "feat: add events schema migration"
```

### Task 2: Add seed for the four events

**Files:**
- Modify: `app/src/lib/db/seed.ts`

**Interfaces:**
- Consumes: `DBSession` (async `get`/`run`).
- Produces: four `events` rows (panel-discussion 15, workshop 15, vibe-coding 15, concert 100) guaranteed present after `seedDemo`.

- [ ] **Step 1: Extend `seedDemo` with idempotent event insert**

Append before the `if (eid)` block in `app/src/lib/db/seed.ts`:

```ts
  const events: Array<[string, string, number]> = [
    ['panel-discussion', 'Panel Discussion', 15],
    ['workshop', 'Workshop', 15],
    ['vibe-coding', 'Vibe Coding', 15],
    ['concert', 'Concert', 100],
  ];
  for (const [slug, name, capacity] of events) {
    const existing = await db.get<{ id: number }>('SELECT id FROM events WHERE slug = $1', [slug]);
    if (existing) continue;
    await db.run(
      'INSERT INTO events (slug, name, capacity) VALUES ($1, $2, $3)',
      [slug, name, capacity],
    );
  }
```

- [ ] **Step 2: Verify seed is idempotent**

Run `cd app && DATABASE_URL="<test db>" npx tsx scripts/seed.ts` twice; the second run must not error and must not duplicate events (`SELECT COUNT(*) FROM events` stays 4).

- [ ] **Step 3: Commit**

```bash
git add app/src/lib/db/seed.ts
git commit -m "feat: seed four event choices"
```

### Task 3: Add events constants/validation module

**Files:**
- Create: `app/src/lib/events.ts`

**Interfaces:**
- Produces:
  - `export const EVENTS: Record<string, { name: string; capacity: number; main: boolean }>`
  - `export function isKnownEvent(slug: string): boolean`
  - `export function isMainEvent(slug: string): boolean`
  - `export const MAIN_SLUGS: string[]`
  - `export const ALL_SLUGS: string[]`

- [ ] **Step 1: Create the module**

`app/src/lib/events.ts`:

```ts
export const EVENTS: Record<string, { name: string; capacity: number; main: boolean }> = {
  'panel-discussion': { name: 'Panel Discussion', capacity: 15, main: true },
  workshop: { name: 'Workshop', capacity: 15, main: true },
  'vibe-coding': { name: 'Vibe Coding', capacity: 15, main: true },
  concert: { name: 'Concert', capacity: 100, main: false },
};

export const ALL_SLUGS = Object.keys(EVENTS);
export const MAIN_SLUGS = ALL_SLUGS.filter((s) => EVENTS[s].main);

export function isKnownEvent(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(EVENTS, slug);
}

export function isMainEvent(slug: string): boolean {
  return !!EVENTS[slug]?.main;
}
```

- [ ] **Step 2: Verify with a quick check**

Run `cd app && npx tsx -e "import {MAIN_SLUGS,isMainEvent} from './src/lib/events'; console.log(MAIN_SLUGS, isMainEvent('concert'))"`.

Expected: prints `[ 'panel-discussion', 'workshop', 'vibe-coding' ] false`.

- [ ] **Step 3: Commit**

```bash
git add app/src/lib/events.ts
git commit -m "feat: add events constants and validators"
```

### Task 4: Add choose-event API endpoint

**Files:**
- Create: `app/src/app/api/events/choose/route.ts`
- Test: `app/tests/events.test.ts`

**Interfaces:**
- Consumes: `getSession()`, `getDb()`, `EVENTS`, `isKnownEvent`, `isMainEvent`.
- Produces: `POST /api/events/choose` accepting `{ slug }`, returning `{ ok: true, counts }` or `{ ok: false, error }`.

- [ ] **Step 1: Write the failing unit tests**

`app/tests/events.test.ts` — test the pure helpers in `events-service` (no live DB needed because `events-service` does not touch the DB until a real `DBSession` is passed; test the pure functions and the decision rules directly):

```ts
import { describe, expect, it } from 'vitest';
import { hasMainChoice } from '../src/lib/events-service';
import { EVENTS, MAIN_SLUGS, isMainEvent } from '../src/lib/events';

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx vitest run tests/events.test.ts`
Expected: FAIL (module `events-service` not defined).

- [ ] **Step 3: Implement a testable decision service**

Create `app/src/lib/events-service.ts` with the pure helpers the route wraps:

```ts
import { EVENTS, isKnownEvent, isMainEvent } from './events';
import type { DBSession } from './db';

export type EventCounts = Record<string, number>;

export type EventsService = {
  countsFor(db: DBSession): Promise<EventCounts>;
  hasMain(slugs: string[]): boolean;
};

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
```

- [ ] **Step 4: Implement the route**

Create `app/src/app/api/events/choose/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db';
import { EVENTS, isKnownEvent, isMainEvent } from '@/lib/events';
import { loadEventCounts, currentSlugs, hasMainChoice } from '@/lib/events-service';

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

  const canBeMain = isMainEvent(slug);
  if (canBeMain && hasMainChoice(before)) {
    return NextResponse.json({ ok: false, error: 'bad_main_choice' }, { status: 409 });
  }

  const counts = await loadEventCounts(db);
  if (counts[slug] >= EVENTS[slug].capacity) {
    return NextResponse.json({ ok: false, error: 'quota_full' }, { status: 409 });
  }

  await db.run(
    `INSERT INTO event_choices (user_id, slug) VALUES ($1, $2)`,
    [user.id, slug],
  );
  const after = await loadEventCounts(db);
  return NextResponse.json({ ok: true, counts: after });
}
```

Note on the main rule: each main event has `main:true`; choosing a second main event while already holding one is rejected via `hasMainChoice(before)`. Concert (`main:false`) is always allowed as bonus.

- [ ] **Step 5: Add DB-backed tests (skip when no TEST_DATABASE_URL)**

Add a route-level test that runs only when `TEST_DATABASE_URL` is set (mirroring the existing skipped `db-adapter.test.ts` pattern), verifying: picking a main event succeeds; picking the same event twice is rejected; quota-full is rejected when a synthetic choice pushes past capacity.

- [ ] **Step 6: Run tests and build**

Run: `cd app && npx vitest run tests/events.test.ts && npm run build`
Expected: PASS (+ existing tests), build succeeds.

- [ ] **Step 7: Commit**

```bash
git add app/src/app/api/events/choose/route.ts app/src/lib/events-service.ts app/tests/events.test.ts
git commit -m "feat: add choose-event api endpoint"
```

### Task 5: Add the events selection page

**Files:**
- Create: `app/src/app/events/page.tsx`

**Interfaces:**
- Consumes: `getSession()`, `getDb()`, `EVENTS`, `loadEventCounts`, `currentSlugs`, `hasMainChoice`.
- Produces: `GET /events` — if no session → redirect `/login`; if no main choice → render selectable cards; if a main choice exists → render current selection + "Go to Dashboard" link. Requires a form/script to POST to `/api/events/choose`.

- [ ] **Step 1: Implement the page (client component for the picker)**

Create `app/src/app/events/page.tsx` as a server component that fetches session, counts, and current slugs, then renders a client `EventPicker` with the four cards and a "Select" button that POSTs to `/api/events/choose`. Create `app/src/app/events/EventPicker.tsx` (client) holding the interactive state, showing `Y / capacity` per card, disabling a card when quota is full or already chosen, and navigating to `/dashboard` when a main choice is made.

- [ ] **Step 2: Verify the page builds**

Run: `cd app && npm run build`
Expected: `/events` route builds (dynamic `ƒ`).

- [ ] **Step 3: Commit**

```bash
git add app/src/app/events/page.tsx app/src/app/events/EventPicker.tsx
git commit -m "feat: add event selection page"
```

### Task 6: Redirect post-login to /events

**Files:**
- Modify: `app/src/app/login/page.tsx`

**Interfaces:**
- Produces: after `approved:true`, the client routes to `/events` instead of `/dashboard`.

- [ ] **Step 1: Change the redirect target**

In `app/src/app/login/page.tsx`, replace `router.replace('/dashboard')` with `router.replace('/events')`.

- [ ] **Step 2: Build**

Run: `cd app && npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/src/app/login/page.tsx
git commit -m "feat: redirect post-login to event selection"
```

### Task 7: Guard dashboard and show event summary

**Files:**
- Modify: `app/src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `getSession()`, `getDb()`, `currentSlugs`, `hasMainChoice`, `loadEventCounts`, `EVENTS`.
- Produces: `/dashboard` redirects to `/events` when the user has no main choice; otherwise renders (with the existing home-style navbar) a summary of each event's count/capacity.

- [ ] **Step 1: Add the guard**

At the top of `Dashboard`, after resolving the session, load `currentSlugs` and `let slugs = ...`; if `!hasMainChoice(slugs)` → `redirect('/events')`.

- [ ] **Step 2: Render the event summary**

Add a grid/cards block (below the existing stat cards, before the action cards) that maps `Object.entries(EVENTS)` to show `{name} — {counts[slug]} / {capacity}` using `loadEventCounts`.

- [ ] **Step 3: Build**

Run: `cd app && npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/src/app/dashboard/page.tsx
git commit -m "feat: guard dashboard and show event summary"
```

### Task 8: Mirror to main and redeploy

**Files:**
- Sync: all files touched by Tasks 1-7 copied from the docker worktree to `main`'s `app/`.

**Interfaces:**
- Produces: `main` and the docker branch contain identical event-selection code; the running compose stack serves the feature.

- [ ] **Step 1: Sync files to main**

Copy these paths from `.worktrees/docker-postgresql-vps/app/...` to `/Users/panjipusdatin.lan/Desktop/lomba/app/...`:
- `src/lib/db/migrations/002_events.sql`
- `src/lib/db/seed.ts`
- `src/lib/events.ts`
- `src/lib/events-service.ts`
- `src/app/api/events/choose/route.ts`
- `src/app/events/page.tsx`
- `src/app/events/EventPicker.tsx`
- `src/app/login/page.tsx`
- `src/app/dashboard/page.tsx`
- `tests/events.test.ts`

- [ ] **Step 2: Commit on main**

```bash
git add app/... && git commit -m "feat: event selection (mirror to main)"
```

- [ ] **Step 3: Push origin**

```bash
git push origin main
```

- [ ] **Step 4: Rebuild and redeploy the compose stack (from docker worktree)**

```bash
cd .worktrees/docker-postgresql-vps/app
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d
```

- [ ] **Step 5: Verify**

```bash
curl -fsS http://localhost/api/health   # {"ok":true}
docker compose --env-file .env.production exec -T postgres psql -U trustaccess -d trustaccess -c "SELECT slug, capacity, (SELECT COUNT(*) FROM event_choices c WHERE c.slug=e.slug) AS chosen FROM events e ORDER BY id;"
```

Expected: 4 event rows with their capacities and current chooser counts.
