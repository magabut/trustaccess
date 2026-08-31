# Event Selection for TrustAccess

## Goal

After a successful e.id login, before entering the dashboard, every user must choose
their event of choice for the hackathon. The selection acts as a gate to the dashboard.
A summary (count of choosers and total capacity per event) is shown both on the selection
page and on the dashboard.

## Business rules (confirmed)

- Four events exist, seeded statically:
  - `panel-discussion` — Panel Discussion, capacity 15
  - `workshop` — Workshop, capacity 15
  - `vibe-coding` — Vibe Coding, capacity 15
  - `concert` — Concert, capacity 100
- Every user **must** choose exactly one of the three main events
  (Panel Discussion / Workshop / Vibe Coding) before they may access the dashboard.
- Concert is an **optional bonus**: a user may additionally choose Concert on top of
  their one main choice. Concert alone does not satisfy the mandatory choice.
- Each user may pick Event X at most once (a user cannot hold the same event twice;
  unique pair `(user_id, slug)`).
- Capacity is enforced: when a user chooses an event whose current chooser count is
  already >= capacity, the choice is rejected.
- The user may change their main choice at any time (as long as the new event has capacity).
- Accessing `/dashboard` (or `/events`) when the user has no main choice redirects to `/events`.
- `/dashboard` also shows the count/capacity summary.

## Data model

New migration `002_events.sql`:

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

Seed (idempotent, part of migration or seed script):

- panel-discussion / Panel Discussion / 15
- workshop / Workshop / 15
- vibe-coding / Vibe Coding / 15
- concert / Concert / 100

The "exactly one main choice" invariant is enforced in application code, not by a DB
constraint, because Concert may be picked as a bonus alongside a main choice.

## Configuration / constants

Central list of event slugs and a `cap isMain` flag:

```ts
export const EVENTS = {
  'panel-discussion': { name: 'Panel Discussion', capacity: 15, main: true },
  workshop: { name: 'Workshop', capacity: 15, main: true },
  'vibe-coding': { name: 'Vibe Coding', capacity: 15, main: true },
  concert: { name: 'Concert', capacity: 100, main: false },
} as const;
```

## Flow

1. `POST /api/verifier/login/result` returns `approved: true`; the client
   (`login/page.tsx`) redirects to `/events` instead of `/dashboard`.
2. `GET /events` (Server Component):
   - No session → redirect `/login`.
   - Load current choices for the user.
   - If no main choice: render 4 cards with a "Select" button; Concert marked optional.
   - If a main choice exists: render cards highlighting current selection, allow change,
     and show a "Go to Dashboard" link.
3. `POST /api/events/choose` receives `{ slug }`:
   - Validate session, slug, capacity (count choosers), and the main/bonus rules.
   - Insert into `event_choices` (unique `(user_id, slug)` guards duplicates).
   - Return `{ ok: true, counts }` or an error with a friendly message (e.g. quota full).
4. `GET /dashboard`: if the user has no main choice, redirect to `/events`; otherwise
   render the dashboard (with navbar as on the home page) plus the event summary.

## Endpoint contract

`POST /api/events/choose`
- Request: `{ "slug": "workshop" }`
- Success 200: `{ ok: true, counts: Record<slug, number> }`
- Errors 4xx with `{ ok: false, error: string }`:
  - `not_authenticated`
  - `invalid_event`
  - `quota_full`
  - `already_chosen` (duplicate same event for this user)
  - `bad_main_choice` (e.g. only concert chosen and no main)

## Files

- New `app/src/lib/db/migrations/002_events.sql`
- New `app/src/app/events/page.tsx`
- New `app/src/app/api/events/choose/route.ts`
- New `app/src/lib/events.ts` (constants + validation helpers)
- Modify `app/src/app/login/page.tsx` (redirect target `/events`)
- Modify `app/src/app/dashboard/page.tsx` (guard + summary + home-style navbar)
- New `app/tests/events.test.ts` (unit tests for rules/counts)

## Guarding

Dashboard guard reads the user's choices; "has main choice" is determined by presence of
at least one `main:true` slug. If none, redirect to `/events`.
