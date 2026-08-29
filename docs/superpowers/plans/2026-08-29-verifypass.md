# VerifyPass — Access Control Platform by e.id — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build VerifyPass in one day: a Next.js platform where organizations issue time-bound, revocable access verifiable credentials (VC) via e.id, gate/locker operators verify holders by QR, and a decision/anomaly/analytics engine decides & explains access — with pay-per-access monetization at self-registration.

**Architecture:** Single Next.js App Router app. All e.id contact goes through one adapter (`src/lib/eid/`) with a `FakeEidClient` for sandbox/demo. A pure decision engine (`gating.ts`), anomaly scorer (`anomaly.ts`) and stats/forecast module (`stats.ts`) are unit-tested without network. An `ActuatorProvider` interface separates physical actions (simulated on screen, optional ESP32) from the decision path. SQLite via `better-sqlite3` with raw SQL.

**Tech Stack:** Next.js 15 (App Router, `--src-dir`, TypeScript, Tailwind), better-sqlite3, jose (session JWT), qrcode (generate), html5-qrcode (scan), recharts (charts), date-fns (dates), vitest (tests), tsx (seed script).

**Spec:** `docs/superpowers/specs/2026-08-29-verifypass-design.md` — the plan argues from the spec; executors read both.

## Global Constraints

- Node 20+, npm, macOS/Linux.
- All money stored as integer cents-rupiah: `priceCents` (e.g. 25_000 = Rp25.000). Never floats.
- Times stored as ISO strings in UTC. Rule open/close are `minutesOfDay` in org-local wall clock. Asia/Jakarta offset = **420 minutes** (`tzOffsetMin` column).
- `better-sqlite3` is a native module: must be in `serverExternalPackages` of next.config AND imported only inside Server Components / route handlers / lib — never into a `"use client"` component.
- Demo sandbox mode = `EID_FAKE=1` (default when unset → fake). Real e.id REST integration is out of MVP scope (documented as adapter extension).
- "AI" in demo copy = rule chain + statistics. Never claim deep learning.
- Indonesian user-facing strings (reasons/alerts in Bahasa). Code identifiers in English.
- Every task ends with: green test run + a git commit.

---

### Task 1: Scaffold Project + Test Harness

**Files:**
- Create: `package.json`, `next.config.mjs`, `src/lib/config.ts`, `tests/smoke.test.ts`, `vitest.config.ts` (via `create-next-app` + edits)

**Interfaces:**
- Consumes: nothing
- Produces: `APP_NAME: string` export from `src/lib/config.ts`; `npm test` script that runs vitest; `npm run dev` boots.

- [ ] **Step 1: Scaffold Next.js app**

Run inside the repo root `/Users/panjipusdatin.lan/Desktop/lomba` (`.` as target; folder name `lomba` is a valid npm name):

```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --use-npm --import-alias "@/*" --yes
```

Ignored the `.codegraph/` dir already present (not committed).

- [ ] **Step 2: Install dependencies**

```bash
npm i better-sqlite3 jose qrcode recharts html5-qrcode date-fns
npm i -D vitest @types/better-sqlite3 @types/qrcode tsx
```

- [ ] **Step 3: Configure Next.js for native module + add `npm test` script**

`next.config.mjs` — add top-level:

```js
const nextConfig = {
  serverExternalPackages: ['better-sqlite3'],
};
export default nextConfig;
```

`package.json` — set `"scripts": { ...existing, "test": "vitest run", "seed": "tsx scripts/seed.ts" }`.

- [ ] **Step 4: Write the failing test**

`tests/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { APP_NAME } from '../src/lib/config';

describe('smoke', () => {
  it('exposes app name', () => {
    expect(APP_NAME).toBe('VerifyPass');
  });
});
```

`src/lib/config.ts` (create now — it fails first):

```ts
export const APP_NAME = 'VerifyPass';
export const SESSION_COOKIE = 'vp_session';
export const JKT_OFFSET_MIN = 420;
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['tests/**/*.test.ts', 'src/**/*.test.ts'] },
});
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 6: Dev boot check**

Run: `npm run dev` (background), then `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` 
Expected: `200`. Kill dev server.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js + vitest, better-sqlite3, deps"
```

---

### Task 2: Types + DB Layer (schema, runner, seed)

**Files:**
- Create: `src/lib/types.ts`, `src/lib/db.ts`, `src/lib/db/schema.sql`, `src/lib/db/seed.ts`, `scripts/seed.ts`, `src/lib/time.ts`
- Test: `tests/db.test.ts`

**Interfaces:**
- Consumes: nothing (pure new module)
- Produces (exact names later tasks use):
  - Types: `Verdict`, `CredentialData`, `VerificationResult`, `GateRule`, `GateDecision`, `AccessLogItem`, `AnomalyReport`, `ActuatorKind`, `ActuatorResult`, `PassStatus`, `AccessSource`, plus `EidProfile`, `IssueInput`, `IssueOutput`, `EidClient`.
  - `initDb(path?: string): DBSession` where `DBSession = { all<T>(sql,params?):T[], get<T>(sql,params?):T|undefined, run(sql,params?): { lastInsertRowid: number } }`; `getDb(): DBSession` — reads `process.env.DB_PATH ?? './data/verifypass.db'`, initializes `data/` dir, executes `schema.sql` on first open, memoizes.
  - `seedDemo(): { orgId: number; counts: Record<string, number> }`.
  - `toOrgLocal(utcNow: Date, tzOffsetMin: number): Date` and `minutesOfDay(d: Date): number` from `src/lib/time.ts`.
  - `listTariffs(orgId)`, `getTariff(id)`, `getOrgForAccessPoint(accessPointId)`, `getRuleForAccessPoint(accessPointId)`, `insertIssuedPass(row)`, `updateIssuedPassStatus(passId, status)`, `insertAccessEvent(row)`, `insertPayment(row)`, `insertKyc(row)`, `insertAnomalyAlert(row)`, `insertOrganization/insertArea/insertAccessPoint/insertRule/insertTariff/insertCredentialTemplate/insertUser(seed-only helpers)`.

- [ ] **Step 1: Write the failing test**

`tests/db.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/db.test.ts`
Expected: FAIL — module `../src/lib/db` not found.

- [ ] **Step 3: Write `src/lib/types.ts`**

```ts
export type Verdict = 'GRANT' | 'DENY';
export type PassStatus = 'active' | 'revoked' | 'expired';
export type AccessSource = 'admin' | 'self' | 'delegated';
export type ActuatorKind = 'open_gate' | 'open_locker';

export interface CredentialData {
  id: string;
  type: string;          // e.id document schema name, e.g. 'AccessPass', 'SafetyInduction'
  holder: string;        // holder email or DID
  validFrom: string;     // ISO UTC
  validUntil: string;    // ISO UTC
  claims: Record<string, unknown>;
  revoked: boolean;
}

export interface VerificationResult {
  ok: boolean;
  credentials: CredentialData[];
}

export interface GateRule {
  id: number;
  accessPointId: number;
  requiredType: string;
  prerequisites: string[];
  openMinute: number;
  closeMinute: number;
  areaScope: string[];
}

export interface GateDecision {
  verdict: Verdict;
  score: number;
  reasons: string[];
}

export interface AccessLogItem {
  passId: string;
  accessPointId: number;
  hour: number;
  verdict: string;
  tsMs: number;
}

export interface AnomalyReport {
  passId: string;
  severity: 'medium' | 'high';
  reasons: string[];
}

export interface ActuatorResult {
  ok: boolean;
  detail: string;
}

export interface EidProfile {
  id: string;
  name: string;
  email: string;
}

export interface IssueInput {
  templateName: string;
  holderEmail: string;
  claims: Record<string, unknown>;
  validFrom?: string;
  validUntil?: string;
}

export interface IssueOutput {
  credentialId: string;
  qrPayload: string;
}

export interface EidClient {
  exchangeCode(code: string): Promise<{ profile: EidProfile }>;
  issueCredential(input: IssueInput): Promise<IssueOutput>;
  revokeCredential(credentialId: string): Promise<{ ok: boolean }>;
  verifyPresentation(payload: string): Promise<VerificationResult>;
  startKyc(holderEmail: string): Promise<{ kycId: string }>;
}
```

- [ ] **Step 4: Write `src/lib/db/schema.sql`**

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  tz_offset_min INTEGER NOT NULL DEFAULT 420,
  currency TEXT NOT NULL DEFAULT 'IDR'
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  eid_subject TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'host'  -- 'admin' | 'operator' | 'host'
);

CREATE TABLE IF NOT EXISTS areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS access_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  area_id INTEGER NOT NULL REFERENCES areas(id),
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('gate','locker','room'))
);

CREATE TABLE IF NOT EXISTS access_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  access_point_id INTEGER NOT NULL REFERENCES access_points(id),
  required_type TEXT NOT NULL,
  prerequisites TEXT NOT NULL DEFAULT '[]',  -- JSON array of credential type names
  area_scope TEXT NOT NULL DEFAULT '[]',     -- JSON array of area names
  open_minute INTEGER NOT NULL DEFAULT 0,
  close_minute INTEGER NOT NULL DEFAULT 1440
);

CREATE TABLE IF NOT EXISTS tariffs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  area_scope TEXT NOT NULL DEFAULT '[]',
  price_cents INTEGER NOT NULL,
  valid_hours INTEGER NOT NULL DEFAULT 24
);

CREATE TABLE IF NOT EXISTS credential_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL UNIQUE,
  fields_json TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS issued_passes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  credential_id TEXT NOT NULL UNIQUE,
  holder_email TEXT NOT NULL,
  template_name TEXT NOT NULL,
  rule_id INTEGER REFERENCES access_rules(id),
  status TEXT NOT NULL DEFAULT 'active',
  source TEXT NOT NULL DEFAULT 'admin',     -- admin|self|delegated
  host_ref TEXT,
  valid_from TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS access_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  pass_id TEXT,
  access_point_id INTEGER NOT NULL REFERENCES access_points(id),
  verdict TEXT NOT NULL,
  reasons TEXT NOT NULL DEFAULT '[]',
  credential_id TEXT,
  action TEXT NOT NULL,                      -- 'check' | 'open_gate' | 'open_locker'
  actuator_detail TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  order_id TEXT NOT NULL,
  holder_email TEXT NOT NULL,
  tariff_id INTEGER NOT NULL REFERENCES tariffs(id),
  amount_cents INTEGER NOT NULL,
  method TEXT NOT NULL DEFAULT 'QRIS(mock)',
  status TEXT NOT NULL DEFAULT 'paid',
  receipt_credential_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kyc_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  holder_email TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'mock-kyc',
  status TEXT NOT NULL DEFAULT 'approved',
  ref_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS anomaly_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  pass_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  reasons TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);
```

- [ ] **Step 5: Write `src/lib/time.ts`**

```ts
export function toOrgLocal(utcNow: Date, tzOffsetMin: number): Date {
  return new Date(utcNow.getTime() + tzOffsetMin * 60_000);
}

export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}
```

- [ ] **Step 6: Write `src/lib/db.ts`**

```ts
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { minutesOfDay, toOrgLocal } from './time';
import type { EidClient } from './types';

export interface DBSession {
  all<T = unknown>(sql: string, params?: unknown[]): T[];
  get<T = unknown>(sql: string, params?: unknown[]): T | undefined;
  run(sql: string, params?: unknown[]): { lastInsertRowid: number };
}

