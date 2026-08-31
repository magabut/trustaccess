# Docker PostgreSQL VPS Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the crashing SQLite runtime with PostgreSQL and package TrustAccess for reproducible VPS deployment using Docker Compose, Caddy HTTPS, and the real e.id verifier flow.

**Architecture:** Keep the current SQL-oriented application boundary, but replace the SQLite implementation with a PostgreSQL pool and PostgreSQL migrations. Run the app, database, and Caddy in separate Compose services; inject all production secrets at runtime and persist only PostgreSQL/Caddy data in named volumes.

**Tech Stack:** Next.js 16.3.3, React 19, TypeScript, Node.js 22 LTS, PostgreSQL 16, `pg`, Docker Compose, Caddy, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-31-docker-postgresql-vps-design.md`

## Global Constraints

- Use Node.js 22 LTS for the application image and supported local runtime.
- Replace SQLite/better-sqlite3 persistence with PostgreSQL; do not introduce an ORM.
- Preserve existing page and API JSON contracts, especially verifier login routes.
- `EID_FAKE=0` and a valid operator-provided `EID_LOGIN_VERIFICATION_ID` are the production defaults.
- PostgreSQL and the web service must not publish public host ports.
- Do not commit `.env` files, credentials, authorization tokens, database files, or backups.
- Production startup must not reset or seed demo data automatically.
- Use a process-level PostgreSQL pool and release connections correctly.
- Run tests before each task commit and run the complete verification suite before claiming completion.

---

### Task 1: Add PostgreSQL Driver and Test Harness

**Files:**
- Modify: `app/package.json`
- Modify: `app/package-lock.json`
- Create: `app/tests/test-db.ts`
- Create: `app/tests/db-adapter.test.ts`

**Interfaces:**
- Produces a test helper that creates a temporary PostgreSQL-backed `DBSession` from `TEST_DATABASE_URL` and tears it down without touching production configuration.

- [ ] **Step 1: Add the PostgreSQL dependency**

Add `pg` to dependencies and `@types/pg` to devDependencies, then regenerate the lockfile with Node 22:

```bash
cd app
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm install pg
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm install -D @types/pg
```

- [ ] **Step 2: Write the failing adapter test**

Create a test that imports the future adapter and expects a PostgreSQL table to accept a parameterized insert and return its generated ID:

```ts
import { describe, expect, it } from 'vitest';
import { initDb } from '../src/lib/db';