let cached: DBSession | null = null;

export function initDb(dbPath = process.env.DB_PATH ?? './data/verifypass.db'): DBSession {
  if (cached && dbPath !== ':memory:') return cached;
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  const schema = readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
  db.exec(schema);
  const session: DBSession = {
    all: (sql, params) => db.prepare(sql).all(...(params ?? [])) as unknown[],
    get: (sql, params) => db.prepare(sql).get(...(params ?? [])) as unknown | undefined,
    run: (sql, params) => db.prepare(sql).run(...(params ?? [])) as { lastInsertRowid: number },
  };
  if (dbPath !== ':memory:') cached = session;
  return session;
}

export function getDb(): DBSession {
  return cached ?? initDb();
}
```

- [ ] **Step 7: Write `src/lib/db/seed.ts`**

```ts
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
    [pointIds['Pintu Lab'], 'AccessPass', '["SafetyInduction"]', '["Laboratorium"]', 420, 1080]);
  db.run('INSERT INTO access_rules (access_point_id, required_type, prerequisites, area_scope, open_minute, close_minute) VALUES (?,?,?,?,?,?)',
    [pointIds['Loker A-12'], 'AccessPass', '[]', '["Ruang Umum"]', 0, 1440]);

  db.run('INSERT INTO tariffs (org_id, name, area_scope, price_cents, valid_hours) VALUES (?,?,?,?,?)',
    [orgId, 'Day Pass Umum', '["Ruang Umum"]', 25_000, 24]);
  db.run('INSERT INTO tariffs (org_id, name, area_scope, price_cents, valid_hours) VALUES (?,?,?,?,?)',
    [orgId, 'Parkir Harian', '["Parkir"]', 10_000, 24]);

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
```

`scripts/seed.ts`:

```ts
import { initDb } from '../src/lib/db';
import { seedDemo } from '../src/lib/db/seed';
import { createClient } from '../src/lib/eid/client';

const db = initDb();
const { orgId, counts } = seedDemo(db, createClient());
console.log({ orgId, counts });
```

- [ ] **Step 8: Fix import-time circular issue if any** — `seed.ts` imports `createClient` from `../eid/client` which does NOT exist until Task 6. Fix: in this task, `seedDemo` accepts an optional `eid: EidClient`; `scripts/seed.ts` will be finalized in Task 6. For now make `scripts/seed.ts` call `seedDemo(db)` without the eid param so it compiles here.

- [ ] **Step 9: Run tests to verify pass**

Run: `npm test`
Expected: 2 tests pass (smoke + db).

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat: types + sqlite schema, runner, demo seed"
```

---

### Task 3: Gating Engine (pure)

**Files:**
- Create: `src/lib/engine/gating.ts`
- Test: `tests/engine/gating.test.ts`

**Interfaces:**
- Consumes: `GateRule`, `GateDecision`, `VerificationResult`, `CredentialData` from `src/lib/types.ts`
- Produces: `evaluateGate(result: VerificationResult, rule: GateRule, localNow: Date): GateDecision`

- [ ] **Step 1: Write the failing test**

`tests/engine/gating.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { evaluateGate } from '../../src/lib/engine/gating';
import type { VerificationResult, GateRule } from '../../src/lib/types';

const GRANT_CREDS: VerificationResult = {
  ok: true,
  credentials: [
    { id: 'a', type: 'AccessPass', holder: 'x@d.id', validFrom: '2026-08-01T00:00:00Z', validUntil: '2026-09-01T00:00:00Z', claims: {}, revoked: false },
    { id: 'b', type: 'SafetyInduction', holder: 'x@d.id', validFrom: '2026-08-01T00:00:00Z', validUntil: '2026-12-31T00:00:00Z', claims: {}, revoked: false },
  ],
};

const RULE: GateRule = {
  id: 1, accessPointId: 2, requiredType: 'AccessPass',
  prerequisites: ['SafetyInduction'], areaScope: ['Laboratorium'],
  openMinute: 420, closeMinute: 1080,
};

describe('evaluateGate', () => {
  it('GRANT when all requirements met', () => {
    const now = new Date('2026-08-20T02:00:00Z'); // 09:00 JKT
    expect(evaluateGate(GRANT_CREDS, RULE, now).verdict).toBe('GRANT');
  });

  it('DENY when presentation failed or empty', () => {
    expect(evaluateGate({ ok: false, credentials: [] }, RULE, new Date('2026-08-20T02:00:00Z')).verdict).toBe('DENY');
  });

  it('DENY with reason when prerequisite missing', () => {
    const noPrereq: VerificationResult = { ok: true, credentials: [GRANT_CREDS.credentials[0]] };
    const d = evaluateGate(noPrereq, RULE, new Date('2026-08-20T02:00:00Z'));
    expect(d.verdict).toBe('DENY');
    expect(d.reasons.join(' ')).toContain('SafetyInduction');
  });

  it('DENY with reason when outside operating hours', () => {
    const late = new Date('2026-08-20T12:00:00Z'); // 19:00 JKT > 18:00
    const d = evaluateGate(GRANT_CREDS, RULE, late);
    expect(d.verdict).toBe('DENY');
    expect(d.reasons.join(' ')).toContain('jam operasional');
  });

  it('DENY when credential expired', () => {
    const now = new Date('2026-10-01T02:00:00Z');
    const d = evaluateGate(GRANT_CREDS, RULE, now);
    expect(d.verdict).toBe('DENY');
    expect(d.reasons.join(' ')).toContain('kadaluarsa');
  });

  it('DENY when required credential is revoked', () => {
    const revoked: VerificationResult = {
      ok: true,
      credentials: [{ ...GRANT_CREDS.credentials[0], revoked: true }, GRANT_CREDS.credentials[1]],
    };
    expect(evaluateGate(revoked, RULE, new Date('2026-08-20T02:00:00Z')).verdict).toBe('DENY');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine/gating.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

`src/lib/engine/gating.ts`:

```ts
import type { GateDecision, GateRule, VerificationResult } from '../types';

function hhmm(min: number): string {
  const h = String(Math.floor(min / 60)).padStart(2, '0');
  const m = String(min % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export function evaluateGate(
  result: VerificationResult,
  rule: GateRule,
  localNow: Date,
): GateDecision {
  if (!result.ok || result.credentials.length === 0) {
    return { verdict: 'DENY', score: 0, reasons: ['Tidak ada credential yang dipresentasikan.'] };
  }
  const main = result.credentials.find((c) => c.type === rule.requiredType && !c.revoked);
  if (!main) {
    return { verdict: 'DENY', score: 0, reasons: [`Credential dibutuhkan ('${rule.requiredType}') tidak ditemukan atau telah direvoke.`] };
  }

  const reasons: string[] = [];
  const nowMs = localNow.getTime();
  const nowMin = localNow.getHours() * 60 + localNow.getMinutes();

  if (nowMin < rule.openMinute || nowMin > rule.closeMinute) {
    reasons.push(`Di luar jam operasional (${hhmm(rule.openMinute)}–${hhmm(rule.closeMinute)}).`);
  }
  if (nowMs < Date.parse(main.validFrom)) reasons.push('Credential belum berlaku.');
  if (nowMs > Date.parse(main.validUntil)) reasons.push('Credential sudah kadaluarsa.');

  const missing = rule.prerequisites.filter(
    (p) => !result.credentials.some((c) => c.type === p && !c.revoked && nowMs <= Date.parse(c.validUntil)),
  );
  if (missing.length > 0) reasons.push(`Prasyarat belum terpenuhi: ${missing.join(', ')}.`);

  if (reasons.length > 0) {
    return { verdict: 'DENY', score: Math.max(0, 100 - reasons.length * 25), reasons };
  }
  return { verdict: 'GRANT', score: 100, reasons: ['Semua syarat terpenuhi.'] };
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test`
Expected: all gating tests pass; `GRANT_CREDS` includes SafetyInduction valid until 2026-12-31, so the "expired" test (now = 2026-10-01) DENY comes from AccessPass expiry (`validUntil 2026-09-01`). Correct.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: gating engine with explainable reasons"
```

---

### Task 4: Anomaly Detection (pure)

**Files:**
- Create: `src/lib/engine/anomaly.ts`
- Test: `tests/engine/anomaly.test.ts`

**Interfaces:**
- Consumes: `AccessLogItem`, `AnomalyReport` from `src/lib/types.ts`
- Produces: `detectAnomaly(logs: AccessLogItem[]): AnomalyReport[]`

- [ ] **Step 1: Write the failing test**

`tests/engine/anomaly.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { detectAnomaly } from '../../src/lib/engine/anomaly';
import type { AccessLogItem } from '../../src/lib/types';

const t0 = Date.parse('2026-08-20T01:00:00Z');
const item = (passId: string, accessPointId: number, hour: number, verdict: string, tsMs: number): AccessLogItem =>
  ({ passId, accessPointId, hour, verdict, tsMs });

describe('detectAnomaly', () => {
  it('flags rapid retry after DENY', () => {
    const logs = [
      item('p1', 1, 9, 'DENY', t0),
      item('p1', 1, 9, 'DENY', t0 + 2 * 60_000),
    ];
    const reports = detectAnomaly(logs);
    expect(reports.some((r) => r.passId === 'p1' && r.reasons.some((x) => x.includes('Retry')))).toBe(true);
  });

  it('flags 3+ gates within an hour', () => {
    const logs = [
      item('p2', 1, 9, 'GRANT', t0),
      item('p2', 2, 9, 'GRANT', t0 + 10 * 60_000),
      item('p2', 3, 9, 'GRANT', t0 + 20 * 60_000),
      item('p2', 4, 9, 'GRANT', t0 + 30 * 60_000),
    ];
    const reports = detectAnomaly(logs);
    expect(reports.some((r) => r.passId === 'p2' && r.reasons.some((x) => x.includes('3+ titik')))).toBe(true);
  });

  it('no flags for normal pattern', () => {
    const base = item('p3', 1, 9, 'GRANT', t0);
    const normal = [base, { ...base, tsMs: t0 + 60_000 }, { ...base, tsMs: t0 + 120_000 }];
    expect(detectAnomaly(normal)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine/anomaly.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

`src/lib/engine/anomaly.ts`:

```ts
import type { AccessLogItem, AnomalyReport } from '../types';

export function detectAnomaly(logs: AccessLogItem[]): AnomalyReport[] {
  const byPass = new Map<string, AccessLogItem[]>();
  for (const l of logs) {
    const arr = byPass.get(l.passId) ?? [];
    arr.push(l);
    byPass.set(l.passId, arr);
  }

  const reports: AnomalyReport[] = [];
  for (const [passId, items] of byPass) {
    const reasons: string[] = [];

    for (let i = 1; i < items.length; i++) {
      const prev = items[i - 1];
      const cur = items[i];
      if (prev.verdict === 'DENY' && cur.verdict === 'DENY' && cur.tsMs - prev.tsMs < 5 * 60_000) {
        reasons.push('Retry cepat setelah penolakan (< 5 menit).');
        break;
      }
    }

    const sorted = [...items].sort((a, b) => a.tsMs - b.tsMs);
    for (let i = 0; i < sorted.length; i++) {
      const winStart = sorted[i].tsMs;
      const inWindow = sorted.filter((l) => l.tsMs >= winStart && l.tsMs - winStart <= 60 * 60_000);
      if (new Set(inWindow.map((l) => l.accessPointId)).size > 3) {
        reasons.push('Digunakan di 3+ titik akses dalam 1 jam.');
        break;
      }
    }

    const hours = items.map((l) => l.hour).sort((a, b) => a - b);
    if (hours.length >= 4) {
      const mean = hours.reduce((s, h) => s + h, 0) / hours.length;
      const sd = Math.sqrt(hours.reduce((s, h) => s + (h - mean) ** 2, 0) / hours.length);
      const lastHour = hours[hours.length - 1];
      if (sd > 0 && Math.abs(lastHour - mean) > 2 * sd) {
        reasons.push('Akses pada jam yang jauh dari pola historis.');
      }
    }

    if (reasons.length > 0) {
      reports.push({ passId, severity: reasons.length >= 2 ? 'high' : 'medium', reasons });
    }
  }
  return reports;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test`
Expected: anomaly tests pass (note: the "3+ gates" test logs have only 2 distinct DENY items so it needs normal/history neutral; verify no surprise flags).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: anomaly detection engine"
```

---

### Task 5: Stats & Forecasting (pure)

**Files:**
- Create: `src/lib/engine/stats.ts`
- Test: `tests/engine/stats.test.ts`

**Interfaces:**
- Consumes: nothing beyond `date-fns`
- Produces:
  - `export interface DayPoint { date: string; count: number }`
  - `forecastLinear(points: DayPoint[], days: number): DayPoint[]`
  - `hourlyHistogram(msList: number[]): number[]` (24 buckets, local hours)
  - `revenueByDay(payments: Array<{ createdAt: string; amountCents: number }>): DayPoint[]` (sums cents per day, `count` = sum)

- [ ] **Step 1: Write the failing test**

`tests/engine/stats.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { forecastLinear, hourlyHistogram, revenueByDay, type DayPoint } from '../../src/lib/engine/stats';

describe('stats', () => {
  it('hourlyHistogram buckets into 24 hours', () => {
    const ms = [
      Date.parse('2026-08-20T02:00:00Z'),  // 09:00 local host machine? no—uses getHours of Date; fixed below
    ];
    const hist = hourlyHistogram(ms);
    expect(hist).toHaveLength(24);
    expect(hist[new Date(ms[0]).getHours()]).toBe(1);
  });

  it('forecastLinear predicts continuation', () => {
    const points: DayPoint[] = [
      { date: '2026-08-01', count: 10 },
      { date: '2026-08-02', count: 12 },
      { date: '2026-08-03', count: 14 },
    ];
    const f = forecastLinear(points, 2);
    expect(f).toHaveLength(2);
    expect(f[0].count).toBe(16);   // +2/day
    expect(f[0].date).toBe('2026-08-04');
    expect(f[1].date).toBe('2026-08-05');
  });

  it('revenueByDay sums cents per date', () => {
    const pays = [
      { createdAt: '2026-08-20T01:00:00Z', amountCents: 25_000 },
      { createdAt: '2026-08-20T05:00:00Z', amountCents: 10_000 },
      { createdAt: '2026-08-21T01:00:00Z', amountCents: 25_000 },
    ];
    const byDay = revenueByDay(pays);
    const d20 = byDay.find((d) => d.date === '2026-08-20');
    expect(d20?.count).toBe(35_000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine/stats.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

`src/lib/engine/stats.ts`:

```ts
import { addDays, format } from 'date-fns';

export interface DayPoint { date: string; count: number }

export function forecastLinear(points: DayPoint[], days: number): DayPoint[] {
  if (points.length < 2) return [];
  const n = points.length;
  const meanX = (n - 1) / 2;
  const meanY = points.reduce((s, p) => s + p.count, 0) / n;
  const slopeDen = points.reduce((s, _, i) => s + (i - meanX) ** 2, 0);
  const slope = slopeDen === 0
    ? 0
    : points.reduce((s, p, i) => s + (i - meanX) * (p.count - meanY), 0) / slopeDen;
  const intercept = meanY - slope * meanX;
  const last = points[points.length - 1];

  return Array.from({ length: days }, (_, i) => {
    const idx = n + i;
    const count = Math.max(0, Math.round(intercept + slope * idx));
    return { date: format(addDays(new Date(last.date), i + 1), 'yyyy-MM-dd'), count };
  });
}

export function hourlyHistogram(msList: number[]): number[] {
  const buckets = new Array<number>(24).fill(0);
  for (const ms of msList) buckets[new Date(ms).getHours()]++;
  return buckets;
}

export function revenueByDay(payments: Array<{ createdAt: string; amountCents: number }>): DayPoint[] {
  const map = new Map<string, number>();
  for (const p of payments) {
    const d = new Date(p.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    map.set(key, (map.get(key) ?? 0) + p.amountCents);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, count]) => ({ date, count }));
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test`
Expected: stats tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: stats and forecasting module"
```

---

### Task 6: e.id Adapter — Fake Client

**Files:**
- Create: `src/lib/eid/client.ts`
- Test: `tests/eid/client.test.ts`
- Modify: `scripts/seed.ts` (finalize to pass `createClient()`)

**Interfaces:**
- Consumes: `EidClient`, `IssueInput`, `IssueOutput`, `VerificationResult`, `CredentialData`, `EidProfile` from `src/lib/types.ts`
- Produces:
  - `export function createClient(): EidClient` — returns `FakeEidClient` unless `EID_FAKE !== '1'` and real env vars exist.
  - `FakeEidClient` public methods matching `EidClient`.
  - `export function __resetFake(): void` (clears fake store — for tests).

- [ ] **Step 1: Write the failing test**

`tests/eid/client.test.ts`:

```ts
import { beforeAll, describe, it, expect } from 'vitest';
import { createClient, __resetFake } from '../../src/lib/eid/client';
import type { EidClient } from '../../src/lib/types';

let client: EidClient;
beforeAll(() => { __resetFake(); client = createClient(); });

describe('FakeEidClient', () => {
  it('exchangeCode returns a verified profile', async () => {
    const { profile } = await client.exchangeCode('demo-code');
    expect(profile.email).toContain('@');
    expect(profile.id).toMatch(/^did:eid:/);
  });

  it('issueCredential then verifyPresentation round-trips', async () => {
    globalThis.process.env.EID_FAKE = '1';
    const issued = await client.issueCredential({
      templateName: 'AccessPass',
      holderEmail: 'tamu@demo.id',
      claims: { fullName: 'Tamu Demo', area: 'Ruang Umum' },
      validFrom: '2026-08-20T00:00:00Z',
      validUntil: '2026-08-21T00:00:00Z',
    });
    expect(issued.credentialId).toBeTruthy();
    expect(issued.qrPayload).toContain(issued.credentialId);

    const res = await client.verifyPresentation(issued.qrPayload);
    expect(res.ok).toBe(true);
    expect(res.credentials[0].type).toBe('AccessPass');
    expect(res.credentials[0].revoked).toBe(false);
  });

  it('revokeCredential flips revoked flag seen by verifier', async () => {
    globalThis.process.env.EID_FAKE = '1';
    const issued = await client.issueCredential({
      templateName: 'AccessPass', holderEmail: 'x@demo.id', claims: {},
    });
    await client.revokeCredential(issued.credentialId);
    const res = await client.verifyPresentation(issued.qrPayload);
    expect(res.credentials[0].revoked).toBe(true);
  });

  it('startKyc returns an id', async () => {
    const { kycId } = await client.startKyc('tamu@demo.id');
    expect(kycId).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/eid/client.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

`src/lib/eid/client.ts`:

```ts
import { addHoursISO } from '../db/seed';
import type { CredentialData, EidClient, IssueInput, IssueOutput, VerificationResult } from '../types';

const fakeStore = new Map<string, CredentialData>();
let seq = 0;

export function __resetFake(): void {
  fakeStore.clear();
  seq = 0;
}

export class FakeEidClient implements EidClient {
  constructor(private readonly store: Map<string, CredentialData> = fakeStore) {}

  async exchangeCode(code: string): Promise<{ profile: { id: string; name: string; email: string } }> {
    return {
      profile: {
        id: `did:eid:demo-${code}`,
        name: 'Demo Admin',
        email: 'admin@kampus.demo',
      },
    };
  }

  async issueCredential(input: IssueInput): Promise<IssueOutput> {
    seq += 1;
    const credentialId = `cred_${Date.now()}_${seq}`;
    const issued: CredentialData = {
      id: credentialId,
      type: input.templateName,
      holder: input.holderEmail,
      validFrom: input.validFrom ?? new Date().toISOString(),
      validUntil: input.validUntil ?? addHoursISO(input.validFrom ?? new Date().toISOString(), 24),
      claims: { ...input.claims, fullName: input.claims.fullName ?? input.holderEmail },
      revoked: false,
    };
    this.store.set(credentialId, issued);
    const qrPayload = JSON.stringify({ v: 1, credentialId });
    return { credentialId, qrPayload };
  }

  async revokeCredential(credentialId: string): Promise<{ ok: boolean }> {
    const c = this.store.get(credentialId);
    if (c) c.revoked = true;
    return { ok: !!c };
  }

  async verifyPresentation(payload: string): Promise<VerificationResult> {
    let credentialId: string;
    try {
      credentialId = (JSON.parse(payload) as { credentialId: string }).credentialId;
    } catch {
      return { ok: false, credentials: [] };
    }
    const c = this.store.get(credentialId);
    if (!c) return { ok: false, credentials: [] };
    return { ok: true, credentials: [{ ...c }] };
  }

  async startKyc(_holderEmail: string): Promise<{ kycId: string }> {
    return { kycId: `kyc_${Date.now()}_${++seq}` };
  }
}

export function createClient(): EidClient {
  return new FakeEidClient();
}
```

(`createClient` returns the fake for MVP. The real HTTP adapter is the documented extension point where, when sandbox keys exist, an `HttpEidClient` implementing the same `EidClient` interface would be returned. MVP uses `EID_FAKE=1`.)

- [ ] **Step 4: Finalize `scripts/seed.ts`**

```ts
import { initDb } from '../src/lib/db';
import { seedDemo } from '../src/lib/db/seed';
import { createClient } from '../src/lib/eid/client';

const db = initDb();
const { orgId, counts } = seedDemo(db, createClient());
console.log({ orgId, counts });
```

- [ ] **Step 5: Run seeds and tests**

Run: `npm run seed` then `npm test`
Expected: seed prints `{ orgId, counts: {...} }`; all tests pass.

Note: `seedDemo` already issues a `SafetyInduction` for `budi@kampus.demo` when passed `createClient()`.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: e.id adapter with fake sandbox client"
```

---

### Task 7: Actuator Provider (Simulated + ESP32 stub)

**Files:**
- Create: `src/lib/actuator/index.ts`, `src/lib/actuator/simulated.ts`, `src/lib/actuator/esp32.ts`
- Test: `tests/actuator/actuator.test.ts`

**Interfaces:**
- Consumes: `ActuatorKind`, `ActuatorResult` from `src/lib/types.ts`
- Produces:
  - `export interface Actuator { name: string; execute(kind: ActuatorKind, target: string): Promise<ActuatorResult> }`
  - `export function getActuator(): Actuator` — returns the simulated actuator unless `ACTUATOR_URL` env var is set (then ESP32).
  - `SimulatedActuator`: `execute` returns `{ ok: true, detail: 'LED_HIJAU' }` for `open_gate`, `{ ok: true, detail: 'LOCKER_TERBUKA' }` for `open_locker`.
  - `Esp32Actuator`: `execute` POSTs `{ action, target }` JSON to `ACTUATOR_URL`, resolves `{ ok, detail }` from response; on fetch error returns `{ ok: false, detail: 'KOMPONEN_TIDAK_TERJANGKAU' }`.

- [ ] **Step 1: Write the failing test**

`tests/actuator/actuator.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { SimulatedActuator } from '../../src/lib/actuator/simulated';
import { getActuator } from '../../src/lib/actuator';

describe('actuator', () => {
  it('getActuator returns simulated by default', () => {
    delete process.env.ACTUATOR_URL;
    expect(getActuator().name).toBe('simulated');
  });

  it('simulated open_gate returns LED green', async () => {
    const res = await new SimulatedActuator().execute('open_gate', 'Pintu Utama');
    expect(res).toEqual({ ok: true, detail: 'LED_HIJAU' });
  });

  it('simulated open_locker returns unlocked', async () => {
    const res = await new SimulatedActuator().execute('open_locker', 'Loker A-12');
    expect(res).toEqual({ ok: true, detail: 'LOCKER_TERBUKA' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/actuator/actuator.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

`src/lib/actuator/index.ts`:

```ts
import type { Actuator } from '../types';
import { SimulatedActuator } from './simulated';
import { Esp32Actuator } from './esp32';

export function getActuator(): Actuator {
  return process.env.ACTUATOR_URL ? new Esp32Actuator(process.env.ACTUATOR_URL) : new SimulatedActuator();
}
export { SimulatedActuator, Esp32Actuator };
export type { Actuator };
```

`src/lib/actuator/simulated.ts`:

```ts
import type { Actuator, ActuatorKind, ActuatorResult } from '../types';

export class SimulatedActuator implements Actuator {
  name = 'simulated';

  async execute(kind: ActuatorKind, _target: string): Promise<ActuatorResult> {
    if (kind === 'open_locker') return { ok: true, detail: 'LOCKER_TERBUKA' };
    return { ok: true, detail: 'LED_HIJAU' };
  }
}
```

`src/lib/actuator/esp32.ts`:

```ts
import type { Actuator, ActuatorKind, ActuatorResult } from '../types';

export class Esp32Actuator implements Actuator {
  name = 'esp32';

  constructor(private readonly baseUrl: string) {}

  async execute(kind: ActuatorKind, target: string): Promise<ActuatorResult> {
    try {
      const res = await fetch(`${this.baseUrl}/actuate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: kind, target }),
      });
      const json = (await res.json()) as ActuatorResult;
      return json;
    } catch {
      return { ok: false, detail: 'KOMPONEN_TIDAK_TERJANGKAU' };
    }
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test`
Expected: actuator tests pass (default env has no `ACTUATOR_URL` — Simulated chosen).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: actuator provider (simulated + ESP32)"
```

---

### Task 8: Session + e.id SSO Login Flow

**Files:**
- Create: `src/lib/session.ts`, `src/app/api/auth/eid/start/route.ts`, `src/app/api/auth/eid/callback/route.ts`
- Test: `tests/session.test.ts`, `tests/api-auth.test.ts`

**Interfaces:**
- Consumes: `EidClient.exchangeCode`, `SESSION_COOKIE` from `src/lib/config.ts`
- Produces:
  - `export interface Session { subject: string; name: string; email: string; role: string }`
  - `createSession(s: Session): Promise<string>` (JWT HS256 via `jose`, 8h expiry, secret from `process.env.SESSION_SECRET ?? 'dev-secret-change-me'`)
  - `readSession(token?: string): Promise<Session | null>`
  - Route `GET /api/auth/eid/start` → 302 redirect to `/api/auth/eid/callback?code=demo-code` (fake mode) — later becomes provider URL.
  - Route `GET /api/auth/eid/callback` → exchanges code, sets `vp_session` httpOnly cookie, 302 to `/admin/dashboard`.

- [ ] **Step 1: Write the failing test**

`tests/session.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createSession, readSession } from '../src/lib/session';

describe('session', () => {
  it('round-trips a session token', async () => {
    const token = await createSession({ subject: 'did:eid:x', name: 'A', email: 'a@b.c', role: 'admin' });
    const s = await readSession(token);
    expect(s?.email).toBe('a@b.c');
    expect(s?.role).toBe('admin');
  });

  it('returns null for garbage token', async () => {
    expect(await readSession('garbage')).toBeNull();
  });
});
```

`tests/api-auth.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { GET as startGet } from '../src/app/api/auth/eid/start/route';
import { GET as cbGet } from '../src/app/api/auth/eid/callback/route';

describe('auth routes', () => {
  it('start redirects to callback', async () => {
    const res = await startGet(new Request('http://localhost/api/auth/eid/start'));
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('/api/auth/eid/callback');
  });

  it('callback sets session cookie and redirects', async () => {
    const res = await cbGet(new Request('http://localhost/api/auth/eid/callback?code=demo-code'));
    expect(res.status).toBe(302);
    const setCookie = (res.headers.get('set-cookie') ?? '').trim();
    expect(setCookie).toContain('vp_session=');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/session.test.ts tests/api-auth.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `src/lib/session.ts`**

```ts
import { SignJWT, jwtVerify } from 'jose';
import { SESSION_COOKIE } from './config';

export interface Session {
  subject: string;
  name: string;
  email: string;
  role: string;
}

const secret = new TextEncoder().encode(process.env.SESSION_SECRET ?? 'dev-secret-change-me');

export async function createSession(s: Session): Promise<string> {
  return await new SignJWT({ name: s.name, email: s.email, role: s.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(s.subject)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
}

export async function readSession(token?: string): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      subject: payload.sub as string,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

export function cookieName(): string {
  return SESSION_COOKIE;
}
```

- [ ] **Step 4: Write auth routes**

`src/app/api/auth/eid/start/route.ts`:

```ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.redirect('/api/auth/eid/callback?code=demo-code');
}
```

`src/app/api/auth/eid/callback/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/eid/client';
import { createSession } from '@/lib/session';
import { SESSION_COOKIE } from '@/lib/config';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code') ?? 'demo-code';
  const { profile } = await createClient().exchangeCode(code);
  const token = await createSession({
    subject: profile.id,
    name: profile.name,
    email: profile.email,
    role: 'admin',
  });
  const res = NextResponse.redirect(new URL('/admin/dashboard', req.nextUrl.origin));
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, path: '/', maxAge: 8 * 3600, sameSite: 'lax' });
  return res;
}
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npm test`
Expected: session + auth route tests pass (NextRequest redirect via `req.nextUrl` available in test env; if `nextUrl` is undefined in raw Request, use `new URL(req.url)` fallback — adjust handler to accept plain Request:

```ts
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code') ?? 'demo-code';
  const { profile } = await createClient().exchangeCode(code);
  const token = await createSession({ subject: profile.id, name: profile.name, email: profile.email, role: 'admin' });
  const res = NextResponse.redirect(new URL('/admin/dashboard', url.origin));
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, path: '/', maxAge: 8 * 3600, sameSite: 'lax' });
  return res;
}
```

Use this version — plain `Request` is test-friendly.)

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: session JWT + e.id SSO start/callback routes"
```

---

### Task 9: Admin API — Issue & Revoke Pass

**Files:**
- Create: `src/app/api/admin/passes/route.ts`, `src/app/api/admin/passes/revoke/route.ts`
- Test: `tests/api-passes.test.ts`

**Interfaces:**
- Consumes: `createClient()`, `readSession`, `getDb`, `insertIssuedPass`? (not created — use raw SQL here), `EidClient.issueCredential/revokeCredential`
- Produces:
  - `POST /api/admin/passes { holderEmail, templateName, validHours?, area?, source? }` → issues VC via e.id, inserts `issued_passes` row, returns `{ passId, qrPayload }` (200) or 401/400.
  - `POST /api/admin/passes/revoke { passId }` → sets status `revoked` + calls `eid.revokeCredential`, returns `{ ok: true }` or 404.

- [ ] **Step 1: Write the failing test**

`tests/api-passes.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { initDb, getDb } from '../src/lib/db';
import { seedDemo } from '../src/lib/db/seed';
import { __resetFake } from '../src/lib/eid/client';
import { createSession } from '../src/lib/session';
import { POST as issuePost } from '../src/app/api/admin/passes/route';
import { POST as revokePost } from '../src/app/api/admin/passes/revoke/route';

async function authed(method: 'POST'): Promise<string> {
  return await createSession({ subject: 'did:eid:demo-admin', name: 'Demo Admin', email: 'admin@kampus.demo', role: 'admin' });
}

describe('admin passes api', () => {
  let token: string;
  beforeAll(async () => {
    token = await authed('POST');
    getDb(); // ensure db active
  });
  afterEach(() => __resetFake());

  it('issues a pass and returns qrPayload', async () => {
    const req = new Request('http://localhost/api/admin/passes', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `vp_session=${token}` },
      body: JSON.stringify({ holderEmail: 'tamu@demo.id', templateName: 'AccessPass', validHours: 24 }),
    });
    const res = await issuePost(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.qrPayload).toContain(body.passId);
  });

  it('rejects unauthenticated request', async () => {
    const req = new Request('http://localhost/api/admin/passes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ holderEmail: 'tamu@demo.id', templateName: 'AccessPass' }),
    });
    const res = await issuePost(req);
    expect(res.status).toBe(401);
  });

  it('revokes a pass', async () => {
    const issued = await (await issuePost(new Request('http://localhost/api/admin/passes', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `vp_session=${token}` },
      body: JSON.stringify({ holderEmail: 'tamu@demo.id', templateName: 'AccessPass' }),
    }))).json() as { passId: string };
    const rev = await revokePost(new Request('http://localhost/api/admin/passes/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `vp_session=${token}` },
      body: JSON.stringify({ passId: issued.passId }),
    }));
    expect(rev.status).toBe(200);
    expect((await rev.json()).ok).toBe(true);
  });
});
```

Note: `passId` in the body will equal `credential_id` for simplicity: `passId = credentialId`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api-passes.test.ts`
Expected: FAIL — modules not found / routes missing.

- [ ] **Step 3: Write `src/lib/db/passes.ts` helper (used by this task and later)**

`src/lib/db/passes.ts`:

```ts
import type { DBSession } from '../db';
import type { PassStatus } from '../types';

export interface IssuedPassRow {
  id: number;
  org_id: number;
  credential_id: string;
  holder_email: string;
  template_name: string;
  rule_id: number | null;
  status: string;
  source: string;
  host_ref: string | null;
  valid_from: string;
  valid_until: string;
  created_at: string;
}

export function insertIssuedPass(
  db: DBSession,
  row: Omit<IssuedPassRow, 'id' | 'created_at'>,
): number {
  return db.run(
    `INSERT INTO issued_passes (org_id, credential_id, holder_email, template_name, rule_id, status, source, host_ref, valid_from, valid_until, created_at)
     VALUES (@org_id, @credential_id, @holder_email, @template_name, @rule_id, @status, @source, @host_ref, @valid_from, @valid_until, @created_at)`,
    [
      row.org_id, row.credential_id, row.holder_email, row.template_name, row.rule_id, row.status,
      row.source, row.host_ref, row.valid_from, row.valid_until, new Date().toISOString(),
    ],
  ).lastInsertRowid as number;
}

export function getIssuedPassByCredential(db: DBSession, credentialId: string): IssuedPassRow | undefined {
  return db.get<IssuedPassRow>('SELECT * FROM issued_passes WHERE credential_id = ?', [credentialId]);
}

export function updatePassStatus(db: DBSession, passId: number, status: PassStatus): void {
  db.run('UPDATE issued_passes SET status = ? WHERE id = ?', [status, passId]);
}

export function listPassesByOrg(db: DBSession, orgId: number, limit = 50): IssuedPassRow[] {
  return db.all<IssuedPassRow>('SELECT * FROM issued_passes WHERE org_id = ? ORDER BY id DESC LIMIT ?', [orgId, limit]);
}
```

- [ ] **Step 4: Write the admin routes**

`src/app/api/admin/passes/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { insertIssuedPass, getIssuedPassByCredential } from '@/lib/db/passes';
import { createClient } from '@/lib/eid/client';
import { readSession } from '@/lib/session';
import { SESSION_COOKIE } from '@/lib/config';
import { addHoursISO } from '@/lib/db/seed';

async function requireAdmin(req: Request): Promise<NextResponse | null> {
  const cookie = req.headers.get('cookie') ?? '';
  const token = cookie.split(`${SESSION_COOKIE}=`)[1]?.split(';')[0];
  const session = await readSession(token);
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return null;
}

export async function POST(req: Request): Promise<NextResponse> {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const body = (await req.json()) as {
    holderEmail?: string;
    templateName?: string;
    validHours?: number;
    orgId?: number;
  };
  if (!body.holderEmail || !body.templateName) {
    return NextResponse.json({ error: 'holderEmail dan templateName wajib' }, { status: 400 });
  }

  const db = getDb();
  const orgId = body.orgId ?? 1;
  const validHours = body.validHours ?? 24;
  const validFromIso = new Date().toISOString();
  const validUntilIso = addHoursISO(validFromIso, validHours);

  const { credentialId, qrPayload } = await createClient().issueCredential({
    templateName: body.templateName,
    holderEmail: body.holderEmail,
    claims: { fullName: body.holderEmail, area: 'Ruang Umum', validFrom: validFromIso, validUntil: validUntilIso },
    validFrom: validFromIso,
    validUntil: validUntilIso,
  });

  const passId = insertIssuedPass(db, {
    org_id: orgId,
    credential_id: credentialId,
    holder_email: body.holderEmail,
    template_name: body.templateName,
    rule_id: null,
    status: 'active',
    source: 'admin',
    host_ref: null,
    valid_from: validFromIso,
    valid_until: validUntilIso,
  });

  return NextResponse.json({ passId, qrPayload, holderEmail: body.holderEmail });
}

export { getIssuedPassByCredential };
```

`src/app/api/admin/passes/revoke/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getIssuedPassByCredential, updatePassStatus } from '@/lib/db/passes';
import { createClient } from '@/lib/eid/client';
import { readSession } from '@/lib/session';
import { SESSION_COOKIE } from '@/lib/config';

export async function POST(req: Request): Promise<NextResponse> {
  const cookie = req.headers.get('cookie') ?? '';
  const token = cookie.split(`${SESSION_COOKIE}=`)[1]?.split(';')[0];
  const session = await readSession(token);
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json()) as { passId?: string };
  if (!body.passId) return NextResponse.json({ error: 'passId wajib' }, { status: 400 });

  const db = getDb();
  const row = getIssuedPassByCredential(db, body.passId);
  if (!row) return NextResponse.json({ error: 'pass tidak ditemukan' }, { status: 404 });

  const eid = createClient();
  await eid.revokeCredential(body.passId);
  updatePassStatus(db, row.id, 'revoked');
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npm test`
Expected: admin passes tests pass. If `getDb()` cache binds the first path (file db from dev) before test uses `:memory:`, tests use `initDb(':memory:')` in Task 2 after `beforeAll`; ensure tests import `initDb(':memory:')` explicitly and set it as the active db. Fix if needed by having route handlers read `process.env.DB_PATH || ':memory:'` when `NODE_ENV === 'test'`; simplest: set `process.env.DB_PATH = ':memory:'` at top of each API test file before any `getDb()` call.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: admin issue/revoke pass API"
```

---

### Task 10: Self-Registration API (KYC + Payment + Auto-Issue)

**Files:**
- Create: `src/app/api/register/route.ts`
- Test: `tests/api-register.test.ts`

**Interfaces:**
- Consumes: `createClient`, `getDb`, `insertKyc`, `insertPayment`, `insertIssuedPass`, `getTariff`, `addHoursISO`
- Produces:
  - `POST /api/register { fullName, email, tariffId }` →
    - KYC (mock) insert `kyc_requests` (status `approved`)
    - payment insert (status `paid`, amount from tariff)
    - auto-issue `AccessPass` VC (validHours from tariff) via e.id
    - insert `issued_passes` source `self`
    - returns `{ passId, qrPayload, amountCents }` (201) or 400.

- [ ] **Step 1: Write `src/lib/db/money.ts` helper (getTariff)**

`src/lib/db/money.ts`:

```ts
import type { DBSession } from '../db';

export interface TariffRow {
  id: number;
  org_id: number;
  name: string;
  area_scope: string;
  price_cents: number;
  valid_hours: number;
}

export function getTariff(db: DBSession, id: number): TariffRow | undefined {
  return db.get<TariffRow>('SELECT * FROM tariffs WHERE id = ?', [id]);
}

export function listTariffs(db: DBSession, orgId: number): TariffRow[] {
  return db.all<TariffRow>('SELECT * FROM tariffs WHERE org_id = ?', [orgId]);
}
```

- [ ] **Step 2: Write the failing test**

`tests/api-register.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { initDb } from '../src/lib/db';
import { seedDemo } from '../src/lib/db/seed';
import { getTariff } from '../src/lib/db/money';
import { __resetFake } from '../src/lib/eid/client';
import { POST } from '../src/app/api/register/route';

describe('register api', () => {
  let db: ReturnType<typeof initDb>;
  let tariffId: number;
  let orgId: number;

  beforeAll(() => {
    process.env.DB_PATH = ':memory:';
    __resetFake();
    db = initDb(':memory:');
    const seeded = seedDemo(db);
    orgId = seeded.orgId;
    tariffId = getTariff(db, 1)!.id;
  });

  afterEach(() => __resetFake());

  it('self-registers, pays, and auto-issues an AccessPass', async () => {
    const res = await POST(new Request('http://localhost/api/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fullName: 'Tamu Mandiri', email: 'tamu2@demo.id', tariffId }),
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.qrPayload).toBeTruthy();
    expect(body.amountCents).toBe(25_000);

    const pay = db.get<any>('SELECT * FROM payments WHERE holder_email = ?', ['tamu2@demo.id']);
    expect(pay).toBeTruthy();
    expect(pay.amount_cents).toBe(25_000);
    expect(pay.status).toBe('paid');

    const kyc = db.get<any>('SELECT * FROM kyc_requests WHERE holder_email = ?', ['tamu2@demo.id']);
    expect(kyc?.status).toBe('approved');

    const pass = db.get<any>('SELECT * FROM issued_passes WHERE holder_email = ?', ['tamu2@demo.id']);
    expect(pass?.source).toBe('self');
    expect(pass?.template_name).toBe('AccessPass');
    expect(pass?.status).toBe('active');
  });

  it('rejects bad tariff', async () => {
    const res = await POST(new Request('http://localhost/api/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fullName: 'X', email: 'x@demo.id', tariffId: 9999 }),
    }));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/api-register.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write `src/lib/db/money.ts`** as in Step 1 (already shown).

- [ ] **Step 5: Write the register route**

`src/app/api/register/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getTariff } from '@/lib/db/money';
import { insertKyc, insertPayment } from '@/lib/db/money';
import { insertIssuedPass } from '@/lib/db/passes';
import { createClient } from '@/lib/eid/client';
import { addHoursISO } from '@/lib/db/seed';

export async function POST(req: Request): Promise<NextResponse> {
  const body = (await req.json()) as { fullName?: string; email?: string; tariffId?: number };
  if (!body.fullName || !body.email || !body.tariffId) {
    return NextResponse.json({ error: 'fullName, email, tariffId wajib' }, { status: 400 });
  }

  const db = getDb();
  const tariff = getTariff(db, body.tariffId);
  if (!tariff) return NextResponse.json({ error: 'tarif tidak ditemukan' }, { status: 400 });

  const orgId = tariff.org_id;
  const kyc = await createClient().startKyc(body.email);
  db.run(
    'INSERT INTO kyc_requests (org_id, holder_email, provider, status, ref_id, created_at) VALUES (?,?,?,?,?,?)',
    [orgId, body.email, 'mock-kyc', 'approved', kyc.kycId, new Date().toISOString()],
  );

  const orderId = `ORD-${Date.now()}`;
  const paymentId = db.run(
    'INSERT INTO payments (org_id, order_id, holder_email, tariff_id, amount_cents, method, status, created_at) VALUES (?,?,?,?,?,?,?,?)',
    [orgId, orderId, body.email, tariff.id, tariff.price_cents, 'QRIS(mock)', 'paid', new Date().toISOString()],
  ).lastInsertRowid as number;

  const validFromIso = new Date().toISOString();
  const validUntilIso = addHoursISO(validFromIso, tariff.valid_hours);

  const { credentialId, qrPayload } = await createClient().issueCredential({
    templateName: 'AccessPass',
    holderEmail: body.email,
    claims: { fullName: body.fullName, area: 'Ruang Umum', validFrom: validFromIso, validUntil: validUntilIso },
    validFrom: validFromIso,
    validUntil: validUntilIso,
  });

  const passId = insertIssuedPass(db, {
    org_id: orgId,
    credential_id: credentialId,
    holder_email: body.email,
    template_name: 'AccessPass',
    rule_id: null,
    status: 'active',
    source: 'self',
    host_ref: null,
    valid_from: validFromIso,
    valid_until: validUntilIso,
  });

  return NextResponse.json({ passId, qrPayload, amountCents: tariff.price_cents, orderId }, { status: 201 });
}

// helper exports referenced by later tasks
export const __helpers = { insertKyc, insertPayment };
```

Add to `src/lib/db/money.ts`:

```ts
export function insertKyc(db: DBSession, row: { org_id: number; holder_email: string; provider: string; status: string; ref_id: string }): void {
  db.run('INSERT INTO kyc_requests (org_id, holder_email, provider, status, ref_id, created_at) VALUES (?,?,?,?,?,?)',
    [row.org_id, row.holder_email, row.provider, row.status, row.ref_id, new Date().toISOString()]);
}

export function insertPayment(db: DBSession, row: { org_id: number; order_id: string; holder_email: string; tariff_id: number; amount_cents: number; method: string; status: string }): number {
  return db.run('INSERT INTO payments (org_id, order_id, holder_email, tariff_id, amount_cents, method, status, created_at) VALUES (?,?,?,?,?,?,?,?)',
    [row.org_id, row.order_id, row.holder_email, row.tariff_id, row.amount_cents, row.method, row.status, new Date().toISOString()]).lastInsertRowid as number;
}
```

- [ ] **Step 6: Run tests to verify pass**

Run: `npm test`
Expected: register tests pass.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: self-registration API (KYC + payment + auto-issue)"
```

---

### Task 11: Verify API (Gate/Locker Check + Anomaly Persist)

**Files:**
- Create: `src/app/api/verify/route.ts`
- Test: `tests/api-verify.test.ts`

**Interfaces:**
- Consumes: `getDb/getRuleForAccessPoint/getOrgForAccessPoint`, `createClient().verifyPresentation`, `evaluateGate`, `toOrgLocal`, `getActuator`, `detectAnomaly`, `getIssuedPassByCredential`, `insertIssuedPass` deps
- Produces:
  - `GET /api/verify/access-points` — returns all access points with rules (for gate screen).
  - `POST /api/verify { accessPointId, qrPayload }` →
    - verify via e.id
    - load rule for accessPoint; load org tz
    - `decision = evaluateGate(result, rule, toOrgLocal(new Date(), org.tz_offset_min))`
    - action = `open_locker` for locker kind else `open_gate` when GRANT; run actuator
    - persist `access_events` row; run `detectAnomaly` over recent events and insert `anomaly_alerts`
    - returns `{ decision, actuator, pass: { holderEmail, status } | null }` (200)
  - Webhook stub `POST /api/webhooks/eid/verification` returns `{ ok: true }` (documented as e.id callback landing point).

- [ ] **Step 1: Write `src/lib/db/access.ts` helpers**

```ts
import type { DBSession } from '../db';
import type { GateRule, AccessLogItem } from '../types';

export interface OrgRow { id: number; name: string; tz_offset_min: number; currency: string }
export interface AccessPointRow { id: number; org_id: number; area_id: number; name: string; kind: string }
export interface RuleRow { id: number; access_point_id: number; required_type: string; prerequisites: string; area_scope: string; open_minute: number; close_minute: number }

export function getOrgForAccessPoint(db: DBSession, accessPointId: number): OrgRow | undefined {
  return db.get<OrgRow>(
    'SELECT o.* FROM organizations o JOIN access_points p ON p.org_id = o.id WHERE p.id = ?',
    [accessPointId],
  );
}

export function getRuleForAccessPoint(db: DBSession, accessPointId: number): GateRule | undefined {
  const r = db.get<RuleRow>('SELECT * FROM access_rules WHERE access_point_id = ?', [accessPointId]);
  if (!r) return undefined;
  return {
    id: r.id,
    accessPointId: r.access_point_id,
    requiredType: r.required_type,
    prerequisites: JSON.parse(r.prerequisites),
    openMinute: r.open_minute,
    closeMinute: r.close_minute,
    areaScope: JSON.parse(r.area_scope),
  };
}

export function getAccessPoint(db: DBSession, id: number): AccessPointRow | undefined {
  return db.get<AccessPointRow>('SELECT * FROM access_points WHERE id = ?', [id]);
}

export function listAccessPointsByOrg(db: DBSession, orgId: number): Array<AccessPointRow & { area_name: string; rule: GateRule | null }> {
  const rows = db.all<any>(
    'SELECT p.*, a.name AS area_name FROM access_points p JOIN areas a ON a.id = p.area_id WHERE p.org_id = ?',
    [orgId],
  );
  return rows.map((row) => ({
    ...row,
    rule: getRuleForAccessPoint(db, row.id) ?? null,
  }));
}

export function recentAccessLogs(db: DBSession, orgId: number, passId?: string, limit = 200): AccessLogItem[] {
  const rows = db.all<any>(
    'SELECT pass_id, access_point_id, verdict, created_at FROM access_events WHERE org_id = ? ORDER BY id DESC LIMIT ?',
    [orgId, limit],
  );
  return rows
    .filter((r) => !passId || r.pass_id === passId)
    .map((r) => ({
      passId: r.pass_id ?? '',
      accessPointId: r.access_point_id,
      hour: new Date(r.created_at).getHours(),
      verdict: r.verdict,
      tsMs: Date.parse(r.created_at),
    }));
}
```

- [ ] **Step 2: Write the failing test**

`tests/api-verify.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { initDb } from '../src/lib/db';
import { seedDemo } from '../src/lib/db/seed';
import { listAccessPointsByOrg } from '../src/lib/db/access';
import { createClient, __resetFake } from '../src/lib/eid/client';
import { POST, GET as listGet } from '../src/app/api/verify/route';

describe('verify api', () => {
  let db: ReturnType<typeof initDb>;
  let orgId: number;
  let mainGateId: number;
  let labGateId: number;
  let lockerId: number;

  beforeAll(async () => {
    process.env.DB_PATH = ':memory:';
    __resetFake();
    db = initDb(':memory:');
    const seeded = seedDemo(db, createClient());
    orgId = seeded.orgId;
    const points = listAccessPointsByOrg(db, orgId);
    mainGateId = points.find((p) => p.name === 'Pintu Utama')!.id;
    labGateId = points.find((p) => p.name === 'Pintu Lab')!.id;
    lockerId = points.find((p) => p.name === 'Loker A-12')!.id;
  });

  afterEach(() => __resetFake());

  it('GRANT at main gate for a valid access pass', async () => {
    const eid = createClient();
    const issued = await eid.issueCredential({
      templateName: 'AccessPass', holderEmail: 'tamu@demo.id',
      claims: { fullName: 'Tamu' }, validUntil: '2026-12-31T00:00:00Z',
    });
    const res = await POST(new Request('http://localhost/api/verify', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accessPointId: mainGateId, qrPayload: issued.qrPayload }),
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.decision.verdict).toBe('GRANT');
    expect(body.actuator.detail).toBe('LED_HIJAU');
  });

  it('DENY at lab gate without SafetyInduction prerequisite', async () => {
    const eid = createClient();
    const issued = await eid.issueCredential({
      templateName: 'AccessPass', holderEmail: 'budi@kampus.demo',
      claims: { fullName: 'Budi' }, validUntil: '2026-12-31T00:00:00Z',
    });
    const res = await POST(new Request('http://localhost/api/verify', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accessPointId: labGateId, qrPayload: issued.qrPayload }),
    }));
    const body = await res.json();
    expect(body.decision.verdict).toBe('DENY');
    expect(body.decision.reasons.join(' ')).toContain('SafetyInduction');
    expect(body.actuator.ok).toBe(false);
  });

  it('opens locker when GRANT', async () => {
    const eid = createClient();
    const issued = await eid.issueCredential({
      templateName: 'AccessPass', holderEmail: 'tamu@demo.id',
      claims: { fullName: 'Tamu' }, validUntil: '2026-12-31T00:00:00Z',
    });
    const res = await POST(new Request('http://localhost/api/verify', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accessPointId: lockerId, qrPayload: issued.qrPayload }),
    }));
    const body = await res.json();
    expect(body.decision.verdict).toBe('GRANT');
    expect(body.actuator.detail).toBe('LOCKER_TERBUKA');
  });

  it('lists access points', async () => {
    const res = await listGet(new Request('http://localhost/api/verify/access-points'));
    const body = await res.json();
    expect(body.length).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/api-verify.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the verify route**

`src/app/api/verify/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getOrgForAccessPoint, getRuleForAccessPoint, getAccessPoint, listAccessPointsByOrg, recentAccessLogs } from '@/lib/db/access';
import { getIssuedPassByCredential } from '@/lib/db/passes';
import { createClient } from '@/lib/eid/client';
import { evaluateGate } from '@/lib/engine/gating';
import { detectAnomaly } from '@/lib/engine/anomaly';
import { getActuator } from '@/lib/actuator';
import { toOrgLocal } from '@/lib/time';

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const orgId = Number(url.searchParams.get('orgId') ?? '1');
  return NextResponse.json(listAccessPointsByOrg(getDb(), orgId));
}

export async function POST(req: Request): Promise<NextResponse> {
  const body = (await req.json()) as { accessPointId?: number; qrPayload?: string };
  if (!body.accessPointId || !body.qrPayload) {
    return NextResponse.json({ error: 'accessPointId dan qrPayload wajib' }, { status: 400 });
  }

  const db = getDb();
  const eid = createClient();

  const result = await eid.verifyPresentation(body.qrPayload);
  const rule = getRuleForAccessPoint(db, body.accessPointId);
  const point = getAccessPoint(db, body.accessPointId);
  if (!rule || !point) {
    return NextResponse.json({ error: 'akses point / rule tidak ditemukan' }, { status: 404 });
  }

  const org = getOrgForAccessPoint(db, body.accessPointId) ?? { id: 1, name: 'UPN Kampus', tz_offset_min: 420, currency: 'IDR' };
  const decision = evaluateGate(result, rule, toOrgLocal(new Date(), org.tz_offset_min));
  const actuator = getActuator();
  const action = point.kind === 'locker' ? 'open_locker' : decision.verdict === 'GRANT' ? 'open_gate' : 'check';
  const act = decision.verdict === 'GRANT' ? await actuator.execute(action, point.name) : { ok: false, detail: 'DENY' };

  const mainCred = result.credentials[0];
  const pass = mainCred ? getIssuedPassByCredential(db, mainCred.id) : undefined;

  db.run(
    'INSERT INTO access_events (org_id, pass_id, access_point_id, verdict, reasons, credential_id, action, actuator_detail, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
    [org.id, pass?.credential_id ?? null, body.accessPointId, decision.verdict, JSON.stringify(decision.reasons), mainCred?.id ?? null, action, act.detail, new Date().toISOString()],
  );

  const logs = recentAccessLogs(db, org.id, pass?.credential_id ?? (mainCred?.id ?? ''));
  const alerts = detectAnomaly(logs);
  for (const alert of alerts) {
    db.run(
      'INSERT INTO anomaly_alerts (org_id, pass_id, severity, reasons, created_at) VALUES (?,?,?,?,?)',
      [org.id, alert.passId, alert.severity, JSON.stringify(alert.reasons), new Date().toISOString()],
    );
  }

  return NextResponse.json({
    decision,
    actuator: act,
    pass: pass ? { holderEmail: pass.holder_email, status: pass.status } : null,
  });
}
```

- [ ] **Step 5: Write the webhook stub**

`src/app/api/webhooks/eid/verification/route.ts`:

```ts
import { NextResponse } from 'next/server';

export async function POST(req: Request): Promise<NextResponse> {
  const body = await req.json().catch(() => null);
  console.log('[webhook:eid:verification]', JSON.stringify(body));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Run tests to verify pass**

Run: `npm test`
Expected: verify API tests pass (locker GRANT test: rule `requiredType AccessPass` + no prereq + open 00:00–24:00 → GRANT → `LOCKER_TERBUKA`).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: verify API with gating, actuator, anomaly alerts"
```

---

### Task 12: Stats API

**Files:**
- Create: `src/app/api/stats/route.ts`
- Test: `tests/api-stats.test.ts`

**Interfaces:**
- Consumes: `forecastLinear`, `hourlyHistogram`, `revenueByDay`, `getDb`, org row
- Produces: `GET /api/stats?orgId=1` → `{ hourly: number[], daily: DayPoint[], forecast: DayPoint[], revenue: DayPoint[], alerts: Array<{ id, pass_id, severity, reasons, created_at }>, revenueTotalCents: number }`

- [ ] **Step 1: Write the failing test**

`tests/api-stats.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initDb } from '../src/lib/db';
import { seedDemo } from '../src/lib/db/seed';
import { GET } from '../src/app/api/stats/route';

describe('stats api', () => {
  let db: ReturnType<typeof initDb>;
  let orgId: number;

  beforeAll(() => {
    process.env.DB_PATH = ':memory:';
    db = initDb(':memory:');
    const seeded = seedDemo(db);
    orgId = seeded.orgId;
    // spread events over 3 distinct days so forecast has >=2 points
    const base = Date.parse('2026-08-18T01:00:00Z'); // 08:00 JKT
    for (let i = 0; i < 5; i++) {
      const iso = new Date(base + i * 24 * 3_600_000).toISOString();
      db.run(
        'INSERT INTO access_events (org_id, pass_id, access_point_id, verdict, reasons, credential_id, action, actuator_detail, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
        [orgId, `p${i}`, 1, 'GRANT', '[]', `c${i}`, 'open_gate', 'LED_HIJAU', iso],
      );
      db.run(
        'INSERT INTO payments (org_id, order_id, holder_email, tariff_id, amount_cents, method, status, created_at) VALUES (?,?,?,?,?,?,?,?)',
        [orgId, `O${i}`, `u${i}@d.id`, 1, 25_000, 'QRIS(mock)', 'paid', iso],
      );
    }
  });

  it('returns aggregates and forecast', async () => {
    const res = await GET(new Request('http://localhost/api/stats?orgId=1'));
    const body = await res.json();
    expect(body.hourly).toHaveLength(24);
    expect(body.daily.length).toBeGreaterThan(0);
    expect(body.forecast.length).toBeGreaterThan(0);
    expect(body.revenueTotalCents).toBe(125_000);
    expect(body.revenue.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api-stats.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the route**

`src/app/api/stats/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { forecastLinear, hourlyHistogram, revenueByDay, type DayPoint } from '@/lib/engine/stats';

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const orgId = Number(url.searchParams.get('orgId') ?? '1');
  const db = getDb();

  const events = db.all<any>('SELECT created_at, pass_id FROM access_events WHERE org_id = ?', [orgId]).map((e) => ({ ms: Date.parse(e.created_at) as number, passId: e.pass_id }));
  const hourly = hourlyHistogram(events.map((e) => e.ms));

  const dayMap = new Map<string, number>();
  for (const e of events) {
    const d = new Date(e.ms);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
  }
  const daily: DayPoint[] = [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, count]) => ({ date, count }));
  const forecast = forecastLinear(daily, 3);

  const payments = db.all<any>('SELECT created_at, amount_cents FROM payments WHERE org_id = ?', [orgId]);
  const revenue = revenueByDay(payments);
  const revenueTotalCents = payments.reduce((s, p) => s + p.amount_cents, 0);

  const alerts = db.all<any>('SELECT id, pass_id, severity, reasons, created_at FROM anomaly_alerts WHERE org_id = ? ORDER BY id DESC LIMIT 10', [orgId]);

  return NextResponse.json({ orgId, hourly, daily, forecast, revenue, revenueTotalCents, alerts });
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test`
Expected: stats API tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: stats API (hourly, daily, forecast, revenue, alerts)"
```

---

### Task 13: UI — Login, Holder Pass, Self-Registration Pages

**Files:**
- Create: `src/app/page.tsx` (landing w/ "Login dengan e.id"), `src/app/login/page.tsx`, `src/app/holder/[passId]/page.tsx`, `src/app/register/page.tsx`
- Smoke only (no vitest): verified via `npm run dev` + curl.

**Interfaces:**
- Consumes: `/api/auth/eid/start`, `/api/register`, DB via server component, `qrcode`, `TariffRow.listTariffs`
- Produces: navigable pages for demo script.

- [ ] **Step 1: Landing page with SSO button**

`src/app/page.tsx`:

```tsx
import Link from 'next/link';
import { APP_NAME } from '@/lib/config';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 text-slate-100">
      <h1 className="text-3xl font-bold">{APP_NAME}</h1>
      <p className="text-slate-400">Akses fisik terverifikasi — dikelola lewat e.id Verifiable Credentials.</p>
      <Link href="/api/auth/eid/start" className="rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-slate-950 hover:bg-emerald-400">
        Login dengan e.id
      </Link>
      <div className="flex gap-4 text-sm">
        <Link href="/register" className="text-emerald-300 underline">Daftar sebagai tamu</Link>
        <Link href="/admin/dashboard" className="text-emerald-300 underline">Dashboard admin</Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Login page (bridge)**

`src/app/login/page.tsx`:

```tsx
import Link from 'next/link';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-slate-100">
      <h1 className="text-2xl font-semibold">Masuk dengan e.id</h1>
      <Link href="/api/auth/eid/start" className="rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-slate-950">
        Login dengan e.id
      </Link>
      <Link href="/" className="text-sm text-slate-400 underline">Kembali</Link>
    </main>
  );
}
```

- [ ] **Step 3: Holder pass page (renders QR of the VC payload)**

`src/app/holder/[passId]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { getDb } from '@/lib/db';
import { getIssuedPassByCredential } from '@/lib/db/passes';

export const dynamic = 'force-dynamic';

const fmt = (iso: string) => new Date(iso).toLocaleString('id-ID');

export default async function HolderPage({ params }: { params: Promise<{ passId: string }> }) {
  const { passId } = await params;
  const db = getDb();
  const pass = getIssuedPassByCredential(db, passId);
  if (!pass) notFound();

  const qrPayload = JSON.stringify({ v: 1, credentialId: pass.credential_id });
  const qr = await QRCode.toDataURL(qrPayload);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-slate-100">
      <h1 className="text-2xl font-semibold">Pass Akses</h1>
      <p className="text-slate-400">{pass.holder_email}</p>
      <img src={qr} alt="QR pass" className="h-56 w-56 rounded-lg bg-white p-2" />
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt>Jenis</dt><dd>{pass.template_name}</dd>
        <dt>Status</dt><dd className={pass.status === 'active' ? 'text-emerald-400' : 'text-rose-400'}>{pass.status}</dd>
        <dt>Berlaku dari</dt><dd>{fmt(pass.valid_from)}</dd>
        <dt>Sampai</dt><dd>{fmt(pass.valid_until)}</dd>
      </dl>
      <a href={`/gate/1`} className="text-sm text-emerald-300 underline">Coba di gate</a>
    </main>
  );
}
```

- [ ] **Step 4: Self-registration page (form → `/api/register` → show pass QR)**

`src/app/register/page.tsx` is a client component:

```tsx
'use client';

import { useEffect, useState } from 'react';

export default function RegisterPage() {
  const [tariffs, setTariffs] = useState<Array<{ id: number; name: string; price_cents: number }>>([]);
  const [form, setForm] = useState({ fullName: '', email: '', tariffId: '' });
  const [result, setResult] = useState<null | { qrPayload: string; amountCents: number; passId: string }>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/stats?orgId=1').catch(() => {});
    fetch('/api/tariffs').then((r) => r.json()).then(setTariffs).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, tariffId: Number(form.tariffId) }),
      });
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? 'Gagal daftar'); return; }
      setResult(body);
    } catch { setError('Gagal terhubung ke server'); }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-slate-100">
      <h1 className="text-2xl font-semibold">Self-Registration — Daftar Masuk</h1>
      {!result ? (
        <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-3">
          <input required placeholder="Nama lengkap" value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="rounded-lg bg-slate-800 p-3 text-slate-100" />
          <input required type="email" placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-lg bg-slate-800 p-3 text-slate-100" />
          <select required value={form.tariffId} onChange={(e) => setForm({ ...form, tariffId: e.target.value })}
            className="rounded-lg bg-slate-800 p-3 text-slate-100">
            <option value="">Pilih tarif</option>
            {tariffs.map((t) => (
              <option key={t.id} value={t.id}>{t.name} — Rp{(t.price_cents / 100).toLocaleString('id-ID')}</option>
            ))}
          </select>
          <button className="rounded-lg bg-emerald-500 p-3 font-semibold text-slate-950">Lanjut</button>
          {error && <p className="text-rose-400">{error}</p>}
        </form>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p className="text-emerald-400">Pembayaran diterima: Rp{(result.amountCents / 100).toLocaleString('id-ID')}</p>
          <a href={`/holder/${result.passId}`} className="text-emerald-300 underline">Lihat pass saya</a>
        </div>
      )}
      <a href="/" className="text-sm text-slate-400 underline">Kembali</a>
    </main>
  );
}
```

- [ ] **Step 5: Add `/api/tariffs` route (consumed by register page)**

`src/app/api/tariffs/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { listTariffs } from '@/lib/db/money';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(listTariffs(getDb(), 1));
}
```

- [ ] **Step 6: Smoke test the pages**

Run: `npm run dev` (background)
Then: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/` → `200`
`curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/register` → `200`
`curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/holder/nope` → `404`
Kill dev server.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: landing, login, holder, register pages + tariffs api"
```

---

### Task 14: UI — Gate Verifier Screen (QR scan → verdict)

**Files:**
- Create: `src/app/gate/[id]/page.tsx` (client component using `html5-qrcode`), `src/components/GateResult.tsx`
- Smoke via dev server + curl.

**Interfaces:**
- Consumes: `/api/verify` (GET list, POST check), `html5-qrcode`
- Produces: full-screen gate page wired to verify API showing GREEN (MASUK/BUKA) or RED (DITOLAK + reasons).

- [ ] **Step 1: Write the gate page**

`src/app/gate/[id]/page.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface VerifyResponse {
  decision: { verdict: string; score: number; reasons: string[] };
  actuator: { ok: boolean; detail: string };
  pass: null | { holderEmail: string; status: string };
}