describe('PostgreSQL DBSession', () => {
  it('runs parameterized queries and returns inserted row ids', async () => {
    const db = await initDb(process.env.TEST_DATABASE_URL!);
    await db.run('CREATE TEMP TABLE adapter_test (id BIGSERIAL PRIMARY KEY, value TEXT NOT NULL)');
    const result = await db.run('INSERT INTO adapter_test (value) VALUES ($1)', ['ok']);
    const row = await db.get<{ value: string }>('SELECT value FROM adapter_test WHERE id = $1', [result.lastInsertRowid]);
    expect(result.lastInsertRowid).toBeGreaterThan(0);
    expect(row?.value).toBe('ok');
    await db.close();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run:

```bash
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm test -- tests/db-adapter.test.ts
```

Expected: FAIL because the current SQLite `DBSession` is synchronous and has no PostgreSQL implementation.

- [ ] **Step 4: Commit dependency and test setup**

```bash
git commit -m "test: define postgres adapter contract"
```

### Task 2: Convert Schema to PostgreSQL Migrations

**Files:**
- Create: `app/src/lib/db/migrations/001_initial.sql`
- Create: `app/src/lib/db/migrate.ts`
- Modify: `app/src/lib/db/schema.sql` only if retained as a documented legacy reference
- Modify: `app/scripts/seed.ts`
- Create: `app/tests/migrations.test.ts`

**Interfaces:**
- `runMigrations(poolOrUrl: string): Promise<void>` creates `schema_migrations` and applies ordered migration files exactly once.
- `seedDemo(db: DBSession, eid?: EidClient): Promise<...>` remains explicit and becomes idempotent using stable uniqueness checks.

- [ ] **Step 1: Write the failing migration test**

Test against a disposable PostgreSQL database that runs migrations twice, then asserts all application tables exist and the migration table contains one row for `001_initial.sql`.

```ts
it('applies the initial schema idempotently', async () => {
  await runMigrations(process.env.TEST_DATABASE_URL!);
  await runMigrations(process.env.TEST_DATABASE_URL!);
  const db = await initDb(process.env.TEST_DATABASE_URL!);
  const table = await db.get<{ exists: boolean }>(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') AS exists`);
  const applied = await db.get<{ count: string }>(`SELECT COUNT(*)::text AS count FROM schema_migrations WHERE version = '001_initial'`);
  expect(table?.exists).toBe(true);
  expect(applied?.count).toBe('1');
  await db.close();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm test -- tests/migrations.test.ts
```

Expected: FAIL because no PostgreSQL migration runner or PostgreSQL schema exists.

- [ ] **Step 3: Translate the schema**

Copy every table, foreign key, check, index, and default from `src/lib/db/schema.sql` into `001_initial.sql`; replace SQLite `AUTOINCREMENT` with `BIGSERIAL` or identity columns, remove SQLite pragmas, and use PostgreSQL-compatible JSON/text defaults.

- [ ] **Step 4: Implement the migration runner**

Load `.sql` files in lexical order, create `schema_migrations`, run each unapplied migration inside a transaction, insert its version only after success, and expose `runMigrations` for the Compose startup command.

- [ ] **Step 5: Make demo seed explicit and idempotent**

Run migrations before seed, use stable lookups for the organization and demo emails, and avoid inserting duplicate areas, access points, rules, tariffs, templates, and users when the command is repeated.

- [ ] **Step 6: Run migration tests and commit**

```bash
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm test -- tests/migrations.test.ts
git add src/lib/db/migrations src/lib/db/migrate.ts scripts/seed.ts tests/migrations.test.ts
git commit -m "feat: add postgres migrations"
```

### Task 3: Replace SQLite DB Access with PostgreSQL Pool

**Files:**
- Modify: `app/src/lib/db.ts`
- Modify: all database consumers returned by `getDb`, including `app/src/app/api/verifier/login/result/route.ts`
- Modify: `app/src/lib/session.ts` only if session persistence changes are required; JWT remains stateless
- Modify: `app/tests/db-adapter.test.ts`

**Interfaces:**
- `DBSession.all<T>(sql: string, params?: unknown[]): Promise<T[]>`
- `DBSession.get<T>(sql: string, params?: unknown[]): Promise<T | undefined>`
- `DBSession.run(sql: string, params?: unknown[]): Promise<{ lastInsertRowid: number }>`
- `closeDb(): Promise<void>` for tests and graceful process shutdown.

- [ ] **Step 1: Extend the failing tests for `$1` placeholders and errors**

Assert that `all`, `get`, and `run` use PostgreSQL parameters, and that a database error rejects the promise rather than terminating Node.

- [ ] **Step 2: Run adapter tests and confirm failure**

```bash
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm test -- tests/db-adapter.test.ts
```

- [ ] **Step 3: Implement a process-level `pg.Pool`**

Read `DATABASE_URL`, create one pool per process, map `?` placeholders in existing SQL consumers to `$1` style, and make every database operation async. Preserve generated ID behavior by returning `result.rows[0].id` for inserts where callers need it.

- [ ] **Step 4: Update all consumers to await DB operations**

Update routes, pages, services, and seed code that call `getDb().all/get/run`. Do not change API response shapes. Add transactions where user creation/update plus related writes must be atomic.

- [ ] **Step 5: Run focused and full tests**

```bash
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm test
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm run build
```

- [ ] **Step 6: Commit the adapter migration**

```bash
git commit -m "feat: migrate database access to postgres"
```

### Task 4: Add Health Endpoint and Production Error Boundaries

**Files:**
- Create: `app/src/app/api/health/route.ts`
- Modify: `app/src/app/api/verifier/login/start/route.ts`
- Modify: `app/src/app/api/verifier/login/result/route.ts`
- Modify: `app/src/lib/eid/client.ts`
- Create: `app/tests/health.test.ts`

**Interfaces:**
- `GET /api/health` returns `{ ok: true }` with HTTP 200 only when the database responds; otherwise `{ ok: false }` with HTTP 503.

- [ ] **Step 1: Write failing health tests**

Cover healthy database response, unavailable database response, and safe verifier failure response without secret/token text.

- [ ] **Step 2: Run tests and verify failure**

```bash
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm test -- tests/health.test.ts
```

- [ ] **Step 3: Implement health route**

Execute `SELECT 1`, return only the public health shape, and avoid exposing connection details.

- [ ] **Step 4: Harden external API handling**

Use bounded fetch timeouts, validate HTTP/JSON responses, keep error messages safe, and ensure exceptions are converted to route responses instead of process exits. Preserve e.id login response fields.

- [ ] **Step 5: Run tests and commit**

```bash
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm test
git add src/app/api/health src/app/api/verifier src/lib/eid/client.ts tests/health.test.ts
git commit -m "fix: add health checks and safe api errors"
```

### Task 5: Add Docker Production Build

**Files:**
- Create: `app/Dockerfile`
- Create: `app/.dockerignore`
- Modify: `app/next.config.ts` if standalone output is required
- Modify: `app/package.json` with migration/start scripts

**Interfaces:**
- Image command runs migrations and then starts Next.js production server without embedding runtime secrets.

- [ ] **Step 1: Add Docker build configuration**

Use a multi-stage Node 22 image, install dependencies from the lockfile, run `npm run build`, and copy only required standalone/static/public/runtime files into a non-root runner image.

- [ ] **Step 2: Exclude secrets and local artifacts**

Ensure `.dockerignore` excludes `.env*`, `.git`, `.next`, `node_modules`, `data`, `*.db`, logs, tests, and backups.

- [ ] **Step 3: Add migration/start scripts**

Provide a production command equivalent to:

```bash
npm run migrate && npm run start
```

Do not run demo seed during image startup.

- [ ] **Step 4: Build and inspect the image**

```bash
```

Expected: Node 22 and no `.env` or local database files in the image.

- [ ] **Step 5: Commit Docker build files**

```bash
git commit -m "build: add production nextjs image"
```

### Task 6: Add Compose, Caddy, Environment, and Backups

**Files:**
- Create: `app/docker-compose.yml`
- Create: `app/Caddyfile`
- Create: `app/.env.production.example`
- Create: `app/scripts/backup-postgres.sh`
- Create: `app/docs/deployment-vps.md`
- Modify: root `.gitignore` if needed to exclude production env and backups

**Interfaces:**
- `docker compose up -d --build` starts healthy `postgres`, `web`, and `caddy` services.
- `scripts/backup-postgres.sh <output-directory>` creates a timestamped restricted `pg_dump` file.

- [ ] **Step 1: Write Compose validation checks**

Document and test required service names, private ports, healthchecks, restart policies, named volumes, and Caddy routing.

- [ ] **Step 2: Implement PostgreSQL service**

Use PostgreSQL 16, environment-driven credentials, a named data volume, `pg_isready` healthcheck, and no public port mapping.

- [ ] **Step 3: Implement web service**

Pass `DATABASE_URL`, session, and e.id variables at runtime; wait for PostgreSQL health; expose only internal port 3000; add healthcheck for `/api/health`; use restart policy.

- [ ] **Step 4: Implement Caddy service**

Proxy `${DOMAIN}` to `web:3000`, persist `/data` and `/config`, publish 80/443, and use restart policy.

- [ ] **Step 5: Add backup script and documentation**

Use `docker compose exec -T postgres pg_dump`, write a timestamped custom-format dump with mode 600, document retention/cron and restore commands, and clearly mark volume deletion as destructive.

- [ ] **Step 6: Validate Compose**

```bash
docker compose --env-file .env.production.example config
docker compose build
```

- [ ] **Step 7: Commit deployment assets**

```bash
git commit -m "ops: add docker postgres vps deployment"
```

### Task 7: End-to-End VPS-Equivalent Verification

**Files:**
- Modify: `app/tests/e2e-smoke.test.ts` if needed
- Modify: `app/docs/deployment-vps.md` for verified commands only

- [ ] **Step 1: Start a clean stack**

```bash
docker compose down
docker compose up -d --build
docker compose ps
```

Expected: PostgreSQL and web are healthy; Caddy is running.

- [ ] **Step 2: Verify health and persistence**

```bash
curl -fsS http://localhost/api/health
docker compose restart web
curl -fsS http://localhost/api/health
```

- [ ] **Step 3: Verify real e.id start flow**

Use production env with `EID_FAKE=0` and a valid verification ID, call `/api/verifier/login/start`, confirm a fresh `https://wallet.e.id/...` URL and non-empty session ID, then scan/approve with e.id and call `/api/verifier/login/result`.

- [ ] **Step 4: Verify database backup and restore**

```bash
scripts/backup-postgres.sh ./backups
docker compose exec -T postgres createdb -U "$POSTGRES_USER" restore_check
cat ./backups/<timestamp>.dump | docker compose exec -T postgres pg_restore -U "$POSTGRES_USER" -d restore_check
```

Use actual generated filename in the restore command and remove only the temporary restore database afterward.

- [ ] **Step 5: Run final checks**

```bash
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm test
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm run build
docker compose config
docker compose ps
```

- [ ] **Step 6: Commit verified documentation changes**

```bash
git commit -m "test: verify docker postgres deployment"
```

## Final Review Checklist

- [ ] `better-sqlite3` is no longer a runtime dependency.
- [ ] All database callers await PostgreSQL operations.
- [ ] `npm run seed` is explicit and idempotent.
- [ ] Production does not use fake e.id mode or a blank verification ID.
- [ ] No secrets are in image layers, Compose files, docs, or git history.
- [ ] PostgreSQL volume survives `docker compose down` and web restarts.
- [ ] Caddy is the only public application entry point.
- [ ] Backup and restore commands were tested.
- [ ] Node 22, tests, build, Compose validation, and smoke tests pass.