const readerId = 'qr-reader';

export default function GatePage({ params }: { params: Promise<{ id: string }> }) {
  const [gateId, setGateId] = useState<string | null>(null);
  const [gateName, setGateName] = useState('');
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    params.then(({ id }) => {
      setGateId(id);
      fetch(`/api/verify?orgId=1`)
        .then((r) => r.json())
        .then((list) => setGateName(list.find((p: { id: string }) => String(p.id) === id)?.name ?? `Gate ${id}`))
        .catch(() => {});
    });
  }, [params]);

  useEffect(() => {
    if (!gateId) return;
    const scanner = new Html5Qrcode(readerId);
    scannerRef.current = scanner;
    scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 220, height: 220 } },
      (text) => { void check(text); }, () => {})
      .catch(() => { /* kamera ditolak → pakai input manual */ });
    return () => { scanner.stop().catch(() => {}); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gateId]);

  async function check(qrPayload: string) {
    if (busy || !gateId) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accessPointId: Number(gateId), qrPayload }),
      });
      setResult((await res.json()) as VerifyResponse);
    } catch {
      setResult({ decision: { verdict: 'DENY', score: 0, reasons: ['Gagal memproses verifikasi.'] }, actuator: { ok: false, detail: 'ERROR' }, pass: null });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 bg-slate-950 p-6 text-slate-100">
      <h1 className="text-2xl font-semibold">{gateName || 'Pindai QR'}</h1>

      {!result ? (
        <>
          <div id={readerId} className="w-full max-w-sm rounded-lg bg-black" />
          <div className="w-full max-w-sm">
            <p className="mb-1 text-sm text-slate-400">Atau tempel payload QR manual:</p>
            <textarea value={manual} onChange={(e) => setManual(e.target.value)}
              className="w-full rounded-lg bg-slate-800 p-2 text-sm" rows={2} />
            <button onClick={() => manual && check(manual)} disabled={busy}
              className="mt-2 w-full rounded-lg bg-slate-700 p-2 disabled:opacity-40">
              {busy ? 'Memverifikasi…' : 'Verifikasi'}
            </button>
          </div>
        </>
      ) : (
        <GateResult result={result} onReset={() => setResult(null)} />
      )}
    </main>
  );
}

function GateResult({ result, onReset }: { result: VerifyResponse; onReset: () => void }) {
  const grant = result.decision.verdict === 'GRANT';
  return (
    <div className={`w-full max-w-sm rounded-2xl p-8 text-center ${grant ? 'bg-emerald-600' : 'bg-rose-600'}`}>
      <p className="text-6xl">{grant ? '✓' : '✕'}</p>
      <h2 className="mt-2 text-3xl font-bold">{grant ? (result.actuator.detail === 'LOCKER_TERBUKA' ? 'LOCKER TERBUKA' : 'SILAKAN MASUK') : 'DITOLAK'}</h2>
      {result.actuator.ok && grant && <p className="mt-1 text-sm opacity-80">{result.actuator.detail}</p>}
      <ul className="mt-4 space-y-1 text-left text-sm">
        {result.decision.reasons.map((r, i) => <li key={i}>• {r}</li>)}
      </ul>
      {result.pass && <p className="mt-4 text-sm opacity-90">Holder: {result.pass.holderEmail} ({result.pass.status})</p>}
      <button onClick={onReset} className="mt-6 rounded-lg bg-slate-950/30 px-4 py-2">Pindai lagi</button>
    </div>
  );
}
```

- [ ] **Step 2: Smoke test**

Run dev; `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/gate/1` → `200`.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: gate verifier screen with QR scanner"
```

---

### Task 15: UI — Admin Dashboard (lists, analytics charts, alerts)

**Files:**
- Create: `src/app/admin/dashboard/page.tsx`, `src/components/charts.tsx`
- Smoke via dev + curl.

**Interfaces:**
- Consumes: `/api/stats`, `/api/admin/passes` (issue form optional), `/api/verify/access-points`
- Produces: dashboard with Recharts hourly bar, daily+forecast line, revenue list, alert list, access-point table.

- [ ] **Step 1: Write the charts component**

`src/components/charts.tsx`:

```tsx
'use client';

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function HourlyBar({ data }: { data: number[] }) {
  const rows = data.map((count, hour) => ({ hour: `${String(hour).padStart(2, '0')}:00`, count }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} />
        <YAxis stroke="#94a3b8" />
        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
        <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DailyLine({ daily, forecast }: { daily: Array<{ date: string; count: number }>; forecast: Array<{ date: string; count: number }> }) {
  const rows = [...daily.map((d) => ({ ...d, type: 'aktual' })), ...forecast.map((d) => ({ ...d, type: 'forecast' }))];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
        <YAxis stroke="#94a3b8" />
        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
        <Line type="monotone" dataKey="count" name="kunjungan" stroke="#38bdf8" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Write the dashboard page**

`src/app/admin/dashboard/page.tsx`:

```tsx
import { HourlyBar, DailyLine } from '@/components/charts';

interface Stats {
  hourly: number[];
  daily: Array<{ date: string; count: number }>;
  forecast: Array<{ date: string; count: number }>;
  revenue: Array<{ date: string; count: number }>;
  revenueTotalCents: number;
  alerts: Array<{ id: number; pass_id: string; severity: string; reasons: string }>;
}

const rupiah = (cents: number) => `Rp${(cents / 100).toLocaleString('id-ID')}`;

export default async function AdminDashboard() {
  const res = await fetch('http://localhost:3000/api/stats?orgId=1', { cache: 'no-store' });
  const stats = (await res.json()) as Stats;
  const points = await fetch('http://localhost:3000/api/verify/access-points?orgId=1', { cache: 'no-store' }).then((r) => r.json());

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard Admin — UPN Kampus</h1>
        <span className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950">{rupiah(stats.revenueTotalCents)}</span>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-slate-900 p-4">
          <h2 className="mb-2 font-medium text-slate-300">Volume per jam</h2>
          <HourlyBar data={stats.hourly} />
        </div>
        <div className="rounded-2xl bg-slate-900 p-4">
          <h2 className="mb-2 font-medium text-slate-300">Tren kunjungan + forecast 3 hari</h2>
          <DailyLine daily={stats.daily} forecast={stats.forecast} />
        </div>
      </section>

      <section className="mt-6 rounded-2xl bg-slate-900 p-4">
        <h2 className="mb-2 font-medium text-slate-300">Revenue per hari</h2>
        <ul className="divide-y divide-slate-800 text-sm">
          {stats.revenue.map((r) => (
            <li key={r.date} className="flex justify-between py-2">
              <span>{r.date}</span><span className="text-emerald-400">{rupiah(r.count)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl bg-slate-900 p-4">
        <h2 className="mb-2 font-medium text-slate-300">Anomali</h2>
        {stats.alerts.length === 0 ? <p className="text-sm text-slate-500">Tidak ada anomali.</p> : (
          <ul className="space-y-2 text-sm">
            {stats.alerts.map((a) => (
              <li key={a.id} className={`rounded-lg p-3 ${a.severity === 'high' ? 'bg-rose-900/40' : 'bg-amber-900/40'}`}>
                <span className="font-semibold text-amber-200">{a.pass_id}</span> ({a.severity})
                <div className="mt-1 text-slate-300">{JSON.parse(a.reasons).join(' ')}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-2xl bg-slate-900 p-4">
        <h2 className="mb-2 font-medium text-slate-300">Titik akses & peraturan</h2>
        <table className="w-full text-left text-sm">
          <thead><tr className="text-slate-400"><th>Nama</th><th>Area</th><th>Jenis</th><th>Prasyarat</th></tr></thead>
          <tbody>
            {points.map((p: any) => (
              <tr key={p.id} className="border-t border-slate-800">
                <td className="py-2">{p.name}</td><td>{p.area_name}</td><td>{p.kind}</td>
                <td>{p.rule?.prerequisites?.length ? p.rule.prerequisites.join(', ') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Adjust for absolute URL** — in dev, `http://localhost:3000` fine. Mark `export const dynamic = 'force-dynamic'` if needed for `no-store` fetch (kept `cache: 'no-store'`). If fetch fails due to host, fall back to `getDb()` directly in an inline server import (acceptable improvement, not required for smoke).

- [ ] **Step 4: Smoke test**

Run dev; `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin/dashboard` → `200`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: admin dashboard with analytics, revenue, alerts"
```

---

### Task 16: Demo Seed Script, Run-through, README

**Files:**
- Create: `scripts/demo.ts` (prints step-by-step checklist + executes the demo actions end-to-end), `README.md`
- Smoke: run `npm run demo`.

**Interfaces:**
- Consumes: everything above via HTTP on `localhost:3000`
- Produces: a reproducible demo run and documentation.

- [ ] **Step 1: Write `scripts/demo.ts`**

```ts
import { initDb } from '../src/lib/db';
import { seedDemo } from '../src/lib/db/seed';
import { createClient } from '../src/lib/eid/client';

async function main() {
  const db = initDb();
  const { orgId } = seedDemo(db, createClient());
  console.log('\n=== VERIFYPASS DEMO (e.id) ===');
  console.log(`Org: UPN Kampus (id=${orgId})`);
  console.log('\n1. Admin login via e.id SSO:  /api/auth/eid/start');
  console.log('2. Tamu self-register:         POST /api/register { email, tariffId }');
  console.log('3. Gate check:                 POST /api/verify { accessPointId, qrPayload }');
  console.log('4. Buka locker:                gunakan access point Loker A-12');
  console.log('5. Dashboard + analytics:      /admin/dashboard');
  console.log('\nUI:');
  console.log('  Landing ............ /');
  console.log('  Gate Pintu Utama ... /gate/1');
  console.log('  Gate Pintu Lab ..... /gate/2');
  console.log('  Loker A-12 ......... /gate/3');
  console.log('  Dashboard .......... /admin/dashboard');
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
```

- [ ] **Step 2: Write `README.md`** covering: intro, e.id integration summary (which capabilities + fake sandbox mode), quickstart (`npm i`, `npm run seed`, `npm run dev`), demo script (the 7 steps from the spec section 9), environment variables (`EID_FAKE`, `DB_PATH`, `ACTUATOR_URL`, `SESSION_SECRET`), and honest AI framing + roadmap note (real e.id HTTP adapter, Midtrans/Xendit).

- [ ] **Step 3: Final full verification**

Run: `npm test` → all green.
Run: `npm run build` → succeeds (bonus: catches server/client split errors).
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "docs: README + demo script; final polish"
```

---

## Self-Review

**Spec coverage:**
- OAuth SSO login → Task 8, UI Task 13 ✓
- KYC Gateway self-registration → Task 10, Task 13 ✓
- Issuer API (issue/revoke/auto-issue) → Tasks 9, 10, 6 (fake) ✓
- Holder API claim → holder page Task 13 (fake mode: issue returns qr directly) ✓
- Verifier API + QR + Presentation → Task 11, gate UI Task 14 ✓
- Selective disclosure — noted as optional in spec; fake cleartext equivalent; documented ✓
- Template API (render pass card image) → NOT implemented as image rendering (kept QR-only). Documented in README roadmap as adapter extension.
- Webhook → Task 11 stub ✓
- Gating engine + explainable AI → Task 3, wired Task 11 ✓
- Anomaly detection → Task 4, wired Task 11 ✓
- Analytics/forecasting → Task 5, API Task 12, UI Task 15 ✓
- Monetization pay-per-access → Task 10 (payment mock) + revenue in Task 12 ✓
- Delegation (host → guest) → NOT in plan tasks (scope). Documented in README as roadmap.
- Actuator simulated/ESP32 → Task 7 ✓
- Hardening: no hardware required → simulated default ✓
- Emoji/UI polish → Tailwind dark theme throughout ✓

**Gaps + fixes:** Template API image rendering and host→guest delegation are listed in README roadmap (out of MVP); the spec marks them as scope for demoability, MVP keeps QR-based access + issuance.

**Type consistency:** `EidClient` interface (Task 2 types) matches `FakeEidClient` (Task 6) and route usage (Tasks 8–10) ✓. `insertIssuedPass(db, row)` returns number insert id; `getIssuedPassByCredential(db, credentialId)` returns `IssuedPassRow` — consistent across Tasks 9–14 ✓. Engine `evaluateGate(result, rule, localNow)` used in Task 11 with `toOrgLocal(new Date(), org.tz_offset_min)` ✓. `detectAnomaly(logs)` returns `AnomalyReport[]` with `passId` matching `credential_id` stored on `access_events.pass_id` ✓ (anomaly filter uses `pass?.credential_id`). `listTariffs`/`getTariff` from `src/lib/db/money.ts` ✓ used in Tasks 10 & 13. `/api/tariffs` added in Task 13 ✓. `addHoursISO` imported from `seed.ts` — keeps a single definition ✓. Room for `IMG`/`ENV` mismatch: none identified.

**Plan saved to:** `docs/superpowers/plans/2026-08-29-verifypass.md`.