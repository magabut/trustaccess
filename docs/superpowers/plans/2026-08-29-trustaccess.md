# TrustAccess — Trusted Credential & Access Infrastructure by e.id — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build TrustAccess in one day: a Next.js platform where organizations issue verifiable digital documents & credentials (signed via e.id) that also become authorization prerequisites, so the policy engine can turn a holder's complete credential portfolio into explainable GRANT/DENY decisions that drive real gates, lockers and rooms — monetizable as per-gate SaaS + transaction-based access.

**Architecture:** Single Next.js App Router app. All e.id contact goes through one adapter (`src/lib/eid/`) with a `FakeEidClient` for sandbox/demo — TrustAccess requests issuance from e.id and never claims to sign documents itself. A normalized internal model (credentials/documents) feeds pure business engines: `src/lib/engine/gating.ts` (policy decision, GRANT/DENY + reasons + `usedPassId` + `passChecks`), `src/lib/engine/anomaly.ts` and `src/lib/engine/stats.ts`. New first-class layers: `src/lib/credential/*` (portfolio & lifecycle), `src/lib/document/*` (verification trace & signed-document presentation) and `src/lib/policy/*` (multi-domain policy library driving the same engine). An `ActuatorProvider` separates physical actions (simulated on screen, optional ESP32) from the decision path. SQLite via `better-sqlite3` with raw SQL.

**Positioning:** TrustAccess is NOT "a QR scanner / locker app". e.id is the **trust layer** (identity, verifiable credentials, cryptographic verification, issuer, holder, verifier). TrustAccess is the **application/business layer**: credential management, document generation, policy engine, access decision, delegation, audit trail, analytics, anomaly detection, physical/digital access. The locker is only one demonstration of the platform.

**Roles are capabilities, not fixed user types** (per spec §2.3): one account can combine Holder / Issuer / Verifier / Administrator. This keeps the MVP org-centric path (Org → Issuer → Holder → Policy → Access) while allowing `Individual → Issuer → Holder` later. Three product sides (spec §2.4): **Personal** (holder/network effect), **Business** (B2B SaaS, primary revenue), **Verify** (per-verification transactions). MVP implements the Business + Holder path (the existing `users` / `organizations` tables and the issuer / verifier route group already map onto these roles), so the additional sides are additive surface, not rework of the core engine.

**Registerable — generic registration engine** (spec §18): organisations can create things the public can register for — rooms, events/concerts, activities, memberships — each with a unique **registration QR** and a `kind`. Public scan QR → e.id KYC → (payment mock if paid, or `next` directly if free) → credential/ticket/issued to the e.id wallet → check-in via QR → TrustAccess policy. This reuses the existing self-registration flow (Task 10: KYC → payment mock → auto-issue); the additions are the `registerables` + `registrations` tables, QR-per-registerable, and the paid/free branch. Two extra QR flows: (1) **claim access point** — admin scans a physical QR (`{ v:1, accessPointId }`) to mount an access point into the org; (2) **registerable QR** — public scans to register.

Core story: `IDENTITY → CREDENTIAL → TRUST → POLICY → PERMISSION → ACTION`. One trust engine, many real-world permissions. Final message: *"TrustAccess doesn't just verify who you are. It verifies what you are entitled to do."*

**Tech Stack:** Next.js 15 (App Router, `--src-dir`, TypeScript, Tailwind), better-sqlite3, jose (session JWT), qrcode (generate), html5-qrcode (scan), recharts (charts), date-fns (dates), vitest (tests), tsx (seed script).

**Spec:** `docs/superpowers/specs/2026-08-29-trustaccess-design.md` — the plan argues from the spec; executors read both.

## Global Constraints

- Node 20+, npm, macOS/Linux.
- All money stored as integer cents-rupiah: `priceCents` (e.g. 25_000 = Rp25.000). Never floats.
- Times stored as ISO strings in UTC. Rule open/close are `minutesOfDay` in org-local wall clock. Asia/Jakarta offset = **420 minutes** (`tzOffsetMin` column).
- `better-sqlite3` is a native module: must be in `serverExternalPackages` of next.config AND imported only inside Server Components / route handlers / lib — never into a `"use client"` component.
- Demo sandbox mode = `EID_FAKE=1` (default when unset → fake). Real e.id REST integration is out of MVP scope (documented as adapter extension).
- TrustAccess **never signs documents itself** — signing/crypto verification is delegated to e.id via the adapter; the fake adapter mirrors e.id response formats exactly.
- Authorization is a **deterministic policy engine**. NEVER use an LLM to make GRANT/DENY decisions.
- "AI" in demo copy = rule chain + statistics + optional natural-language summary. Never claim deep learning.
- Indonesian user-facing strings (reasons/alerts in Bahasa). Code identifiers in English.
- Every task ends with: green test run + a git commit.

## Phases & Task Map (execution order)

> Tasks keep the original numbering and are extended in place; new tasks are appended (17+). Work within a phase in the listed order; the phase is the review checkpoint.

- **Phase 0 — Foundation (platform shell):** Tasks 1, 2, 3, 4, 5, 6, 7, 8.
- **Phase 1 — P0 core product (credential / document / decision):** Task 17 (pure modules) → Tasks 9, 11 (issuance + portfolio verify) → Task 18 (document verification API + screen) → Tasks 13, 19 (holder UI + My Credentials) → Task 14 (gate UI) → Task 15 (admin dashboard) → Task 20 (audit trail).
- **Phase 2 — P1 (business features):** Tasks 10, 12, 22 (self-registration, stats, revenue dashboard) → Task 21 (delegation).
- **Phase 3 — P2 (intelligence):** Task 23 (LLM explanation stub, off by default). Anomaly (Task 4) and forecasting (Task 5) live in Phase 0; ESP32 stays Task 7.

### Task index

| # | Task | Phase |
|----|------|-------|
| 1 | Scaffold + test harness | 0 |
| 2 | Types + DB layer (schema, runner, seed) — extended for credentials/documents/policies | 0 |
| 3 | Gating engine (pure) — `resolveMainPass` / `checkPrerequisites` | 0 |
| 4 | Anomaly detection (pure) | 0 |
| 5 | Stats & forecasting (pure) | 0 |
| 6 | e.id adapter — fake client (extended for document issuance) | 0 |
| 7 | Actuator provider (simulated + ESP32) | 0 |
| 8 | Session + e.id SSO login | 0 |
| 9 | Admin API — issue & revoke credentials/documents | 1 |
| 10 | Self-registration API (KYC + payment + auto-issue) | 2 |
| 11 | Verify API — portfolio vs policy, GRANT/DENY + trace, anomaly persist | 1 |
| 12 | Stats API — business metrics + revenue | 2 |
| 13 | UI — landing, login, holder pages | 1 |
| 14 | UI — gate verifier screen (QR → verdict) | 1 |
| 15 | UI — admin dashboard (business value, live access) | 1 |
| 16 | Demo seed script + run-through + README | 3 |
| **17** | **NEW — lib/credential + lib/document + lib/policy (pure modules)** | 1 |
| **18** | **NEW — document verification: API + /verify/document screen** | 1 |
| **19** | **NEW — holder "My Credentials" view (portfolio + QR)** | 1 |
| **20** | **NEW — audit trail view (/admin/audit)** | 1 |
| **21** | **NEW — delegation (host → guest)** | 2 |
| **22** | **NEW — revenue/monetization dashboard (labeled demo data)** | 2 |
| **23** | **NEW — LLM explanation stub (optional, off by default)** | 3 |

### Definition of Done (demo) — P0 dulu, jangan tenggelam

- **Demo end-to-end jalan PERSIS setelah:** Phase 0 (Task 1–8) → **Task 17** → Task 9/11 extension → **Task 18** → Task 13/14. Ini backlog **kritis**; keputusan GRANT/DENY + trace + verifikasi dokumen harus hidup sebelum nikmat.
- **Jika telat / macet di satu task: SKIP tanpa penyesalan** — Task 20 (audit), 22 (KpiCards), 21 (delegasi), 23 (LLM) berlabel opsional dan tidak mengganggu demo. Kembali hanya bila waktu sisa.
- Juri menilai **demo 16 langkah**, bukan jumlah task selesai. Ledger/audit endpoint tetap ada via `access_events` meski UI audit ditunda.

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
    expect(APP_NAME).toBe('TrustAccess');
  });
});
```

`src/lib/config.ts` (create now — it fails first):

```ts
export const APP_NAME = 'TrustAccess';
export const SESSION_COOKIE = 'vp_session';
export const JKT_OFFSET_MIN = 420;
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    // Many API tests share the same file DB (./data/test-trustaccess.db) via the
    // cached getDb() singleton — run test FILES sequentially so they never
    // rm/create the same path concurrently (parallelism is still on per-test).
    fileParallelism: false,
    sequence: { concurrent: false },
  },
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
  - `initDb(path?: string): DBSession` where `DBSession = { all<T>(sql,params?):T[], get<T>(sql,params?):T|undefined, run(sql,params?): { lastInsertRowid: number } }`; `getDb(): DBSession` — reads `process.env.DB_PATH ?? './data/trustaccess.db'`, initializes `data/` dir, executes `schema.sql` on first open, memoizes.
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
  areaScope?: string[];  // areas this pass grants access to (for Layer-A area-scope resolution)
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
  usedPassId?: string;   // id of the pass selected in Layer A (recorded to AccessEvent for audit/analytics)
  passChecks?: { passId: string; matched: boolean; note: string }[]; // per-pass Layer-A outcome
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

CREATE TABLE IF NOT EXISTS registerables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  kind TEXT NOT NULL CHECK (kind IN ('room','event','activity','membership','event/external')),
  name TEXT NOT NULL,
  venue TEXT,
  starts_at TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,   -- 0 = free (skip payment → next)
  quota INTEGER,
  credential_template TEXT NOT NULL,         -- e.g. EventTicket / AccessPass / MemberCredential
  checkin_rule_id INTEGER REFERENCES access_rules(id),
  reg_token TEXT NOT NULL UNIQUE,            -- QR payload token for /r/:token
  external_app_id INTEGER REFERENCES external_apps(id), -- set when created via external API
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS external_apps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,                        -- e.g. loket.com / tiket.com
  client_id TEXT NOT NULL UNIQUE,
  client_secret_hash TEXT NOT NULL,          -- hash of secret
  webhook_secret TEXT NOT NULL,              -- HMAC key for signed payment callbacks
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  registerable_id INTEGER NOT NULL REFERENCES registerables(id),
  holder_email TEXT NOT NULL,
  kyc_ref TEXT,                              -- e.id KYC reference
  credential_id TEXT UNIQUE,                 -- issued EventTicket/AccessPass/... in e.id wallet
  payment_id INTEGER REFERENCES payments(id),-- NULL when free (skipped)
  order_ref TEXT,                            -- external platform order id (B2B2C)
  external_app_id INTEGER REFERENCES external_apps(id), -- NULL for self-serve
  payment_status TEXT NOT NULL DEFAULT 'paid', -- 'awaiting_payment' | 'paid' (external flow)
  status TEXT NOT NULL DEFAULT 'confirmed',
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

export function initDb(dbPath = process.env.DB_PATH ?? './data/trustaccess.db'): DBSession {
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

### Task 2 Extension (new positioning): credentials, documents, policies, delegations

**Files:**
- Modify: `src/lib/types.ts`, `src/lib/db/schema.sql`, `src/lib/db/seed.ts`
- Test: `tests/db-extended.test.ts` (Create)

**Δ Positioning:** The "issued passes" ledger becomes the **ledger of signed verifiable documents/credentials**. Add document metadata on credentials, a `policies` domain library (ONE engine, many domains) and `delegations`. This extension is dropped into Task 2 so the whole data model exists before any business logic is written.

- [ ] **Step A: Extend `src/lib/types.ts`**

Extend the existing `CredentialData` interface (add the four optional signed-document fields):

```ts
export interface CredentialData {
  id: string;
  type: string;          // e.id document schema name, e.g. 'AccessPass', 'SafetyInduction'
  holder: string;        // holder email or DID
  validFrom: string;     // ISO UTC
  validUntil: string;    // ISO UTC
  claims: Record<string, unknown>;
  revoked: boolean;
  areaScope?: string[];  // areas this pass grants access to (for Layer-A area-scope resolution)
  // --- new positioning: signed digital document / credential metadata ---
  documentTitle?: string;   // e.g. 'Safety Induction Certificate'
  issuerLabel?: string;     // e.g. 'Example University'
  description?: string;     // course / document body text
  category?: string;        // 'certificate' | 'credential' | 'permit' | 'pass' | 'membership' | ...
}
```

Add the new types (append to the same file):

```ts
export type DomainId = 'campus' | 'office' | 'event' | 'parking' | 'residence' | 'industrial';

export interface DocumentTemplateRow {
  id: number;
  org_id: number;
  name: string;                 // matches CredentialData.type (e.id document schema name)
  category: string;             // 'certificate' | 'credential' | 'permit' | 'pass' | ...
  fields_json: string;
  issuer_label: string;         // issuer display name, e.g. 'Example University'
  default_valid_hours: number;
}

export interface Policy {
  id: number;
  domain: DomainId;
  name: string;                 // 'Laboratory Access'
  area: string;                 // 'Laboratorium'
  credential: string;           // main required credential type (Layer A)
  prerequisites: string[];      // other credential types required across the portfolio (Layer B)
  openMinute: number;           // org-local minutesOfDay
  closeMinute: number;          // org-local minutesOfDay
  description: string;          // human-readable policy summary, incl. action ('GRANT ACCESS ...')
}

export interface TraceItem { label: string; ok: boolean; detail?: string }
export interface DocumentVerificationTrace { valid: boolean; items: TraceItem[]; reasons: string[] }

export interface DelegationRow {
  id: number;
  org_id: number;
  host_email: string;
  guest_email: string;
  guest_name: string;
  area_scope: string;           // JSON array of area names
  valid_from: string;           // ISO UTC
  valid_until: string;          // ISO UTC
  status: string;               // 'active' | 'revoked'
  credential_id: string | null;
  created_at: string;
}
```

Extend `IssueInput` (the e.id adapter issuance carries signed-document metadata):

```ts
export interface IssueInput {
  templateName: string;
  holderEmail: string;
  claims: Record<string, unknown>;
  validFrom?: string;
  validUntil?: string;
  documentTitle?: string;   // signed-document caption (new)
  issuerLabel?: string;     // issuer display name (new)
  description?: string;     // document body text (new)
}
```

- [ ] **Step B: Extend `src/lib/db/schema.sql`**

Modify the `credential_templates` CREATE TABLE (add document-template columns):

```sql
CREATE TABLE IF NOT EXISTS credential_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'credential',
  fields_json TEXT NOT NULL DEFAULT '[]',
  issuer_label TEXT NOT NULL DEFAULT 'TrustAccess Issuer',
  default_valid_hours INTEGER NOT NULL DEFAULT 8760
);
```

Modify the `issued_passes` CREATE TABLE (add signed-document metadata):

```sql
CREATE TABLE IF NOT EXISTS issued_passes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  credential_id TEXT NOT NULL UNIQUE,
  holder_email TEXT NOT NULL,
  template_name TEXT NOT NULL,
  document_title TEXT,
  issuer_label TEXT,
  description TEXT,
  category TEXT DEFAULT 'credential',
  rule_id INTEGER REFERENCES access_rules(id),
  status TEXT NOT NULL DEFAULT 'active',
  source TEXT NOT NULL DEFAULT 'admin',     -- admin|self|delegated
  host_ref TEXT,
  valid_from TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

Add the `policies` table (multi-domain policy library — same engine, many permissions):

```sql
CREATE TABLE IF NOT EXISTS policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  domain TEXT NOT NULL DEFAULT 'campus',
  name TEXT NOT NULL,
  area TEXT NOT NULL,
  credential TEXT NOT NULL,
  prerequisites TEXT NOT NULL DEFAULT '[]',
  open_minute INTEGER NOT NULL DEFAULT 0,
  close_minute INTEGER NOT NULL DEFAULT 1440,
  description TEXT NOT NULL DEFAULT ''
);
```

Add the `delegations` table (host → guest):

```sql
CREATE TABLE IF NOT EXISTS delegations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  host_email TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  area_scope TEXT NOT NULL DEFAULT '[]',
  valid_from TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  credential_id TEXT,
  created_at TEXT NOT NULL
);
```

- [ ] **Step C: Extend `src/lib/db/seed.ts`** — add a policy library (6 domains), document templates, demo holder portfolio, and a delegation example as a NEW async export (the original sync `seedDemo` stays untouched).

```ts
import type { IssueInput, IssueOutput } from '../types';

// Contract for issuing via e.id (kept minimal at Task 2; real adapter wires in at Task 6).
export type IssueFn = (input: IssueInput) => Promise<IssueOutput>;

// TEMPLATE_META: template name -> (category, issuerLabel, default document title)
const TEMPLATE_META: Record<string, [string, string, string]> = {
  AccessPass:        ['pass', 'TrustAccess Issuer', 'Access Pass'],
  SafetyInduction:   ['certificate', 'Example University', 'Safety Induction Certificate'],
  StudentCredential: ['credential', 'Example University', 'Student Credential'],
  LaboratoryAccess:  ['pass', 'Example University', 'Laboratory Access'],
  ParkingPermit:     ['permit', 'Example University', 'Parking Permit'],
  EmployeeCredential:['credential', 'Acme Corp', 'Employee Credential'],
  SecurityClearance: ['credential', 'Acme Corp', 'Security Clearance'],
  EventTicket:       ['pass', 'Concert Co', 'Event Ticket'],
  VIPCredential:     ['credential', 'Concert Co', 'VIP Credential'],
  ResidentCredential:['credential', 'Green Residence', 'Resident Credential'],
  WorkerCredential:  ['credential', 'Steelworks Plant', 'Worker Credential'],
  SafetyTraining:    ['certificate', 'Steelworks Plant', 'Safety Training Certificate'],
  MachineCertification:['certificate', 'Steelworks Plant', 'Machine Certification'],
  VisitorPass:       ['pass', 'TrustAccess Issuer', 'Visitor Pass'],
};

export async function seedDemoPortfolio(
  db: DBSession,
  issue: IssueFn,
  orgId: number,
): Promise<{ issued: number; policies: number; delegations: number }> {
  let issued = 0;

  for (const [name, [category, issuer, title]] of Object.entries(TEMPLATE_META)) {
    db.run(
      'INSERT OR IGNORE INTO credential_templates (org_id, name, category, fields_json, issuer_label, default_valid_hours) VALUES (?,?,?,?,?,?)',
      [orgId, name, category, '[]', issuer, category === 'certificate' ? 8760 : 52560],
    );
  }

  const policies: Array<[string, string, string, string, string[], number, number, string]> = [
    // primary demo — campus
    ['campus', 'Pintu Utama Access', 'Ruang Umum', 'AccessPass', [], 420, 1260, 'GRANT ACCESS — campus main gate'],
    ['campus', 'Laboratory Access', 'Laboratorium', 'LaboratoryAccess', ['StudentCredential', 'SafetyInduction'], 420, 1080, 'GRANT ACCESS — require student + valid safety induction'],
    ['campus', 'Locker Access', 'Ruang Umum', 'AccessPass', [], 0, 1440, 'GRANT ACCESS — locker unlock'],
    // the same engine, other domains (config examples)
    ['office', 'Office Floor', 'Office', 'EmployeeCredential', ['SecurityClearance'], 420, 1260, 'GRANT ACCESS — office / server room'],
    ['event', 'VIP Area', 'Concert Hall', 'EventTicket', ['VIPCredential'], 720, 1380, 'GRANT ACCESS — VIP area'],
    ['parking', 'Parking Gate', 'Parkir', 'ParkingPermit', [], 0, 1440, 'GRANT ACCESS — parking gate'],
    ['residence', 'Building Access', 'Green Residence', 'ResidentCredential', [], 0, 1440, 'GRANT ACCESS — building / room'],
    ['industrial', 'Restricted Machine Area', 'Workshop', 'WorkerCredential', ['SafetyTraining', 'MachineCertification'], 0, 1440, 'GRANT ACCESS — restricted machine area'],
  ];
  for (const [domain, name, area, cred, prereqs, oMin, cMin, desc] of policies) {
    db.run(
      'INSERT OR IGNORE INTO policies (org_id, domain, name, area, credential, prerequisites, open_minute, close_minute, description) VALUES (?,?,?,?,?,?,?,?,?)',
      [orgId, domain, name, area, cred, JSON.stringify(prereqs), oMin, cMin, desc],
    );
  }

  // Demo holder portfolio — Panji Bawono: student + safety induction + lab access + parking.
  const portfolio: Array<{ type: string; holder: string; name: string; claims: Record<string, unknown>; validUntil: string; area: string[] }> = [
    { type: 'StudentCredential', holder: 'panji@kampus.demo', name: 'Panji Bawono', area: ['Ruang Umum', 'Laboratorium', 'Parkir'], claims: { studentId: 'NPM-2026-001' }, validUntil: '2027-12-31T00:00:00.000Z' },
    { type: 'SafetyInduction', holder: 'panji@kampus.demo', name: 'Panji Bawono', area: ['Laboratorium'], claims: { course: 'Laboratory Safety Induction' }, validUntil: '2027-08-29T00:00:00.000Z' },
    { type: 'LaboratoryAccess', holder: 'panji@kampus.demo', name: 'Panji Bawono', area: ['Laboratorium'], claims: {}, validUntil: '2027-08-29T00:00:00.000Z' },
    { type: 'ParkingPermit', holder: 'panji@kampus.demo', name: 'Panji Bawono', area: ['Parkir'], claims: { plate: 'H 1234 ABC' }, validUntil: '2027-08-29T00:00:00.000Z' },
  ];
  const now = new Date().toISOString();
  for (const p of portfolio) {
    const [category, issuer, title] = TEMPLATE_META[p.type];
    const validFrom = new Date().toISOString();
    const { credentialId } = await issue({
      templateName: p.type,
      holderEmail: p.holder,
      claims: { ...p.claims, fullName: p.name, area: JSON.stringify(p.area) },
      validFrom,
      validUntil: p.validUntil,
      documentTitle: title,
      issuerLabel: issuer,
    });
    db.run(
      'INSERT INTO issued_passes (org_id, credential_id, holder_email, template_name, document_title, issuer_label, description, category, status, source, valid_from, valid_until, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [orgId, credentialId, p.holder, p.type, title, issuer, p.claims.course ?? title, category, 'active', 'admin', validFrom, p.validUntil, now],
    );
    issued++;
  }

  // Delegation example — host Panji delegates Meeting Room A to guest Budi (14:00–17:00 local).
  const delFrom = new Date(Date.now() - 60 * 60_000).toISOString();
  const delUntil = new Date(Date.now() + 3 * 3_600_000).toISOString();
  const { credentialId: delCred } = await issue({
    templateName: 'VisitorPass',
    holderEmail: 'budi@kampus.demo',
    claims: { fullName: 'Budi Manahan', hostRef: 'panji@kampus.demo', area: JSON.stringify(['Meeting Room A']) },
    validFrom: delFrom,
    validUntil: delUntil,
    documentTitle: 'Visitor Pass',
    issuerLabel: 'TrustAccess Issuer',
  });
  db.run(
    'INSERT INTO delegations (org_id, host_email, guest_email, guest_name, area_scope, valid_from, valid_until, status, credential_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [orgId, 'panji@kampus.demo', 'budi@kampus.demo', 'Budi Manahan', JSON.stringify(['Meeting Room A']), delFrom, delUntil, 'active', delCred, now],
  );
  db.run(
    'INSERT INTO issued_passes (org_id, credential_id, holder_email, template_name, document_title, issuer_label, description, category, status, source, host_ref, valid_from, valid_until, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [orgId, delCred, 'budi@kampus.demo', 'VisitorPass', 'Visitor Pass', 'TrustAccess Issuer', 'Delegated by Panji Bawono', 'pass', 'active', 'delegated', 'panji@kampus.demo', delFrom, delUntil, now],
  );
  issued++;

  return {
    issued,
    policies: db.get<{ n: number }>('SELECT COUNT(*) AS n FROM policies WHERE org_id = ?', [orgId])?.n ?? 0,
    delegations: db.get<{ n: number }>('SELECT COUNT(*) AS n FROM delegations WHERE org_id = ?', [orgId])?.n ?? 0,
  };
}
```

- [ ] **Step D: Write the failing test `tests/db-extended.test.ts`** (uses a local `IssueFn` stub so Task 2 does not depend on the Task 6 e.id client):

```ts
import { beforeAll, describe, it, expect } from 'vitest';
import { initDb, type DBSession } from '../src/lib/db';
import { seedDemo, seedDemoPortfolio, type IssueFn } from '../src/lib/db/seed';
import type { IssueInput, IssueOutput } from '../src/lib/types';

let db: DBSession;
let orgId: number;
let seq = 0;

const fakeIssue: IssueFn = async (input: IssueInput): Promise<IssueOutput> => {
  seq++;
  const credentialId = `cred_seed_${seq}`;
  return { credentialId, qrPayload: JSON.stringify({ v: 1, credentialId }) };
};

beforeAll(async () => {
  db = initDb(':memory:');
  orgId = seedDemo(db).orgId;
  await seedDemoPortfolio(db, fakeIssue, orgId);
});

describe('credential/document/policy model', () => {
  it('seeds document templates with category + issuer label', () => {
    const row = db.get<any>('SELECT * FROM credential_templates WHERE name = ?', ['SafetyInduction']);
    expect(row?.category).toBe('certificate');
    expect(row?.issuer_label).toBe('Example University');
  });

  it('seeds policies across domains incl. lab prerequisites', () => {
    const n = db.get<{ n: number }>('SELECT COUNT(DISTINCT domain) AS n FROM policies WHERE org_id = ?', [orgId]);
    expect(n?.n).toBeGreaterThanOrEqual(6);
    const lab = db.get<any>('SELECT * FROM policies WHERE name = ?', ['Laboratory Access']);
    expect(JSON.parse(lab.prerequisites)).toEqual(['StudentCredential', 'SafetyInduction']);
  });

  it('issues the demo holder portfolio as signed documents with metadata', () => {
    const rows = db.all<any>('SELECT * FROM issued_passes WHERE holder_email = ?', ['panji@kampus.demo']);
    expect(rows).toHaveLength(4);
    const si = rows.find((r) => r.template_name === 'SafetyInduction');
    expect(si?.document_title).toBe('Safety Induction Certificate');
    expect(si?.issuer_label).toBe('Example University');
    expect(si?.status).toBe('active');
  });

  it('creates a delegation child credential for the guest', () => {
    const del = db.get<any>('SELECT * FROM delegations WHERE host_email = ?', ['panji@kampus.demo']);
    expect(del?.guest_name).toBe('Budi Manahan');
    const child = db.get<any>('SELECT * FROM issued_passes WHERE credential_id = ?', [del?.credential_id]);
    expect(child?.source).toBe('delegated');
    expect(child?.host_ref).toBe('panji@kampus.demo');
  });
});
```

- [ ] **Step E: Run tests to verify pass**

Run: `npm test`
Expected: db + db-extended tests pass (2 total before, now 3 files; smoke + db + db-extended).

- [ ] **Step F: Commit**

```bash
git add -A && git commit -m "feat(data): credential/document/policy/delegation model + portfolio seed"
```

---

### Task 3: Gating Engine (pure)

**Files:**
- Create: `src/lib/engine/gating.ts`
- Test: `tests/engine/gating.test.ts`

**Interfaces:**
- Consumes: `GateRule`, `GateDecision`, `VerificationResult`, `CredentialData` from `src/lib/types.ts`
- Produces: `resolveMainPass(passes, rule, nowMs): CredentialData | null`, `checkPrerequisites(passes, rule, nowMs): string[]`, and `evaluateGate(result: VerificationResult, rule: GateRule, localNow: Date): GateDecision` (wraps the two; sets `usedPassId` + `passChecks`)

- [ ] **Step 1: Write the failing test**

`tests/engine/gating.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { evaluateGate } from '../../src/lib/engine/gating';
import type { VerificationResult, GateRule } from '../../src/lib/types';

const GRANT_CREDS: VerificationResult = {
  ok: true,
  credentials: [
    { id: 'a', type: 'AccessPass', holder: 'x@d.id', validFrom: '2026-08-01T00:00:00Z', validUntil: '2026-09-01T00:00:00Z', claims: {}, revoked: false, areaScope: ['Laboratorium'] },
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
    const d = evaluateGate(GRANT_CREDS, RULE, now);
    expect(d.verdict).toBe('GRANT');
    expect(d.usedPassId).toBe('a');
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

  it('DENY when pass does not cover the gate area scope', () => {
    const wrongArea: VerificationResult = { ok: true, credentials: [
      { ...GRANT_CREDS.credentials[0], areaScope: ['Parkir'] },
      GRANT_CREDS.credentials[1],
    ] };
    const d = evaluateGate(wrongArea, RULE, new Date('2026-08-20T02:00:00Z'));
    expect(d.verdict).toBe('DENY');
    expect(d.reasons.join(' ')).toContain('area');
  });

  it('Layer A selects the most-specific / longest-valid pass among candidates', () => {
    const multi: VerificationResult = { ok: true, credentials: [
      { ...GRANT_CREDS.credentials[0], id: 'gen', areaScope: ['Umum'] },
      { ...GRANT_CREDS.credentials[0], id: 'spec', areaScope: ['Laboratorium'] },
      GRANT_CREDS.credentials[1],
    ] };
    expect(evaluateGate(multi, RULE, new Date('2026-08-20T02:00:00Z')).usedPassId).toBe('spec');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/engine/gating.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

`src/lib/engine/gating.ts`:

```ts
import type { CredentialData, GateDecision, GateRule, VerificationResult } from '../types';

function hhmm(min: number): string {
  const h = String(Math.floor(min / 60)).padStart(2, '0');
  const m = String(min % 60).padStart(2, '0');
  return `${h}:${m}`;
}

// Layer A — resolve the main pass that grants access to this gate's area.
// Gate is the fixed context (never a global "best pass"); candidates are
// filtered, then the most area-specific + longest-remaining pass is chosen.
export function resolveMainPass(passes: CredentialData[], rule: GateRule, nowMs: number): CredentialData | null {
  const candidates = passes.filter((c) => {
    if (c.type !== rule.requiredType || c.revoked) return false;
    if (nowMs < Date.parse(c.validFrom) || nowMs > Date.parse(c.validUntil)) return false;
    const scope = c.areaScope ?? [];
    const matchesArea = rule.areaScope.length === 0 || rule.areaScope.some((a) => scope.includes(a));
    return matchesArea;
  });
  if (candidates.length === 0) return null;
  return candidates.sort((x, y) => {
    const xSpec = rule.areaScope.filter((a) => (x.areaScope ?? []).includes(a)).length;
    const ySpec = rule.areaScope.filter((a) => (y.areaScope ?? []).includes(a)).length;
    if (xSpec !== ySpec) return ySpec - xSpec;
    // most-specific first; tie-break by longest-remaining validity
    return Date.parse(y.validUntil) - Date.parse(x.validUntil);
  })[0];
}

// Layer B — prerequisites (e.g. 'SafetyInduction') may come from any pass in
// the holder's full portfolio, not just the main pass.
export function checkPrerequisites(passes: CredentialData[], rule: GateRule, nowMs: number): string[] {
  return rule.prerequisites.filter((p) =>
    !passes.some((c) => c.type === p && !c.revoked
      && nowMs >= Date.parse(c.validFrom) && nowMs <= Date.parse(c.validUntil)));
}

export function evaluateGate(
  result: VerificationResult,
  rule: GateRule,
  localNow: Date,
): GateDecision {
  if (!result.ok || result.credentials.length === 0) {
    return { verdict: 'DENY', score: 0, reasons: ['Tidak ada credential yang dipresentasikan.'] };
  }

  const nowMs = localNow.getTime();
  const nowMin = localNow.getHours() * 60 + localNow.getMinutes();
  const main = resolveMainPass(result.credentials, rule, nowMs);

  const passChecks = result.credentials.map((c) => ({
    passId: c.id,
    matched: c === main,
    note: c === main ? 'Dipilih sebagai pass utama' : c.type === rule.requiredType ? 'Kandidat tapi tidak terpilih' : 'Tidak relevan',
  }));

  const reasons: string[] = [];

  if (!main) {
    reasons.push(`Tidak ada pass aktif yang mencakup area ini (butuh '${rule.requiredType}').`);
    const areaMismatch = result.credentials.some(
      (c) => c.type === rule.requiredType && !c.revoked
        && nowMs >= Date.parse(c.validFrom) && nowMs <= Date.parse(c.validUntil)
        && !(rule.areaScope.some((a) => (c.areaScope ?? []).includes(a))),
    );
    if (areaMismatch) reasons.push(`Pass ada tapi tidak mencakup area ${rule.areaScope.join(' / ')}.`);
    const expired = result.credentials.some((c) => c.type === rule.requiredType && nowMs > Date.parse(c.validUntil));
    if (expired) reasons.push('Pass sudah kadaluarsa.');
    return { verdict: 'DENY', score: 0, reasons, passChecks };
  }

  if (nowMin < rule.openMinute || nowMin > rule.closeMinute) {
    reasons.push(`Di luar jam operasional (${hhmm(rule.openMinute)}–${hhmm(rule.closeMinute)}).`);
  }
  if (nowMs < Date.parse(main.validFrom)) reasons.push('Credential belum berlaku.');
  if (nowMs > Date.parse(main.validUntil)) reasons.push('Credential sudah kadaluarsa.');

  const missing = checkPrerequisites(result.credentials, rule, nowMs);
  if (missing.length > 0) reasons.push(`Prasyarat belum terpenuhi: ${missing.join(', ')}.`);

  if (reasons.length > 0) {
    return { verdict: 'DENY', score: Math.max(0, 100 - reasons.length * 25), reasons, usedPassId: main.id, passChecks };
  }
  return { verdict: 'GRANT', score: 100, reasons: ['Semua syarat terpenuhi.'], usedPassId: main.id, passChecks };
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

// Normalize a `claims.area` value (string or JSON array) into CredentialData.areaScope.
function toAreaScope(area: unknown): string[] | undefined {
  if (typeof area === 'string' && area) {
    try {
      const parsed = JSON.parse(area);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch { /* not a JSON array */ }
    return [area];
  }
  return Array.isArray(area) ? area.map(String) : undefined;
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
      areaScope: toAreaScope(input.claims.area),
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

### Task 6 Extension (new positioning): signed-document metadata + portfolio capability

**Files:**
- Modify: `src/lib/types.ts` (EidClient), `src/lib/eid/client.ts`, `scripts/seed.ts`, `tests/eid/client.test.ts`

**Δ Positioning:** Issuance via e.id carries signed-document metadata, and the adapter exposes the **Holder API** capability `listCredentialsForHolder` so the engine can evaluate a holder's *complete portfolio*, not a single QR. Executes with Phase 0/1 boundary (right after Task 6; used by Task 11).

- [ ] **Step A: Extend `FakeEidClient.issueCredential`** to persist document metadata on the stored credential (replace the method body in `src/lib/eid/client.ts`):

```ts
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
      areaScope: toAreaScope(input.claims.area),
      documentTitle: input.documentTitle,
      issuerLabel: input.issuerLabel,
      description: input.description,
    };
    this.store.set(credentialId, issued);
    const qrPayload = JSON.stringify({ v: 1, credentialId });
    return { credentialId, qrPayload };
  }
```

- [ ] **Step B: Add `listCredentialsForHolder` to the adapter contract**

In `src/lib/types.ts`, extend `EidClient` (the interface defined in Task 2):

```ts
export interface EidClient {
  exchangeCode(code: string): Promise<{ profile: EidProfile }>;
  issueCredential(input: IssueInput): Promise<IssueOutput>;
  revokeCredential(credentialId: string): Promise<{ ok: boolean }>;
  verifyPresentation(payload: string): Promise<VerificationResult>;
  startKyc(holderEmail: string): Promise<{ kycId: string }>;
  listCredentialsForHolder(holderEmail: string): Promise<CredentialData[]>;   // NEW — full portfolio
}
```

In `src/lib/eid/client.ts`, add to `FakeEidClient`:

```ts
  async listCredentialsForHolder(holderEmail: string): Promise<CredentialData[]> {
    return [...this.store.values()].filter((c) => c.holder === holderEmail);
  }
```

- [ ] **Step C: Add client tests for document metadata + portfolio**

Append to `tests/eid/client.test.ts`:

```ts
  it('issueCredential persists signed-document metadata', async () => {
    globalThis.process.env.EID_FAKE = '1';
    const issued = await client.issueCredential({
      templateName: 'SafetyInduction',
      holderEmail: 'panji@kampus.demo',
      claims: { fullName: 'Panji Bawono', course: 'Laboratory Safety Induction' },
      documentTitle: 'Safety Induction Certificate',
      issuerLabel: 'Example University',
      validUntil: '2027-08-29T00:00:00Z',
    });
    const res = await client.verifyPresentation(issued.qrPayload);
    const c = res.credentials[0];
    expect(c.documentTitle).toBe('Safety Induction Certificate');
    expect(c.issuerLabel).toBe('Example University');
    expect(c.areaScope).toBeUndefined();
  });

  it('lists the full credential portfolio for a holder', async () => {
    globalThis.process.env.EID_FAKE = '1';
    await client.issueCredential({ templateName: 'StudentCredential', holderEmail: 'panji@kampus.demo', claims: {}, validUntil: '2027-12-31T00:00:00Z' });
    await client.issueCredential({ templateName: 'SafetyInduction', holderEmail: 'panji@kampus.demo', claims: {}, validUntil: '2027-08-29T00:00:00Z' });
    const all = await client.listCredentialsForHolder('panji@kampus.demo');
    expect(all.map((c) => c.type)).toEqual(expect.arrayContaining(['StudentCredential', 'SafetyInduction']));
  });
```

- [ ] **Step D: Wire the portfolio seed into `scripts/seed.ts`** (replace the file):

```ts
import { initDb } from '../src/lib/db';
import { seedDemo, seedDemoPortfolio } from '../src/lib/db/seed';
import { createClient } from '../src/lib/eid/client';

async function main() {
  const db = initDb();
  const { orgId, counts } = seedDemo(db, createClient());
  const extra = await seedDemoPortfolio(db, createClient(), orgId);
  console.log({ orgId, counts, extra });
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
```

- [ ] **Step E: Re-run seeds and tests**

Run: `npm run seed` then `npm test`
Expected: seed prints `{ orgId, counts, extra }` with `extra.issued >= 5`, `extra.policies >= 8`, `extra.delegations >= 1`; all tests pass.

- [ ] **Step F: Commit**

```bash
git add -A && git commit -m "feat(eid): signed-document metadata + portfolio capabilities"
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

### Task 9 Extension (new positioning): generalized credential/document issuance API

**Files:**
- Modify: `src/lib/db/passes.ts` (extend `IssuedPassRow` + `insertIssuedPass`)
- Create: `src/app/api/admin/credentials/route.ts`, `src/app/api/admin/credentials/revoke/route.ts`, `src/app/api/admin/credentials/templates/route.ts`
- Test: `tests/api-credentials.test.ts` (Create)

**Δ Positioning:** The admin issues **any signed document/credential** (Certificates, Safety Induction, Student/Employee Credential, Parking Permit, Access Pass) through e.id — not only an `AccessPass`. The Task 9 `/api/admin/passes` route remains working (back-compat); the new `/api/admin/credentials/*` routes are the product surface for the issuance demo.

- [ ] **Step A: Extend `src/lib/db/passes.ts`** — add document metadata to the row type, keep old callers working via tolerant defaults:

> ⚠️ **REPLACES the Step 3 `passes.ts` further above** — this Step A file is the final version (adds `document_title`/`issuer_label`/`description`/`category`/`source`/`host_ref`). Copy **this** Step A block; ignore the Step 3 block to avoid a stale `insertIssuedPass` superset.

```ts
import type { DBSession } from '../db';
import type { PassStatus } from '../types';

export interface IssuedPassRow {
  id: number;
  org_id: number;
  credential_id: string;
  holder_email: string;
  template_name: string;
  document_title: string | null;
  issuer_label: string | null;
  description: string | null;
  category: string | null;
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
  const r = {
    document_title: null,
    issuer_label: null,
    description: null,
    category: 'credential',
    host_ref: null,
    ...row,
  };
  return db.run(
    `INSERT INTO issued_passes (org_id, credential_id, holder_email, template_name, document_title, issuer_label, description, category, rule_id, status, source, host_ref, valid_from, valid_until, created_at)
     VALUES (@org_id, @credential_id, @holder_email, @template_name, @document_title, @issuer_label, @description, @category, @rule_id, @status, @source, @host_ref, @valid_from, @valid_until, @created_at)`,
    [
      r.org_id, r.credential_id, r.holder_email, r.template_name, r.document_title, r.issuer_label, r.description,
      r.category, r.rule_id, r.status, r.source, r.host_ref, r.valid_from, r.valid_until, new Date().toISOString(),
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

- [ ] **Step B: Write the failing test `tests/api-credentials.test.ts`**

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import { initDb } from '../src/lib/db';
import { seedDemo, seedDemoPortfolio } from '../src/lib/db/seed';
import { createClient, __resetFake } from '../src/lib/eid/client';
import { createSession } from '../src/lib/session';
import { POST } from '../src/app/api/admin/credentials/route';
import { POST as revokePost } from '../src/app/api/admin/credentials/revoke/route';
import { GET as templatesGet } from '../src/app/api/admin/credentials/templates/route';
import type { EidClient } from '../src/lib/types';

let token: string;
let eid: EidClient;

const TEST_DB = './data/test-trustaccess.db';
beforeAll(async () => {
  process.env.DB_PATH = TEST_DB;
  if (fs.existsSync(TEST_DB)) fs.rmSync(TEST_DB);
  const db = initDb();          // caches the temp file db; routes' getDb() sees it
  seedDemo(db);
  __resetFake();
  eid = createClient();
  await seedDemoPortfolio(db, eid, 1);   // seeds credential_templates (labels) + portfolio
  token = await createSession({ subject: 'did:eid:demo-admin', name: 'Demo Admin', email: 'admin@kampus.demo', role: 'admin' });
});

describe('admin credentials api', () => {
  it('lists document templates', async () => {
    const res = await templatesGet(new Request('http://localhost/api/admin/credentials/templates'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.some((t: { name: string }) => t.name === 'SafetyInduction')).toBe(true);
  });

  it('issues a Safety Induction certificate with document metadata', async () => {
    const res = await POST(new Request('http://localhost/api/admin/credentials', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `vp_session=${token}` },
      body: JSON.stringify({
        holderEmail: 'rani@kampus.demo', templateName: 'SafetyInduction',
        claims: { fullName: 'Rani', course: 'Laboratory Safety Induction' },
        documentTitle: 'Safety Induction Certificate', issuerLabel: 'Example University',
        validHours: 8760,
      }),
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.qrPayload).toContain(body.credential.credentialId);
    const cred = (await eid.verifyPresentation(body.qrPayload)).credentials[0];
    expect(cred.documentTitle).toBe('Safety Induction Certificate');
    expect(cred.issuerLabel).toBe('Example University');
  });

  it('rejects unauthenticated request', async () => {
    const res = await POST(new Request('http://localhost/api/admin/credentials', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ holderEmail: 'x@demo.id', templateName: 'AccessPass' }),
    }));
    expect(res.status).toBe(401);
  });

  it('revokes a credential (e.id store + DB mirror)', async () => {
    const res = await POST(new Request('http://localhost/api/admin/credentials', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `vp_session=${token}` },
      body: JSON.stringify({ holderEmail: 'x@demo.id', templateName: 'AccessPass' }),
    }));
    const issued = (await res.json()) as { credential: { credentialId: string } };
    const rev = await revokePost(new Request('http://localhost/api/admin/credentials/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: `vp_session=${token}` },
      body: JSON.stringify({ credentialId: issued.credential.credentialId }),
    }));
    expect(rev.status).toBe(200);
    const cred = (await eid.verifyPresentation(JSON.stringify({ v: 1, credentialId: issued.credential.credentialId }))).credentials[0];
    expect(cred.revoked).toBe(true);
  });
});
```

- [ ] **Step C: Write the routes**

`src/app/api/admin/credentials/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { insertIssuedPass } from '@/lib/db/passes';
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
    holderEmail?: string; templateName?: string;
    claims?: Record<string, unknown>; area?: string | string[];
    documentTitle?: string; issuerLabel?: string; description?: string;
    validHours?: number; orgId?: number;
  };
  if (!body.holderEmail || !body.templateName) {
    return NextResponse.json({ error: 'holderEmail dan templateName wajib' }, { status: 400 });
  }

  const db = getDb();
  const orgId = body.orgId ?? 1;
  const tpl = db.get<any>('SELECT * FROM credential_templates WHERE name = ?', [body.templateName]);
  const validFromIso = new Date().toISOString();
  const validUntilIso = addHoursISO(validFromIso, body.validHours ?? tpl?.default_valid_hours ?? 24);
  const area = body.area ?? (body.templateName === 'AccessPass' ? 'Ruang Umum' : undefined);

  const { credentialId, qrPayload } = await createClient().issueCredential({
    templateName: body.templateName,
    holderEmail: body.holderEmail,
    claims: {
      ...(body.claims ?? {}),
      fullName: body.claims?.fullName ?? body.holderEmail,
      ...(area ? { area: JSON.stringify(area) } : {}),
    },
    validFrom: validFromIso,
    validUntil: validUntilIso,
    documentTitle: body.documentTitle ?? body.templateName,
    issuerLabel: body.issuerLabel ?? tpl?.issuer_label,
    description: body.description,
  });

  insertIssuedPass(db, {
    org_id: orgId,
    credential_id: credentialId,
    holder_email: body.holderEmail,
    template_name: body.templateName,
    document_title: body.documentTitle ?? body.templateName,
    issuer_label: body.issuerLabel ?? tpl?.issuer_label,
    description: body.description ?? null,
    category: tpl?.category ?? 'credential',
    rule_id: null,
    status: 'active',
    source: 'admin',
    host_ref: null,
    valid_from: validFromIso,
    valid_until: validUntilIso,
  });

  return NextResponse.json({
    passId: credentialId,
    qrPayload,
    holderEmail: body.holderEmail,
    credential: { credentialId, documentTitle: body.documentTitle ?? body.templateName, issuerLabel: body.issuerLabel ?? tpl?.issuer_label },
  }, { status: 201 });
}
```

`src/app/api/admin/credentials/revoke/route.ts`:

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

  const body = (await req.json()) as { credentialId?: string };
  if (!body.credentialId) return NextResponse.json({ error: 'credentialId wajib' }, { status: 400 });

  const db = getDb();
  const row = getIssuedPassByCredential(db, body.credentialId);
  if (!row) return NextResponse.json({ error: 'credential tidak ditemukan' }, { status: 404 });

  const eid = createClient();
  await eid.revokeCredential(body.credentialId);
  updatePassStatus(db, row.id, 'revoked');
  return NextResponse.json({ ok: true });
}
```

`src/app/api/admin/credentials/templates/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  return NextResponse.json(
    getDb().all<any>('SELECT id, name, category, issuer_label, default_valid_hours FROM credential_templates ORDER BY id'),
  );
}
```

- [ ] **Step D: Run tests to verify pass**

Run: `npm test`
Expected: api-credentials tests pass; `.gitignore` already ignores `data/`? Add `data/` to `.gitignore` if not present.

- [ ] **Step E: Commit**

```bash
git add -A && git commit -m "feat(admin): issue/revoke signed credentials & documents via e.id"
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

**Registerable extension (spec §18) — same engine, reused:** the tasks above are the generic self-registration core. Additive wiring (can be a follow-up task after this one): (`a`) `POST /api/admin/registerables` creates a `registerables` row + unique `reg_token` → serve QR at `/r/:token` & `GET /api/r/:token`; (`b`) `registerables.price_cents == 0` → the `/api/register` flow **skips payment insert** (goes straight to issue) — i.e. honour the free branch; (`c`) `POST /api/admin/access-points/claim { token }` mounts a physically-scanned access point (`{ v:1, accessPointId }`) into the org; (`d`) issue uses `registerables.credential_template` (e.g. `EventTicket`) and writes a `registrations` row linking `registerable_id`, `credential_id`, `payment_id` (nullable when free); (`e`) check-in screen `GET /api/verify/registerable` reuses the gate verifier over the wallet. `registerables` / `registrations` tables are already in the schema.

**Registering by scanning inside the e.id Identity Wallet (spec §18, Varian 1):** the QR served at `/r/:token` is a **universal/deep link** (`https://trustaccess.id/r/:token`), not plain text. Scanning it (camera or the e.id Identity Wallet) opens the TrustAccess sign-up page; because the wallet is already authenticated, **e.id OAuth/SSO + KYC** identifies the person with no re-form, then issue lands the credential in the e.id Identity Wallet. No access to internal wallet APIs is required for this variant (verified presentation read directly by the wallet stays a roadmap). Ensure the sign-up route reads the wallet's authenticated e.id session.

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

    const ver = await createClient().verifyPresentation(body.qrPayload);
    expect(ver.ok).toBe(true);
    expect(ver.credentials[0].areaScope).toEqual(['Ruang Umum']);
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
    claims: { fullName: body.fullName, area: tariff.area_scope, validFrom: validFromIso, validUntil: validUntilIso },
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

  const mainCredId = decision.usedPassId ?? result.credentials[0]?.id;
  const pass = mainCredId ? getIssuedPassByCredential(db, mainCredId) : undefined;

  db.run(
    'INSERT INTO access_events (org_id, pass_id, access_point_id, verdict, reasons, credential_id, action, actuator_detail, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
    [org.id, pass?.credential_id ?? mainCredId ?? null, body.accessPointId, decision.verdict, JSON.stringify(decision.reasons), mainCredId ?? null, action, act.detail, new Date().toISOString()],
  );

  const logs = recentAccessLogs(db, org.id, mainCredId ?? '');
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

### Task 11 Extension (new positioning): verify the FULL portfolio + verification trace

**Files:**
- Modify: `src/app/api/verify/route.ts` (replace file), `tests/api-verify.test.ts` (replace file)

**Dependencies:** Task 17 (`buildGateTrace`) and Task 6 (`listCredentialsForHolder`) — execute Task 17 first (Phase 1 starts with Task 17). Also reflects the Task 2 seed change: **Pintu Lab rule now requires `LaboratoryAccess` + `StudentCredential` + `SafetyInduction`**.

**Δ Positioning:** The QR carries the *holder identity* (not a single pass). The route pulls the holder's **complete credential portfolio** and evaluates it against the gate rule — cross-credential prerequisites from different documents can satisfy a policy together. The response gains a `trace` (WHY GRANT/DENY, first-class), `holder`, and `policyName`.

- [ ] **Step A: Replace `src/app/api/verify/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getOrgForAccessPoint, getRuleForAccessPoint, getAccessPoint, listAccessPointsByOrg, recentAccessLogs } from '@/lib/db/access';
import { getIssuedPassByCredential } from '@/lib/db/passes';
import { createClient } from '@/lib/eid/client';
import { evaluateGate } from '@/lib/engine/gating';
import { detectAnomaly } from '@/lib/engine/anomaly';
import { buildGateTrace } from '@/lib/policy/trace';
import { getActuator } from '@/lib/actuator';
import { toOrgLocal } from '@/lib/time';
import type { VerificationResult } from '@/lib/types';

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

  const presented = await eid.verifyPresentation(body.qrPayload);
  const holder = presented.credentials[0]?.holder;

  // NEW POSITIONING — evaluate the HOLDER'S COMPLETE CREDENTIAL PORTFOLIO:
  // the QR identifies the holder; the system pulls every credential they hold
  // (prerequisites may come from a different document than the access pass).
  const portfolio = holder ? await eid.listCredentialsForHolder(holder) : [];
  const result: VerificationResult = {
    ok: presented.ok,
    credentials: portfolio.length > 0 ? portfolio : presented.credentials,
  };

  const rule = getRuleForAccessPoint(db, body.accessPointId);
  const point = getAccessPoint(db, body.accessPointId);
  if (!rule || !point) {
    return NextResponse.json({ error: 'akses point / rule tidak ditemukan' }, { status: 404 });
  }

  const org = getOrgForAccessPoint(db, body.accessPointId) ?? { id: 1, name: 'UPN Kampus', tz_offset_min: 420, currency: 'IDR' };
  const localNow = toOrgLocal(new Date(), org.tz_offset_min);
  const decision = evaluateGate(result, rule, localNow);
  const trace = buildGateTrace(result, rule, decision, localNow);
  const actuator = getActuator();
  const action = point.kind === 'locker' ? 'open_locker' : decision.verdict === 'GRANT' ? 'open_gate' : 'check';
  const act = decision.verdict === 'GRANT' ? await actuator.execute(action, point.name) : { ok: false, detail: 'DENY' };

  const mainCredId = decision.usedPassId ?? result.credentials[0]?.id;
  const pass = mainCredId ? getIssuedPassByCredential(db, mainCredId) : undefined;

  db.run(
    'INSERT INTO access_events (org_id, pass_id, access_point_id, verdict, reasons, credential_id, action, actuator_detail, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
    [org.id, pass?.credential_id ?? mainCredId ?? null, body.accessPointId, decision.verdict, JSON.stringify(decision.reasons), mainCredId ?? null, action, act.detail, new Date().toISOString()],
  );

  const logs = recentAccessLogs(db, org.id, mainCredId ?? '');
  const alerts = detectAnomaly(logs);
  for (const alert of alerts) {
    db.run(
      'INSERT INTO anomaly_alerts (org_id, pass_id, severity, reasons, created_at) VALUES (?,?,?,?,?)',
      [org.id, alert.passId, alert.severity, JSON.stringify(alert.reasons), new Date().toISOString()],
    );
  }

  return NextResponse.json({
    decision,
    trace,                                                                  // NEW — WHY GRANT/DENY
    policyName: rule.requiredType,                                          // NEW — policy label for UI
    actuator: act,
    pass: pass ? { holderEmail: pass.holder_email, status: pass.status } : null,
    holder,                                                                 // NEW — holder identity
  });
}
```

- [ ] **Step B: Replace `tests/api-verify.test.ts`** — portfolio-driven, covers CASE A/B/C and cross-credential GRANT. (Note: the lab gate hours are 07:00–18:00 JKT; the route evaluates the REAL clock, so GRANT-at-lab assertions DENY at night. **Reliable fix:** in the test's `beforeAll`, re-seed the lab rule to `open_minute = 0, close_minute = 1440` (e.g. `UPDATE access_rules SET open_minute=0, close_minute=1440 WHERE name='Pintu Lab'`) — do NOT widen the policy-library copy; keep 07:00–18:00 there for the demo trace.)

```ts
import fs from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';
import { initDb } from '../src/lib/db';
import { seedDemo, seedDemoPortfolio } from '../src/lib/db/seed';
import { listAccessPointsByOrg } from '../src/lib/db/access';
import { createClient, __resetFake } from '../src/lib/eid/client';
import { POST, GET as listGet } from '../src/app/api/verify/route';

describe('verify api', () => {
  let db: ReturnType<typeof initDb>;
  let orgId: number;
  let mainGateId: number;
  let labGateId: number;
  let lockerId: number;

  // NOTE: use a temp FILE db (NOT ':memory:') — routes call getDb() which
  // only memoizes non-':memory:' sessions; a fresh ':memory:' per getDb()
  // call would yield an empty DB and 404 every verify.
  const TEST_DB = './data/test-trustaccess.db';

  beforeAll(async () => {
    process.env.DB_PATH = TEST_DB;
    if (fs.existsSync(TEST_DB)) fs.rmSync(TEST_DB);
    __resetFake();
    db = initDb(TEST_DB);
    const eid = createClient();
    const seeded = seedDemo(db, eid);
    orgId = seeded.orgId;
    await seedDemoPortfolio(db, eid, orgId);   // panji portfolio + budi visitor pass
    const points = listAccessPointsByOrg(db, orgId);
    mainGateId = points.find((p) => p.name === 'Pintu Utama')!.id;
    labGateId = points.find((p) => p.name === 'Pintu Lab')!.id;
    lockerId = points.find((p) => p.name === 'Loker A-12')!.id;
  });

  it('GRANT at main gate for a valid access pass', async () => {
    const eid = createClient();
    const issued = await eid.issueCredential({
      templateName: 'AccessPass', holderEmail: 'tamu@demo.id',
      claims: { fullName: 'Tamu', area: JSON.stringify(['Ruang Umum']) }, validUntil: '2026-12-31T00:00:00Z',
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

  it('DENY at lab gate when prerequisites are missing (none held)', async () => {
    const eid = createClient();
    const issued = await eid.issueCredential({
      templateName: 'LaboratoryAccess', holderEmail: 'andi@kampus.demo',
      claims: { fullName: 'Andi', area: JSON.stringify(['Laboratorium']) }, validUntil: '2026-12-31T00:00:00Z',
    });
    const res = await POST(new Request('http://localhost/api/verify', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accessPointId: labGateId, qrPayload: issued.qrPayload }),
    }));
    const body = await res.json();
    expect(body.decision.verdict).toBe('DENY');
    expect(body.decision.reasons.join(' ')).toContain('SafetyInduction');
    expect(body.actuator.ok).toBe(false);
    expect(Array.isArray(body.trace)).toBe(true);
  });

  it('GRANT at lab gate when the FULL portfolio satisfies prerequisites (cross-credential, CASE A)', async () => {
    const eid = createClient();
    const lab = (await eid.listCredentialsForHolder('panji@kampus.demo')).find((c) => c.type === 'LaboratoryAccess');
    const res = await POST(new Request('http://localhost/api/verify', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accessPointId: labGateId, qrPayload: JSON.stringify({ v: 1, credentialId: lab!.id }) }),
    }));
    const body = await res.json();
    expect(body.decision.verdict).toBe('GRANT');
    expect(body.decision.usedPassId).toBe(lab!.id);
  });

  it('DENY at lab gate when Safety Induction is EXPIRED (CASE B: explain why)', async () => {
    const eid = createClient();
    const all = await eid.listCredentialsForHolder('panji@kampus.demo');
    const orig = all.find((c) => c.type === 'SafetyInduction');
    if (orig) await eid.revokeCredential(orig.id);   // remove the valid one
    const expired = await eid.issueCredential({
      templateName: 'SafetyInduction', holderEmail: 'panji@kampus.demo',
      claims: { fullName: 'Panji Bawono' }, validFrom: '2025-01-01T00:00:00Z', validUntil: '2026-01-01T00:00:00Z',
    });
    const res = await POST(new Request('http://localhost/api/verify', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accessPointId: labGateId, qrPayload: expired.qrPayload }),
    }));
    const body = await res.json();
    expect(body.decision.verdict).toBe('DENY');
    expect(body.decision.reasons.join(' ')).toContain('SafetyInduction');
    expect(body.trace.some((t: { label: string }) => t.label.includes('SafetyInduction'))).toBe(true);
  });

  it('DENY when a revoked credential is used (CASE C)', async () => {
    const eid = createClient();
    const issued = await eid.issueCredential({
      templateName: 'AccessPass', holderEmail: 'rev@demo.id',
      claims: { fullName: 'Rev', area: JSON.stringify(['Ruang Umum']) }, validUntil: '2026-12-31T00:00:00Z',
    });
    await eid.revokeCredential(issued.credentialId);
    const res = await POST(new Request('http://localhost/api/verify', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accessPointId: mainGateId, qrPayload: issued.qrPayload }),
    }));
    const body = await res.json();
    expect(body.decision.verdict).toBe('DENY');
  });

  it('opens locker when GRANT', async () => {
    const eid = createClient();
    const issued = await eid.issueCredential({
      templateName: 'AccessPass', holderEmail: 'lock@demo.id',
      claims: { fullName: 'Lock', area: JSON.stringify(['Ruang Umum']) }, validUntil: '2026-12-31T00:00:00Z',
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

- [ ] **Step C: Update `scripts/seed.ts`** to also seed the fail-documents for the document-verification demo (Task 18):

```ts
import { initDb } from '../src/lib/db';
import { seedDemo, seedDemoPortfolio, seedDemoFailDocuments } from '../src/lib/db/seed';
import { createClient } from '../src/lib/eid/client';

async function main() {
  const db = initDb();
  const eid = createClient();
  const { orgId, counts } = seedDemo(db, eid);
  const extra = await seedDemoPortfolio(db, eid, orgId);
  const fails = await seedDemoFailDocuments(db, eid, orgId);
  console.log({ orgId, counts, extra, fails });
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
```

(i.e., defer `seedDemoFailDocuments` until you reach Task 18; until then `scripts/seed.ts` is the Task 6 version.)

- [ ] **Step D: Run tests to verify pass**

Run: `npm test`
Expected: verify API tests pass with portfolio + trace assertions; all earlier suites still green.

- [ ] **Step E: Commit**

```bash
git add -A && git commit -m "feat(verify): evaluate full credential portfolio + why-grant/deny trace"
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

### Task 13 Extension (new positioning): repositioned home copy + holder document metadata

**Files:**
- Modify: `src/app/page.tsx` (landing copy), `src/app/holder/[passId]/page.tsx` (document view), smoke steps

**Δ Positioning:** TrustAccess is *trust infrastructure* — signed verifiable documents (via e.id) that double as access prerequisites; the QR carries the *holder's identity*. The landing page must say this, and the single-pass screen must present the *signed document* (title, issuer, body) first, below which the QR still works.

- [ ] **Step A: Replace the landing page copy** (`src/app/page.tsx`):

```tsx
import Link from 'next/link';
import { APP_NAME } from '@/lib/config';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-6 text-center text-slate-100">
      <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">Trusted Credentials & Access Infrastructure — powered by e.id</span>
      <h1 className="text-4xl font-bold max-w-2xl">{APP_NAME} — verifikasi kredensial & dokumen digital tepercaya</h1>
      <p className="max-w-xl text-slate-400">
        Dokumen & kredensial ditandatangani penerbit lewat e.id; engine kebijakan kami mengubah seluruh
        portofolio holder menjadi keputusan GRANT/DENY yang bisa dijelaskan untuk gerbang, loker, hingga ruangan.
      </p>
      <Link href="/api/auth/eid/start" className="rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-slate-950 hover:bg-emerald-400">
        Login dengan e.id
      </Link>
      <div className="flex flex-wrap justify-center gap-4 text-sm">
        <Link href="/verify/document" className="text-emerald-300 underline">Verifikasi dokumen digital</Link>
        <Link href="/holder" className="text-emerald-300 underline">My Credentials (holder)</Link>
        <Link href="/register" className="text-emerald-300 underline">Daftar sebagai tamu</Link>
        <Link href="/admin/dashboard" className="text-emerald-300 underline">Dashboard admin</Link>
      </div>
    </main>
  );
}
```

- [ ] **Step B: Holder pass detail screen presents the signed document** (`src/app/holder/[passId]/page.tsx`) — document metadata first, QR below, plus a link to the full portfolio:

```tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';
import { getDb } from '@/lib/db';
import { getIssuedPassByCredential } from '@/lib/db/passes';

export const dynamic = 'force-dynamic';
const fmt = (iso: string) => new Date(iso).toLocaleDateString('id-ID');

export default async function HolderPage({ params }: { params: Promise<{ passId: string }> }) {
  const { passId } = await params;
  const db = getDb();
  const pass = getIssuedPassByCredential(db, passId);
  if (!pass) notFound();

  const qrPayload = JSON.stringify({ v: 1, credentialId: pass.credential_id });
  const qr = await QRCode.toDataURL(qrPayload);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-slate-100">
      <h1 className="text-2xl font-semibold">{pass.document_title ?? pass.template_name}</h1>
      <p className="text-slate-400">{pass.holder_email}</p>
      {pass.issuer_label && <p className="text-sm text-slate-500">Diterbitkan oleh: {pass.issuer_label}</p>}
      {pass.description && <p className="max-w-sm text-center text-sm text-slate-300">{pass.description}</p>}
      <img src={qr} alt="QR credential" className="h-56 w-56 rounded-lg bg-white p-2" />
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt>Jenis</dt><dd>{pass.template_name}</dd>
        <dt>Kategori</dt><dd>{pass.category ?? '—'}</dd>
        <dt>Status</dt><dd className={pass.status === 'active' ? 'text-emerald-400' : 'text-rose-400'}>{pass.status}</dd>
        <dt>Berlaku</dt><dd>{fmt(pass.valid_from)} — {fmt(pass.valid_until)}</dd>
      </dl>
      <div className="flex gap-4 text-sm">
        <Link href="/holder" className="text-emerald-300 underline">Semua kredensial (My Credentials)</Link>
        <a href={`/gate/1`} className="text-emerald-300 underline">Coba di gate</a>
      </div>
    </main>
  );
}
```

- [ ] **Step C: Extend smoke test (Step 6)** — after the existing curls, add:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/verify/document   # → 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/holder           # → 200
```

- [ ] **Step D: Commit**

```bash
git add -A && git commit -m "feat(ui): repositioned landing + signed-document holder view"
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

### Task 15 Extension (new positioning): dashboard business value + policy library + audit nav

**Execution order:** Phase 1 (after Tasks 17–19). The `KpiCards` component ships in Task 22 — adopt it here ONLY when Task 22 has landed (execution-order note in Task 22); until then the dashboard keeps its existing revenue/chart cards.

**Files:**
- Modify: `src/app/admin/dashboard/page.tsx` (nav + policy-library section + header copy), smoke steps

**Δ Positioning:** The dashboard is the *operator's window into policy-as-revenue*: it surfaces the multi-domain policy library (same engine, many permissions) and links to the audit trail. Live access read-outs (GRANT/DENY today) come from `KpiCards`/`/api/admin/business` (Task 22).

- [ ] **Step A: Header copy + audit nav + policy library section** — replace the header block and prepend a nav bar, then add a "Library Kebijakan" section before the closing `</main>`:

```tsx
import Link from 'next/link';
import { getDb } from '@/lib/db';
import { listPoliciesByDomain } from '@/lib/policy/library';
```

header:

```tsx
<header className="mb-6 flex flex-wrap items-center justify-between gap-3">
  <h1 className="text-2xl font-semibold">Dashboard Admin — UPN Kampus</h1>
  <div className="flex items-center gap-3">
    <Link href="/admin/audit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200">Audit Trail</Link>
    <span className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950">{rupiah(stats.revenueTotalCents)}</span>
  </div>
</header>
```

policy-library section (before `</main>`):

```tsx
<section className="mt-6 rounded-2xl bg-slate-900 p-4">
  <h2 className="mb-2 font-medium text-slate-300">Library Kebijakan (6 domain, satu engine)</h2>
  <div className="grid gap-3 md:grid-cols-2">
    {(['campus', 'office', 'event', 'parking', 'residence', 'industrial'] as const).map((domain) => (
      <div key={domain} className="rounded-xl border border-slate-800 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{domain}</p>
        <ul className="mt-2 space-y-1 text-sm">
          {listPoliciesByDomain(getDb(), domain).map((p) => (
            <li key={p.id}>
              <span className="font-medium">{p.name}</span>{' '}
              <span className="text-slate-500">({p.credential}{p.area ? ` · ${p.area}` : ''})</span>
              {JSON.parse(p.prerequisites ?? '[]').length > 0 && (
                <span className="text-slate-400"> — prasyarat: {JSON.parse(p.prerequisites).join(', ')}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
</section>
```

- [ ] **Step B: Extend smoke test (existing Step 4)** — after the dashboard curl, add:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin/audit   # → 200
```

- [ ] **Step C: Commit**

```bash
git add -A && git commit -m "feat(ui): dashboard policy library + audit nav"
```

---

### Task 16: Demo Seed Script, Run-through, README

**Files:**
- Create: `scripts/demo.ts` (prints step-by-step checklist + executes the demo actions end-to-end), `README.md`
- Smoke: run `npm run demo`.

**Interfaces:**
- Consumes: everything above via HTTP on `localhost:3000`
- Produces: a reproducible demo run and documentation.

- [ ] **Step 1: Write `scripts/demo.ts`** — the 16-step demo story from spec section "Demo story (16 langkah)": signed documents & credentials via e.id → holder portfolio → explainable GRANT/DENY → document verification → delegation → business KPIs.

```ts
import { initDb } from '../src/lib/db';
import { seedDemo, seedDemoPortfolio, seedDemoFailDocuments } from '../src/lib/db/seed';
import { createClient } from '../src/lib/eid/client';

async function main() {
  const db = initDb();
  const eid = createClient();
  const { orgId, counts } = seedDemo(db, eid);
  const extra = await seedDemoPortfolio(db, eid, orgId);
  const fails = await seedDemoFailDocuments(db, eid, orgId);
  console.log('\n=== TRUSTACCESS DEMO — TRUSTED CREDENTIALS & ACCESS (e.id) ===');
  console.log(`Org: UPN Kampus (id=${orgId}) | seeded: ${JSON.stringify({ ...counts, ...extra, fails })}`);
  console.log(`
Demo story (16 langkah):
 1. Landing page ............ /  — positioning: kredensial & dokumen digital tepercaya
 2. Login via e.id SSO ....... /api/auth/eid/start  (EDU = e.id)
 3. Issuer terbitkan dokumen . POST /api/admin/credentials { templateName:'SafetyInduction', documentTitle, issuerLabel, validHours }
    -> diterbitkan oleh "Example University", ditandatangani e.id (fake)
 4. Holder portfolio ......... GET /api/holder/credentials?email=panji@kampus.demo  -> 4 kredensial, semua status active
 5. QR membawa IDENTITAS ..... QR = { v:1, credentialId }, engine tarik seluruh portfolio holder
 6. Lab gate (cross-credential) POST /api/verify { accessPointId: 2, qrPayload } panji -> GRANT
    (LaboratoryAccess + StudentCredential + SafetyInduction dari dokumen berbeda)
 7. Gate utama ................. /gate/1 tamu AccessPass -> GRANT (hijau)
 8. Lab gate DENY + trace ....... /gate/2 andi tanpa SafetyInduction -> DENY, respons berisi trace
    "Identitas / Tanda Tangan / Status Kredensial / Cakupan Area / Periode Berlaku / Jam Operasional / Prasyarat"
 9. Why-denied UI ............. /gate/2 menampilkan alasan + trace tiap indikator
10. Dokumen kadaluarsa ........ GET /api/verify/document?demo=expired -> TIDAK VALID + alasan
11. Dokumen dicabut ........... GET /api/verify/document?demo=revoked -> TIDAK VALID + alasan
12. Dokumen valid ............. GET /api/verify/document?demo=valid  -> VALID + ceklis indikator
13. Verifikasi manual dokumen . /verify/document (tempel QR payload)
14. Delegasi host -> tamu ...... POST /api/delegate { guestEmail, guestName, validHours } -> VisitorPass turunan
15. Audit trail ............... /admin/audit  (semua event gate + dokumen + anomali)
16. Business KPIs ............. /admin/dashboard (KpiCards: grant hari ini, grant rate, estimasi pendapatan)
`);
  console.log('UI: /  /login  /register  /holder  /holder/[credentialId]  /verify/document  /gate/1  /gate/2  /gate/3  /admin/dashboard  /admin/audit');
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
```

- [ ] **Step 2: Write `README.md`** covering: intro (Trusted Credentials & Access Infrastructure, TrustAccess = business layer, e.id = trust layer; TrustAccess never signs documents itself — issuance delegated to e.id), e.id integration summary (identity/ssos, issuance, holder portfolio, verification — all behind one adapter, `EID_FAKE=1` sandbox), quickstart (`npm i`, `npm run seed`, `npm run dev`), the demo script (the 16 steps above + how to replay them via curl), environment variables (`EID_FAKE`, `DB_PATH`, `ACTUATOR_URL`, `SESSION_SECRET`, `EID_LLM_URL` + `NEXT_PUBLIC_EXPLAIN` for Task 23), honest AI framing (deterministic policy engine; the optional LLM only re-frames the trace into prose and is OFF by default), and the roadmap note (real e.id HTTP adapter, Midtrans/Xendit payment, template image rendering).

- [ ] **Step 3: Final full verification**

Run: `npm test` → all green.
Run: `npm run build` → succeeds (bonus: catches server/client split errors).
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "docs: README + demo script; final polish"
```

---

### Task 17 (new): Pure business layers — `lib/credential`, `lib/document`, `lib/policy`

**Execution order:** FIRST in Phase 1 — everything new (Tasks 11 extension, 18, 19, 20) depends on these modules.

**Files:**
- Create: `src/lib/credential/status.ts`, `src/lib/document/verification.ts`, `src/lib/policy/trace.ts`, `src/lib/policy/library.ts`
- Test: `tests/credential-status.test.ts`, `tests/document-verification.test.ts`, `tests/policy-library.test.ts` (Create)

**Interfaces:**
- Consumes: types from `src/lib/types.ts` (`CredentialData`, `TraceItem`, `DocumentVerificationTrace`, `GateRule`, `GateDecision`, `VerificationResult`, `Policy`, `EidClient`, `DBSession`)
- Produces: `deriveStatus(cred, nowMs?)`, `verifyDocument(cred, now?)`, `verifyPresentationDocument(eid, qrPayload)`, `buildGateTrace(result, rule, decision, localNow)`, `hhmm(minutesOfDay)`, `toPolicy(row)`, `policyGateRule(policy)`, `listPoliciesByDomain(db, domain)`, `getPolicyByName(db, name)`, `summarizePolicies(db, portfolio, localNow)`

- [ ] **Step 1: `src/lib/credential/status.ts`**

```ts
import type { CredentialData } from '../types';

export type CredentialStatus = 'active' | 'expired' | 'revoked';

export function deriveStatus(cred: CredentialData, nowMs = Date.now()): CredentialStatus {
  if (cred.revoked) return 'revoked';
  if (nowMs < Date.parse(cred.validFrom) || nowMs > Date.parse(cred.validUntil)) return 'expired';
  return 'active';
}
```

- [ ] **Step 2: `src/lib/document/verification.ts`** — a signed document is valid iff its VC signature/presentation is OK (`result.ok`) AND every lifecycle trace item is green. Returns the `DocumentVerificationTrace` shape (`{ valid, items, reasons }`) fixed by the Task 2 types.

```ts
import type { CredentialData, DocumentVerificationTrace, EidClient, TraceItem } from '../types';

export function documentTraceItems(cred: CredentialData, now: Date): TraceItem[] {
  const nowMs = now.getTime();
  const inWindow = nowMs >= Date.parse(cred.validFrom) && nowMs <= Date.parse(cred.validUntil);
  return [
    { label: 'Periode Berlaku', ok: inWindow, detail: inWindow ? 'Dalam periode berlaku' : 'Di luar periode berlaku' },
    { label: 'Status Dokumen', ok: !cred.revoked, detail: cred.revoked ? 'Dibuatkan (revoked) oleh penerbit' : 'Dokumen aktif' },
    { label: 'Penerbit', ok: !!cred.issuerLabel, detail: cred.issuerLabel ?? 'Tidak tertera' },
    { label: 'Tanda Tangan (e.id)', ok: inWindow && !cred.revoked, detail: inWindow && !cred.revoked ? 'Valid' : 'Tidak valid' },
  ];
}

export function verifyDocument(cred: CredentialData, now = new Date()): DocumentVerificationTrace {
  const items = documentTraceItems(cred, now);
  const reasons: string[] = [];
  if (!items[0].ok) reasons.push(`Dokumen "${cred.documentTitle ?? cred.type}" di luar periode berlaku.`);
  if (cred.revoked) reasons.push(`Dokumen "${cred.documentTitle ?? cred.type}" telah dibatalkan penerbitnya.`);
  return { valid: items.every((i) => i.ok), items, reasons };
}

export async function verifyPresentationDocument(
  eid: EidClient,
  qrPayload: string,
): Promise<{ cred: CredentialData; trace: DocumentVerificationTrace }> {
  const result = await eid.verifyPresentation(qrPayload);
  const cred = result.credentials[0];
  if (!cred) throw new Error('Presentasi tidak mengandung dokumen');
  const trace: DocumentVerificationTrace = result.ok
    ? verifyDocument(cred)
    : { valid: false, items: [{ label: 'Tanda Tangan (e.id)', ok: false, detail: 'Tanda tangan/presentasi tidak valid' }], reasons: ['Tanda tangan atau presentasi tidak valid.'] };
  return { cred, trace };
}
```

- [ ] **Step 3: `src/lib/policy/trace.ts`** — WHY GRANT/DENY for the gate decision path (consumed by the Task 11 verify API and the Task 14 gate UI).

```ts
import type { GateDecision, GateRule, TraceItem, VerificationResult } from '../types';

export function hhmm(minutesOfDay: number): string {
  const h = String(Math.floor(minutesOfDay / 60)).padStart(2, '0');
  const m = String(minutesOfDay % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export function buildGateTrace(
  result: VerificationResult,
  rule: GateRule,
  decision: GateDecision,
  localNow: Date,
): TraceItem[] {
  const nowMs = localNow.getTime();
  const nowMin = localNow.getHours() * 60 + localNow.getMinutes();
  const main = result.credentials.find((c) => c.id === decision.usedPassId);
  const areaOk = !!main && (rule.areaScope.length === 0 || rule.areaScope.some((a) => (main.areaScope ?? []).includes(a)));
  const inWindow = !!main && nowMs >= Date.parse(main.validFrom) && nowMs <= Date.parse(main.validUntil);
  const notRevoked = !!main && !main.revoked;
  const items: TraceItem[] = [
    { label: 'Identitas', ok: result.ok, detail: result.ok ? 'Identitas pemegang terverifikasi' : 'Presentasi gagal' },
    { label: 'Tanda Tangan', ok: result.ok, detail: result.ok ? 'Tanda tangan kredensial valid (e.id)' : 'Tanda tangan tidak valid' },
    { label: 'Status Kredensial', ok: notRevoked, detail: main ? (main.revoked ? 'Dicabut (revoked)' : 'Aktif') : 'Tidak ada kredensial yang cocok' },
    { label: 'Cakupan Area', ok: areaOk, detail: rule.areaScope.join(' / ') || 'Semua area' },
    { label: 'Periode Berlaku', ok: inWindow, detail: inWindow ? 'Dalam periode berlaku' : 'Di luar periode berlaku' },
    { label: 'Jam Operasional', ok: nowMin >= rule.openMinute && nowMin <= rule.closeMinute, detail: `${hhmm(rule.openMinute)}–${hhmm(rule.closeMinute)}` },
  ];
  rule.prerequisites.forEach((p, i) => {
    const ok = result.credentials.some(
      (c) => c.type === p && !c.revoked && nowMs >= Date.parse(c.validFrom) && nowMs <= Date.parse(c.validUntil),
    );
    items.push({ label: `Prasyarat #${i + 1} — ${p}`, ok, detail: ok ? 'Terpenuhi' : 'Belum terpenuhi / tidak valid' });
  });
  return items;
}
```

- [ ] **Step 4: `src/lib/policy/library.ts`** — the multi-domain policy library. DB columns are snake_case (`prerequisites` is JSON text); `toPolicy` maps a row to the camelCase `Policy` type, `policyGateRule` maps to the engine's `GateRule`.

```ts
import type { DBSession } from '../db';
import type { CredentialData, GateRule, Policy } from '../types';

export interface PolicyRow {
  id: number;
  org_id: number;
  domain: string;
  name: string;
  area: string;
  credential: string;
  prerequisites: string;      // JSON array text
  open_minute: number;
  close_minute: number;
  description: string;
}

export function toPolicy(row: PolicyRow): Policy {
  return {
    id: row.id,
    domain: row.domain as Policy['domain'],
    name: row.name,
    area: row.area,
    credential: row.credential,
    prerequisites: JSON.parse(row.prerequisites ?? '[]'),
    openMinute: row.open_minute,
    closeMinute: row.close_minute,
    description: row.description,
  };
}

export function policyGateRule(p: Policy): GateRule {
  return {
    requiredType: p.credential,
    prerequisites: p.prerequisites,
    areaScope: p.area ? [p.area] : [],
    openMinute: p.openMinute,
    closeMinute: p.closeMinute,
    description: p.description,
  };
}

export function listPoliciesByDomain(db: DBSession, domain: string): PolicyRow[] {
  return db.all<PolicyRow>('SELECT * FROM policies WHERE domain = ? ORDER BY id', [domain]);
}

export function getPolicyByName(db: DBSession, name: string): PolicyRow | undefined {
  return db.get<PolicyRow>('SELECT * FROM policies WHERE name = ?', [name]);
}

export interface PolicySummaries {
  policy: Policy;
  satisfied: boolean;
  reasons: string[];
}

export function summarizePolicies(db: DBSession, portfolio: CredentialData[], localNow: Date): PolicySummaries[] {
  const rows = db.all<PolicyRow>('SELECT * FROM policies ORDER BY domain, id');
  const nowMs = localNow.getTime();
  const valid = (c: CredentialData) => !c.revoked && nowMs >= Date.parse(c.validFrom) && nowMs <= Date.parse(c.validUntil);
  return rows.map((row) => {
    const policy = toPolicy(row);
    const rule = policyGateRule(policy);
    const reasons: string[] = [];
    if (!portfolio.some((c) => c.type === rule.requiredType && valid(c))) {
      reasons.push(`Tidak memiliki ${rule.requiredType} yang aktif`);
    }
    for (const p of rule.prerequisites) {
      if (!portfolio.some((c) => c.type === p && valid(c))) reasons.push(`Prasyarat belum terpenuhi: ${p}`);
    }
    return { policy, satisfied: portfolio.some((c) => c.type === rule.requiredType && valid(c)) && reasons.length === 0, reasons };
  });
}
```

- [ ] **Step 5: Write the failing tests**

`tests/credential-status.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { deriveStatus } from '../src/lib/credential/status';
import type { CredentialData } from '../src/lib/types';

const base: CredentialData = {
  id: '1', type: 'AccessPass', holder: 'a@b.c', revoked: false,
  validFrom: '2026-01-01T00:00:00Z', validUntil: '2026-12-31T00:00:00Z', claims: {},
};

describe('deriveStatus', () => {
  it('active within window', () => expect(deriveStatus(base, Date.parse('2026-06-01T00:00:00Z'))).toBe('active'));
  it('expired after until', () => expect(deriveStatus(base, Date.parse('2027-01-01T00:00:00Z'))).toBe('expired'));
  it('expired before from', () => expect(deriveStatus(base, Date.parse('2025-06-01T00:00:00Z'))).toBe('expired'));
  it('revoked wins', () => expect(deriveStatus({ ...base, revoked: true }, Date.parse('2026-06-01T00:00:00Z'))).toBe('revoked'));
});
```

`tests/document-verification.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { verifyDocument } from '../src/lib/document/verification';
import type { CredentialData } from '../src/lib/types';

const cred: CredentialData = {
  id: '1', type: 'SafetyInduction', holder: 'panji@kampus.demo', revoked: false,
  validFrom: '2026-01-01T00:00:00Z', validUntil: '2027-01-01T00:00:00Z', claims: {},
  documentTitle: 'Safety Induction Certificate', issuerLabel: 'Example University',
};

describe('verifyDocument', () => {
  it('valid signed document', () => {
    const t = verifyDocument(cred, new Date('2026-06-01T00:00:00Z'));
    expect(t.valid).toBe(true);
    expect(t.reasons).toEqual([]);
  });
  it('expired document rejected with reason', () => {
    const t = verifyDocument(cred, new Date('2027-03-01T00:00:00Z'));
    expect(t.valid).toBe(false);
    expect(t.reasons.join(' ')).toContain('periode berlaku');
  });
  it('revoked document rejected', () => {
    const t = verifyDocument({ ...cred, revoked: true }, new Date('2026-06-01T00:00:00Z'));
    expect(t.valid).toBe(false);
    expect(t.reasons.join(' ')).toContain('dibatalkan');
  });
});
```

`tests/policy-library.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initDb, type DBSession } from '../src/lib/db';
import { seedDemo, seedDemoPortfolio } from '../src/lib/db/seed';
import { createClient, __resetFake } from '../src/lib/eid/client';
import { listPoliciesByDomain, getPolicyByName, policyGateRule, summarizePolicies } from '../src/lib/policy/library';

let db: DBSession;
let orgId: number;

beforeAll(async () => {
  __resetFake();
  db = initDb(':memory:');
  const eid = createClient();
  orgId = seedDemo(db, eid).orgId;
  await seedDemoPortfolio(db, eid, orgId);
});

describe('policy library', () => {
  it('lists campus policies', () => {
    const campus = listPoliciesByDomain(db, 'campus');
    expect(campus.length).toBeGreaterThanOrEqual(3);
    expect(campus.map((p) => p.name)).toContain('Laboratory Access');
  });

  it('maps a policy row to a gate rule with prerequisites', () => {
    const rule = policyGateRule({ id: 1, org_id: orgId, domain: 'campus', name: 'Laboratory Access', area: 'Laboratorium', credential: 'LaboratoryAccess', prerequisites: '["StudentCredential","SafetyInduction"]', open_minute: 420, close_minute: 1080, description: 'GRANT ACCESS — require student + valid safety induction' });
    expect(rule.requiredType).toBe('LaboratoryAccess');
    expect(rule.prerequisites).toEqual(['StudentCredential', 'SafetyInduction']);
  });

  it('summarizes which policies a portfolio satisfies', async () => {
    const eid = createClient();
    const portfolio = await eid.listCredentialsForHolder('panji@kampus.demo');
    const summary = summarizePolicies(db, portfolio, new Date('2026-08-29T06:00:00Z'));
    const lab = summary.find((s) => s.policy.name === 'Laboratory Access');
    expect(lab?.satisfied).toBe(true);
    const parking = summary.find((s) => s.policy.name === 'Parking Gate');
    expect(parking?.satisfied).toBe(true);
  });
});
```

- [ ] **Step 6: Run tests to verify pass**

Run: `npm test`
Expected: three new suites pass (and `summarizePolicies` sees the lab policy satisfyable for panji's portfolio — note the policy library rows come from the same `seedDemoPortfolio` seed used by the db-extended test).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(lib): credential status, document verification, policy library + gate trace"
```

---

### Task 18 (new): Document verification — API + demo screen

**Execution order:** Phase 1, right after Task 17 (depends on `src/lib/document/verification.ts`).

**Files:**
- Create: `src/app/api/verify/document/route.ts`, `src/app/verify/document/page.tsx`, `src/lib/db/audit.ts`
- Modify: `src/lib/db/seed.ts` (append `seedDemoFailDocuments`)
- Test: `tests/api-verify-document.test.ts` (Create)

**Interfaces:**
- Consumes: `verifyPresentationDocument`, `verifyDocument` (Task 17), `createClient`, `getDb`, `logAudit`
- Produces: `POST /api/verify/document { qrPayload }`, `GET /api/verify/document?demo=valid|expired|revoked`, `/verify/document` client screen

- [ ] **Step A: Seed the document-verification demo (append to `src/lib/db/seed.ts`)**

```ts
export interface DemoDocumentCase {
  label: 'valid' | 'expired' | 'revoked';
  templateName: string;
  holderEmail: string;
  hostRef: string;
  validFrom: string;
  validUntil: string;
  revoke?: boolean;
}

export async function seedDemoFailDocuments(
  db: DBSession,
  eid: EidClient,
  orgId: number,
): Promise<Record<string, string>> {
  const cases: DemoDocumentCase[] = [
    { label: 'valid', templateName: 'SafetyInduction', holderEmail: 'demo-valid@kampus.demo', hostRef: 'demo:document:valid', validFrom: '2026-01-01T00:00:00.000Z', validUntil: '2027-01-01T00:00:00.000Z' },
    { label: 'expired', templateName: 'SafetyInduction', holderEmail: 'demo-expired@kampus.demo', hostRef: 'demo:document:expired', validFrom: '2025-01-01T00:00:00.000Z', validUntil: '2026-01-01T00:00:00.000Z' },
    { label: 'revoked', templateName: 'SafetyInduction', holderEmail: 'demo-revoked@kampus.demo', hostRef: 'demo:document:revoked', validFrom: '2026-01-01T00:00:00.000Z', validUntil: '2027-01-01T00:00:00.000Z', revoke: true },
  ];
  const now = new Date().toISOString();
  const out: Record<string, string> = {};
  for (const c of cases) {
    const { credentialId } = await eid.issueCredential({
      templateName: c.templateName,
      holderEmail: c.holderEmail,
      claims: { fullName: c.holderEmail.split('@')[0] },
      validFrom: c.validFrom,
      validUntil: c.validUntil,
      documentTitle: 'Safety Induction Certificate',
      issuerLabel: 'Example University',
    });
    db.run(
      `INSERT INTO issued_passes (org_id, credential_id, holder_email, template_name, document_title, issuer_label, description, category, status, source, host_ref, valid_from, valid_until, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [orgId, credentialId, c.holderEmail, c.templateName, 'Safety Induction Certificate', 'Example University', null, 'certificate', 'active', 'admin', c.hostRef, c.validFrom, c.validUntil, now],
    );
    if (c.revoke) {
      await eid.revokeCredential(credentialId);
      db.run('UPDATE issued_passes SET status = ? WHERE credential_id = ?', ['revoked', credentialId]);
    }
    out[c.label] = credentialId;
  }
  return out;
}
```

- [ ] **Step B: `src/lib/db/audit.ts`** — every verification (gate or document) lands in `access_events`; the audit UI (Task 20) reads it.

```ts
import type { DBSession } from '../db';

export interface AuditEntry {
  action: string;
  subject: string | null;
  target: string | null;
  detail: string | null;
}

export function logAudit(db: DBSession, entry: AuditEntry): void {
  db.run(
    `INSERT INTO access_events (org_id, pass_id, access_point_id, verdict, reasons, credential_id, action, actuator_detail, created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [1, null, null, 'na', null, entry.target, entry.action, entry.detail, new Date().toISOString()],
  );
}

export function listAccessEvents(db: DBSession, orgId: number, limit = 100): unknown[] {
  return db.all(
    `SELECT e.*, p.name AS access_point_name, p.kind
     FROM access_events e LEFT JOIN access_points p ON p.id = e.access_point_id
     WHERE e.org_id = ? ORDER BY e.id DESC LIMIT ?`,
    [orgId, limit],
  );
}

export function listAnomalyAlerts(db: DBSession, orgId: number, limit = 50): unknown[] {
  return db.all('SELECT * FROM anomaly_alerts WHERE org_id = ? ORDER BY id DESC LIMIT ?', [orgId, limit]);
}
```

- [ ] **Step C: `src/app/api/verify/document/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createClient } from '@/lib/eid/client';
import { verifyPresentationDocument } from '@/lib/document/verification';
import { logAudit } from '@/lib/db/audit';

const DOC_DEMO: Record<string, string> = {
  valid: 'demo:document:valid',
  expired: 'demo:document:expired',
  revoked: 'demo:document:revoked',
};

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const demoKey = url.searchParams.get('demo');
  const hostRef = demoKey ? DOC_DEMO[demoKey] : undefined;
  if (!hostRef) return NextResponse.json({ error: 'Demo payload: ?demo=valid | expired | revoked' }, { status: 400 });
  const row = getDb().get<{ credential_id: string }>('SELECT credential_id FROM issued_passes WHERE host_ref = ? LIMIT 1', [hostRef]);
  if (!row) return NextResponse.json({ error: 'Dokumen demo belum di-seed — jalankan: npm run seed' }, { status: 409 });
  const qr = JSON.stringify({ v: 1, credentialId: row.credential_id });
  return NextResponse.json(await verifyPresentationDocument(createClient(), qr));
}

export async function POST(req: Request): Promise<NextResponse> {
  const body = (await req.json()) as { qrPayload?: string };
  if (!body.qrPayload) return NextResponse.json({ error: 'qrPayload wajib' }, { status: 400 });
  let result;
  try {
    result = await verifyPresentationDocument(createClient(), body.qrPayload);
  } catch {
    return NextResponse.json({ error: 'Presentasi tidak mengandung dokumen' }, { status: 400 });
  }
  logAudit(getDb(), { action: 'verify.document', subject: result.cred.holder, target: result.cred.id, detail: JSON.stringify(result.trace) });
  return NextResponse.json(result);
}
```

- [ ] **Step D: `/verify/document` client screen** (`src/app/verify/document/page.tsx`)

```tsx
'use client';
import { useEffect, useState } from 'react';

interface TraceItem { label: string; ok: boolean; detail?: string }
interface DocResult {
  credential: { id: string; documentTitle?: string; holder: string; issuerLabel?: string; validFrom: string; validUntil: string; type: string };
  trace: { valid: boolean; items: TraceItem[]; reasons: string[] };
}

export default function VerifyDocumentPage() {
  const [qr, setQr] = useState('');
  const [res, setRes] = useState<DocResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('qr');
    if (q) setQr(q);                      // deep-link from /holder: prefill & verify
  }, []);

  async function runDemo(kind: 'valid' | 'expired' | 'revoked') {
    setError(null); setRes(null);
    const r = await fetch(`/api/verify/document?demo=${kind}`);
    const data = await r.json();
    if (!r.ok) { setError(data.error ?? 'Gagal mengambil demo'); return; }
    setRes(data);
  }

  async function verifyRaw() {
    setError(null); setRes(null);
    const r = await fetch('/api/verify/document', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ qrPayload: qr }),
    });
    const data = await r.json();
    if (!r.ok) { setError(data.error ?? 'Gagal verifikasi'); return; }
    setRes(data);
  }

  const c = res?.credential;
  const t = res?.trace;
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Verifikasi Dokumen Digital</h1>
      <p className="text-slate-400 mb-6">Dokumen ditandatangani penerbit via e.id — QR membawa identitas holder, bukan token sekali pakai.</p>
      <div className="flex flex-wrap gap-2 mb-6">
        <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold" onClick={() => runDemo('valid')}>Demo: Dokumen Valid</button>
        <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm" onClick={() => runDemo('expired')}>Demo: Kadaluarsa</button>
        <button className="rounded-lg bg-red-900 px-4 py-2 text-sm" onClick={() => runDemo('revoked')}>Demo: Dibatalkan</button>
      </div>
      <div className="flex gap-2 mb-6">
        <input className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm" value={qr}
          onChange={(e) => setQr(e.target.value)} placeholder="Tempel QR payload di sini" />
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold" onClick={verifyRaw}>Verifikasi</button>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {c && t && (
        <div className="rounded-xl border border-slate-800 p-4">
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${t.valid ? 'bg-emerald-600/20 text-emerald-300' : 'bg-red-600/20 text-red-300'}`}>
            {t.valid ? 'DOKUMEN VALID' : 'DOKUMEN TIDAK VALID'}
          </span>
          <h2 className="mt-3 text-xl font-semibold">{c.documentTitle ?? c.type}</h2>
          <p className="text-sm text-slate-400">Holder: {c.holder} · Penerbit: {c.issuerLabel ?? 'e.id'}</p>
          <p className="text-xs text-slate-500">Berlaku {new Date(c.validFrom).toLocaleString('id-ID')} – {new Date(c.validUntil).toLocaleString('id-ID')}</p>
          {t.reasons.map((r, i) => <p key={i} className="mt-1 text-sm text-amber-300">• {r}</p>)}
          <ul className="mt-4 space-y-1">
            {t.items.map((it) => (
              <li key={it.label} className="flex items-center gap-2 text-sm">
                <span className={it.ok ? 'text-emerald-400' : 'text-red-400'}>{it.ok ? '✓' : '✗'}</span>
                <span className="w-48">{it.label}</span>
                <span className="text-slate-400">{it.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step E: Write the failing test `tests/api-verify-document.test.ts`** (temp FILE db — the routes use `getDb()`):

```ts
import fs from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';
import { initDb, getDb } from '../src/lib/db';
import { seedDemo, seedDemoPortfolio, seedDemoFailDocuments } from '../src/lib/db/seed';
import { createClient, __resetFake } from '../src/lib/eid/client';
import { GET, POST } from '../src/app/api/verify/document/route';

const TEST_DB = './data/test-trustaccess.db';
describe('document verification api', () => {
  beforeAll(async () => {
    process.env.DB_PATH = TEST_DB;
    if (fs.existsSync(TEST_DB)) fs.rmSync(TEST_DB);
    __resetFake();
    const db = initDb(TEST_DB);
    const eid = createClient();
    const seeded = seedDemo(db, eid);
    await seedDemoPortfolio(db, eid, seeded.orgId);
    await seedDemoFailDocuments(db, eid, seeded.orgId);
  });

  it('valid for a valid signed document', async () => {
    const res = await GET(new Request('http://localhost/api/verify/document?demo=valid'));
    const body = await res.json();
    expect(body.trace.valid).toBe(true);
    expect(body.credential.documentTitle).toBe('Safety Induction Certificate');
  });

  it('expired document rejected with reasons', async () => {
    const res = await GET(new Request('http://localhost/api/verify/document?demo=expired'));
    const body = await res.json();
    expect(body.trace.valid).toBe(false);
    expect(body.trace.items.some((t: TraceItem) => t.label === 'Periode Berlaku' && !t.ok)).toBe(true);
    expect(body.trace.reasons.length).toBeGreaterThan(0);
  });

  it('revoked document rejected', async () => {
    const res = await GET(new Request('http://localhost/api/verify/document?demo=revoked'));
    const body = await res.json();
    expect(body.trace.valid).toBe(false);
    expect(body.trace.reasons.join(' ')).toContain('dibatalkan');
  });

  it('verifies a raw QR via POST and logs an audit event', async () => {
    const row = getDb().get<{ credential_id: string }>('SELECT credential_id FROM issued_passes WHERE host_ref = ? LIMIT 1', ['demo:document:valid']);
    const qr = JSON.stringify({ v: 1, credentialId: row!.credential_id });
    const res = await POST(new Request('http://localhost/api/verify/document', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ qrPayload: qr }),
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.trace.valid).toBe(true);
    const audit = getDb().all<any>('SELECT * FROM access_events WHERE action = ?', ['verify.document']);
    expect(audit.length).toBeGreaterThan(0);
  });
});

interface TraceItem { label: string; ok: boolean; detail?: string }
```

- [ ] **Step F: Run tests + smoke**

Run: `npm test`, then `npm run seed` (now includes fail-documents).
Expected: api-verify-document tests pass; seed logs `fails` counts.

- [ ] **Step G: Commit**

```bash
git add -A && git commit -m "feat(verify): signed-document verification API + demo screen + audit log"
```

---

### Task 19 (new): Holder self-service — My Credentials

**Execution order:** Phase 1, paired with the Task 13 extension (Task 13 = restored copy + holder page rows; Task 19 = the full portfolio screen).

**Files:**
- Create: `src/app/api/holder/credentials/route.ts`, `src/app/holder/page.tsx`
- Test: `tests/api-holder-credentials.test.ts` (Create)

**Interfaces:**
- Consumes: `listCredentialsForHolder` (Task 6), `deriveStatus` (Task 17), `summarizePolicies` (Task 17), `readSession`/`SESSION_COOKIE` (Task 8)
- Produces: `GET /api/holder/credentials?email=`, `/holder` page

- [ ] **Step A: `src/app/api/holder/credentials/route.ts`** — the holder's full portfolio (not a single QR slide), each credential typed by lifecycle status, plus which policies they can satisfy today.

```ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createClient } from '@/lib/eid/client';
import { deriveStatus } from '@/lib/credential/status';
import { summarizePolicies } from '@/lib/policy/library';
import { toOrgLocal } from '@/lib/time';
import { readSession } from '@/lib/session';
import { SESSION_COOKIE } from '@/lib/config';

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const cookie = req.headers.get('cookie') ?? '';
  const token = cookie.split(`${SESSION_COOKIE}=`)[1]?.split(';')[0];
  const session = await readSession(token);
  const email = url.searchParams.get('email') ?? session?.email ?? 'panji@kampus.demo';

  const eid = createClient();
  const credentials = await eid.listCredentialsForHolder(email);
  const portfolio = credentials.map((c) => ({ ...c, status: deriveStatus(c) }));

  const db = getDb();
  const org = db.get<{ tz_offset_min: number }>('SELECT tz_offset_min FROM organizations WHERE id = 1');
  const localNow = toOrgLocal(new Date(), org?.tz_offset_min ?? 420);
  const policies = summarizePolicies(db, credentials, localNow);

  return NextResponse.json({ holderEmail: email, portfolio, policies });
}
```

- [ ] **Step B: `/holder` page** (`src/app/holder/page.tsx`) — credential cards with status badge, document metadata, QR payload, and a deep-link to `/verify/document`.

```tsx
'use client';
import { useEffect, useState } from 'react';

interface Cred { id: string; type: string; documentTitle?: string; issuerLabel?: string; holder: string; areaScope?: string[]; validFrom: string; validUntil: string; status: string; }
interface PolicyS { policy: { name: string; domain: string }; satisfied: boolean; reasons: string[]; }
interface Data { holderEmail: string; portfolio: Cred[]; policies: PolicyS[]; }

export default function HolderPage() {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    fetch('/api/holder/credentials').then((r) => r.json()).then(setData).catch(() => setData(null));
  }, []);

  const badge = (s: string) =>
    s === 'active' ? 'bg-emerald-600/20 text-emerald-300'
    : s === 'expired' ? 'bg-amber-600/20 text-amber-300' : 'bg-red-600/20 text-red-300';

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">My Credentials</h1>
      {data && <p className="text-slate-400 text-sm mb-6">Holder: {data.holderEmail}</p>}
      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {data.portfolio.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-800 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">{c.documentTitle ?? c.type}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge(c.status)}`}>{c.status.toUpperCase()}</span>
                </div>
                <p className="text-sm text-slate-400">{c.type}{c.issuerLabel ? ` · ${c.issuerLabel}` : ''}</p>
                <p className="text-xs text-slate-500">Berlaku sd {new Date(c.validUntil).toLocaleDateString('id-ID')}</p>
                <a className="mt-3 inline-block text-sm text-blue-400 underline" href={`/verify/document?qr=${encodeURIComponent(JSON.stringify({ v: 1, credentialId: c.id }))}`}>Verifikasi dokumen ini</a>
              </div>
            ))}
          </div>
          <h2 className="mt-8 mb-2 text-lg font-semibold">Kebijakan yang dapat dipenuhi</h2>
          <ul className="space-y-1">
            {data.policies.map((p) => (
              <li key={p.policy.name} className="text-sm flex items-start gap-2">
                <span className={p.satisfied ? 'text-emerald-400' : 'text-red-400'}>{p.satisfied ? '✓' : '✗'}</span>
                <span>
                  <span className="font-medium">[{p.policy.domain}] {p.policy.name}</span>
                  {!p.satisfied && <span className="text-slate-400"> — {p.reasons.join('; ')}</span>}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
```

- [ ] **Step C: Write the failing test `tests/api-holder-credentials.test.ts`** (temp FILE db):

```ts
import fs from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';
import { initDb } from '../src/lib/db';
import { seedDemo, seedDemoPortfolio } from '../src/lib/db/seed';
import { createClient, __resetFake } from '../src/lib/eid/client';
import { GET } from '../src/app/api/holder/credentials/route';

const TEST_DB = './data/test-trustaccess.db';
describe('holder credentials api', () => {
  beforeAll(async () => {
    process.env.DB_PATH = TEST_DB;
    if (fs.existsSync(TEST_DB)) fs.rmSync(TEST_DB);
    __resetFake();
    const db = initDb(TEST_DB);
    const eid = createClient();
    const seeded = seedDemo(db, eid);
    await seedDemoPortfolio(db, eid, seeded.orgId);
  });

  it('returns panji portfolio with statuses + satisfiable policies', async () => {
    const res = await GET(new Request('http://localhost/api/holder/credentials?email=panji@kampus.demo'));
    const body = await res.json();
    expect(body.holderEmail).toBe('panji@kampus.demo');
    expect(body.portfolio).toHaveLength(4);
    expect(body.portfolio.every((c: any) => c.status === 'active')).toBe(true);
    expect(body.policies.some((p: any) => p.policy.name === 'Laboratory Access' && p.satisfied)).toBe(true);
    expect(body.policies.some((p: any) => p.policy.name === 'Parking Gate' && p.satisfied)).toBe(true);
  });

  it('demonstrates derivation defaulting to panji when no email param', async () => {
    const res = await GET(new Request('http://localhost/api/holder/credentials'));
    const body = await res.json();
    expect(body.holderEmail).toBe('panji@kampus.demo');
  });
});
```

- [ ] **Step D: Run tests to verify pass**

Run: `npm test`
Expected: holder-credentials tests pass.

- [ ] **Step E: Commit**

```bash
git add -A && git commit -m "feat(holder): My Credentials portfolio + policy explainer"
```

---

### Task 20 (new): Audit trail — `/admin/audit`

**Execution order:** Phase 1, after Tasks 18/19 (reads `access_events` + `anomaly_alerts` written by the verify APIs).

**Files:**
- Create: `src/app/api/admin/audit/route.ts`, `src/app/admin/audit/page.tsx`
- Test: `tests/api-audit.test.ts` (Create)

**Interfaces:**
- Consumes: `listAccessEvents`, `listAnomalyAlerts` (Task 18), admin session guard (Task 9 pattern)
- Produces: `GET /api/admin/audit?orgId=&limit=`, `/admin/audit` table

- [ ] **Step A: `src/app/api/admin/audit/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { listAccessEvents, listAnomalyAlerts } from '@/lib/db/audit';
import { readSession } from '@/lib/session';
import { SESSION_COOKIE } from '@/lib/config';

export async function GET(req: Request): Promise<NextResponse> {
  const cookie = req.headers.get('cookie') ?? '';
  const token = cookie.split(`${SESSION_COOKIE}=`)[1]?.split(';')[0];
  const session = await readSession(token);
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const orgId = Number(url.searchParams.get('orgId') ?? '1');
  const limit = Number(url.searchParams.get('limit') ?? '100');
  const db = getDb();
  return NextResponse.json({ orgId, events: listAccessEvents(db, orgId, limit), alerts: listAnomalyAlerts(db, orgId) });
}
```

- [ ] **Step B: `/admin/audit` page** (`src/app/admin/audit/page.tsx`)

```tsx
'use client';
import { useEffect, useState } from 'react';

interface Event { id: number; created_at: string; action: string; verdict: string; access_point_name?: string | null; credential_id?: string | null; access_point_id?: number | null }
interface Alert { id: number; severity: string; reasons: string; created_at: string }
interface Data { orgId: number; events: Event[]; alerts: Alert[] }

export default function AdminAuditPage() {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => { fetch('/api/admin/audit').then((r) => r.json()).then(setData).catch(() => setData(null)); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Audit Trail</h1>
      {data?.alerts.length ? (
        <div className="mb-6 rounded-xl border border-amber-800/60 bg-amber-950/30 p-3">
          <p className="text-sm font-semibold text-amber-300">Anomali terdeteksi ({data.alerts.length})</p>
          {data.alerts.map((a) => (
            <p key={a.id} className="text-xs text-amber-200/80 mt-1">#{a.id} {a.severity} — {a.reasons} ({new Date(a.created_at).toLocaleString('id-ID')})</p>
          ))}
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-2">Waktu</th><th className="p-2">Aksi</th><th className="p-2">Verdict</th>
              <th className="p-2">Access Point</th><th className="p-2">Kredensial</th>
            </tr>
          </thead>
          <tbody>
            {data?.events.map((e) => (
              <tr key={e.id} className="border-b border-slate-800/60">
                <td className="p-2 text-xs text-slate-500">{new Date(e.created_at).toLocaleString('id-ID')}</td>
                <td className="p-2">{e.action}</td>
                <td className="p-2"><span className={e.verdict === 'GRANT' ? 'text-emerald-400' : 'text-red-400'}>{e.verdict}</span></td>
                <td className="p-2 text-slate-400">{e.access_point_name ?? (e.action === 'verify.document' ? 'Dokumen' : '—')}</td>
                <td className="p-2 text-xs text-slate-500">{e.credential_id ?? e.access_point_id ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
```

- [ ] **Step C: Write the failing test `tests/api-audit.test.ts`** (temp FILE db; records one gate event via the Task 11 verify route, then asserts it appears in the audit):

```ts
import fs from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';
import { initDb, getDb } from '../src/lib/db';
import { seedDemo, seedDemoPortfolio } from '../src/lib/db/seed';
import { listAccessPointsByOrg } from '../src/lib/db/access';
import { createClient, __resetFake } from '../src/lib/eid/client';
import { createSession } from '../src/lib/session';
import { POST as verifyPost } from '../src/app/api/verify/route';
import { GET } from '../src/app/api/admin/audit/route';

let token: string;
let mainGateId: number;

const TEST_DB = './data/test-trustaccess.db';
beforeAll(async () => {
  process.env.DB_PATH = TEST_DB;
  if (fs.existsSync(TEST_DB)) fs.rmSync(TEST_DB);
  __resetFake();
  const db = initDb(TEST_DB);
  const eid = createClient();
  const seeded = seedDemo(db, eid);
  await seedDemoPortfolio(db, eid, seeded.orgId);
  mainGateId = listAccessPointsByOrg(db, seeded.orgId).find((p) => p.name === 'Pintu Utama')!.id;
  token = await createSession({ subject: 'did:eid:demo-admin', name: 'Demo Admin', email: 'admin@kampus.demo', role: 'admin' });
});

describe('audit api', () => {
  it('records a GRANT gate event then exposes it in audit', async () => {
    const eid = createClient();
    const issued = await eid.issueCredential({
      templateName: 'AccessPass', holderEmail: 'audit@demo.id',
      claims: { fullName: 'Audit', area: JSON.stringify(['Ruang Umum']) }, validUntil: '2026-12-31T00:00:00Z',
    });
    await verifyPost(new Request('http://localhost/api/verify', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accessPointId: mainGateId, qrPayload: issued.qrPayload }),
    }));
    const res = await GET(new Request('http://localhost/api/admin/audit', { headers: { cookie: `vp_session=${token}` } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.events.some((e: { verdict: string }) => e.verdict === 'GRANT')).toBe(true);
  });

  it('rejects anonymous access', async () => {
    const res = await GET(new Request('http://localhost/api/admin/audit'));
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step D: Run tests to verify pass**

Run: `npm test`
Expected: api-audit tests pass.

- [ ] **Step E: Commit**

```bash
git add -A && git commit -m "feat(audit): admin audit trail + anomaly feed screen"
```

---

### Task 21 (new): Delegation — host issues guest access

**Execution order:** Phase 2, after Tasks 10–20 (completes the `delegations` model seeded in Task 2; wired into the Visitor Pass demo).

**Files:**
- Create: `src/lib/db/delegations.ts`, `src/app/api/delegate/route.ts`, `src/app/api/delegate/revoke/route.ts`
- Test: `tests/api-delegate.test.ts` (Create)

**Interfaces:**
- Consumes: `delegations` + `issued_passes` tables, `createClient`, admin-style session guard (operation is a logged-in holder)
- Produces: `POST /api/delegate { holderEmail, guestEmail, guestName, area, validHours }`, `POST /api/delegate/revoke { delegationId }`, `GET /api/delegate?email=`

**Δ Positioning:** a *host* who holds a valid credential for an area can issue a scoped child credential (`VisitorPass`, `source='delegated'`, `host_ref=<host>` — already seeded in the Task 2 demo) so a guest acts inside the host's permission window. Delegation is itself a lid on the ledger and shows up in audit.

- [ ] **Step A: `src/lib/db/delegations.ts`**

```ts
import type { DBSession } from '../db';
import type { DelegationRow } from '../types';

export function insertDelegation(
  db: DBSession,
  row: Omit<DelegationRow, 'id' | 'created_at'>,
): number {
  return db.run(
    `INSERT INTO delegations (org_id, host_email, guest_email, guest_name, area_scope, valid_from, valid_until, status, credential_id, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [row.org_id, row.host_email, row.guest_email, row.guest_name, row.area_scope, row.valid_from, row.valid_until, row.status, row.credential_id, new Date().toISOString()],
  ).lastInsertRowid as number;
}

export function listDelegationsByHost(db: DBSession, hostEmail: string): DelegationRow[] {
  return db.all<DelegationRow>('SELECT * FROM delegations WHERE host_email = ? ORDER BY id DESC', [hostEmail]);
}

export function getDelegation(db: DBSession, id: number): DelegationRow | undefined {
  return db.get<DelegationRow>('SELECT * FROM delegations WHERE id = ?', [id]);
}

export function updateDelegationStatus(db: DBSession, id: number, status: string): void {
  db.run('UPDATE delegations SET status = ? WHERE id = ?', [status, id]);
}
```

- [ ] **Step B: Routes**

`src/app/api/delegate/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createClient } from '@/lib/eid/client';
import { insertDelegation, listDelegationsByHost } from '@/lib/db/delegations';
import { insertIssuedPass } from '@/lib/db/passes';
import { readSession } from '@/lib/session';
import { SESSION_COOKIE } from '@/lib/config';
import { addHoursISO } from '@/lib/db/seed';

const SESSION = `${SESSION_COOKIE}=`;

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const cookie = req.headers.get('cookie') ?? '';
  const token = cookie.split(SESSION)[1]?.split(';')[0];
  const session = await readSession(token);
  const email = url.searchParams.get('email') ?? session?.email ?? 'panji@kampus.demo';
  return NextResponse.json({ hostEmail: email, delegations: listDelegationsByHost(getDb(), email) });
}

export async function POST(req: Request): Promise<NextResponse> {
  const cookie = req.headers.get('cookie') ?? '';
  const token = cookie.split(SESSION)[1]?.split(';')[0];
  const session = await readSession(token);
  const hostEmail = session?.email;
  if (!hostEmail) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json()) as { guestEmail?: string; guestName?: string; area?: string[]; validHours?: number };
  if (!body.guestEmail || !body.guestName) return NextResponse.json({ error: 'guestEmail dan guestName wajib' }, { status: 400 });

  const db = getDb();
  const now = new Date();
  const validFrom = now.toISOString();
  const validUntil = addHoursISO(validFrom, body.validHours ?? 3);
  const area = body.area ?? ['Meeting Room A'];

  const eid = createClient();
  const { credentialId } = await eid.issueCredential({
    templateName: 'VisitorPass',
    holderEmail: body.guestEmail,
    claims: { fullName: body.guestName, hostRef: hostEmail, area: JSON.stringify(area) },
    validFrom, validUntil,
    documentTitle: 'Visitor Pass',
    issuerLabel: 'TrustAccess Issuer',
  });

  const delegationId = insertDelegation(db, {
    org_id: 1, host_email: hostEmail, guest_email: body.guestEmail, guest_name: body.guestName,
    area_scope: JSON.stringify(area), valid_from: validFrom, valid_until: validUntil,
    status: 'active', credential_id: credentialId,
  });

  insertIssuedPass(db, {
    org_id: 1, credential_id: credentialId, holder_email: body.guestEmail, template_name: 'VisitorPass',
    document_title: 'Visitor Pass', issuer_label: 'TrustAccess Issuer', description: `Delegated by ${hostEmail}`,
    category: 'pass', rule_id: null, status: 'active', source: 'delegated', host_ref: hostEmail,
    valid_from: validFrom, valid_until: validUntil,
  });

  return NextResponse.json({ delegationId, credentialId }, { status: 201 });
}
```

`src/app/api/delegate/revoke/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createClient } from '@/lib/eid/client';
import { getDelegation, updateDelegationStatus } from '@/lib/db/delegations';
import { readSession } from '@/lib/session';
import { SESSION_COOKIE } from '@/lib/config';

export async function POST(req: Request): Promise<NextResponse> {
  const cookie = req.headers.get('cookie') ?? '';
  const token = cookie.split(`${SESSION_COOKIE}=`)[1]?.split(';')[0];
  const session = await readSession(token);
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json()) as { delegationId?: number };
  if (!body.delegationId) return NextResponse.json({ error: 'delegationId wajib' }, { status: 400 });

  const db = getDb();
  const del = getDelegation(db, body.delegationId);
  if (!del) return NextResponse.json({ error: 'delegasi tidak ditemukan' }, { status: 404 });

  const eid = createClient();
  if (del.credential_id) await eid.revokeCredential(del.credential_id);
  updateDelegationStatus(db, del.id, 'revoked');
  if (del.credential_id) db.run('UPDATE issued_passes SET status = ? WHERE credential_id = ?', ['revoked', del.credential_id]);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step C: Write the failing test `tests/api-delegate.test.ts`** (temp FILE db; asserts the guest receives a child credential and revoke flips delegation + VC):

```ts
import fs from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';
import { initDb, getDb } from '../src/lib/db';
import { seedDemo, seedDemoPortfolio } from '../src/lib/db/seed';
import { createClient, __resetFake } from '../src/lib/eid/client';
import { createSession } from '../src/lib/session';
import { POST } from '../src/app/api/delegate/route';
import { POST as revokePost } from '../src/app/api/delegate/revoke/route';

let token: string;

const TEST_DB = './data/test-trustaccess.db';
beforeAll(async () => {
  process.env.DB_PATH = TEST_DB;
  if (fs.existsSync(TEST_DB)) fs.rmSync(TEST_DB);
  __resetFake();
  const db = initDb(TEST_DB);
  const eid = createClient();
  const seeded = seedDemo(db, eid);
  await seedDemoPortfolio(db, eid, seeded.orgId);
  token = await createSession({ subject: 'did:eid:panji', name: 'Panji Bawono', email: 'panji@kampus.demo', role: 'holder' });
});

describe('delegation api', () => {
  it('issues a scoped VisitorPass to the guest', async () => {
    const res = await POST(new Request('http://localhost/api/delegate', {
      method: 'POST', headers: { 'content-type': 'application/json', cookie: `vp_session=${token}` },
      body: JSON.stringify({ guestEmail: 'tamu@demo.id', guestName: 'Tamu Kampus', area: ['Meeting Room A'], validHours: 3 }),
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    const eid = createClient();
    const guestCreds = await eid.listCredentialsForHolder('tamu@demo.id');
    expect(guestCreds.some((c) => c.id === body.credentialId && c.type === 'VisitorPass')).toBe(true);
    const mirror = getDb().get<any>('SELECT * FROM issued_passes WHERE credential_id = ?', [body.credentialId]);
    expect(mirror?.source).toBe('delegated');
    expect(mirror?.host_ref).toBe('panji@kampus.demo');
  });

  it('revokes the delegation and the child credential', async () => {
    const res = await POST(new Request('http://localhost/api/delegate', {
      method: 'POST', headers: { 'content-type': 'application/json', cookie: `vp_session=${token}` },
      body: JSON.stringify({ guestEmail: 'guest2@demo.id', guestName: 'Guest 2', area: ['Meeting Room A'], validHours: 2 }),
    }));
    const created = await res.json();
    const rev = await revokePost(new Request('http://localhost/api/delegate/revoke', {
      method: 'POST', headers: { 'content-type': 'application/json', cookie: `vp_session=${token}` },
      body: JSON.stringify({ delegationId: created.delegationId }),
    }));
    expect(rev.status).toBe(200);
    const del = getDb().get<any>('SELECT status FROM delegations WHERE id = ?', [created.delegationId]);
    expect(del?.status).toBe('revoked');
    const eid = createClient();
    const cred = (await eid.verifyPresentation(JSON.stringify({ v: 1, credentialId: created.credentialId }))).credentials[0];
    expect(cred.revoked).toBe(true);
  });

  it('rejects anonymous delegation', async () => {
    const res = await POST(new Request('http://localhost/api/delegate', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ guestEmail: 'x@demo.id', guestName: 'X', validHours: 1 }),
    }));
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step D: Run tests to verify pass**

Run: `npm test`
Expected: api-delegate tests pass.

- [ ] **Step E: Commit**

```bash
git add -A && git commit -m "feat(delegate): host-to-guest scoped visitor credentials"
```

---

### Task 22 (new): Business KPIs — monetization + live operations

**Execution order:** Phase 2, after Tasks 12 & 15 (the /admin/dashboard can adopt `KpiCards` once both this and Task 15 exist — note the execution-order caveat below).

**Files:**
- Create: `src/lib/engine/business.ts`, `src/app/api/admin/business/route.ts`, `src/components/kpi-cards.tsx`
- Test: `tests/engine/business.test.ts` (Create)

**Interfaces:**
- Consumes: `access_events`, `issued_passes`, `access_points`, `anomaly_alerts`; admin guard (Task 20 route pattern)
- Produces: `GET /api/admin/business?orgId=`, a `<KpiCards/>` client component; **labeled demo analytics** — every figure is derived from real ledger rows, never fabricated wholesale.

**Δ Positioning:** TrustAccess monetizes as per-gate SaaS + transaction-based access. KPIs shown to the operator come straight from the event ledger (GRANT/DENY today, grant rate, active points, active credentials, recent anomalies, revenue estimate from paid `source='self'` passes using their tariff-implied price).

- [ ] **Step A: `src/lib/engine/business.ts`**

```ts
import type { DBSession } from '../db';
import { toOrgLocal } from '../time';

export interface BusinessKpis {
  orgId: number;
  today: {
    grants: number;
    denials: number;
    grantRate: number;             // 0..1
    activePoints: number;
    activeCredentials: number;
  };
  revenueEstimateCents: number;    // paid passes ('self' source) — labeled estimate, not real money
  anomalies: number;
  localNowIso: string;
}

export function computeBusinessKpis(db: DBSession, orgId: number, now: Date = new Date()): BusinessKpis {
  const org = db.get<{ tz_offset_min: number }>('SELECT tz_offset_min FROM organizations WHERE id = ?', [orgId]);
  const tzMin = org?.tz_offset_min ?? 420;
  const localNow = toOrgLocal(now, tzMin);
  const localIso = localNow.toISOString();

  // "Today" = org-local calendar day. Compute its UTC epoch bounds, then filter
  // created_at by instant range. (NOT substr(created_at,1,10) === local date:
  // at 00:00–07:00 WIB the UTC calendar date is still the previous day.)
  const localMidnight = new Date(Date.parse(localIso));
  localMidnight.setUTCHours(0, 0, 0, 0);
  const dayStart = new Date(localMidnight.getTime() - tzMin * 60_000).toISOString();
  const dayEnd = new Date(localMidnight.getTime() - tzMin * 60_000 + 24 * 3_600_000).toISOString();
  const rows = db.all<{ verdict: string }>(
    `SELECT verdict FROM access_events WHERE org_id = ? AND created_at >= ? AND created_at < ?`,
    [orgId, dayStart, dayEnd],
  );
  const grants = rows.filter((r) => r.verdict === 'GRANT').length;
  const denials = rows.filter((r) => r.verdict === 'DENY').length;

  const activePoints = db.get<{ n: number }>('SELECT COUNT(*) AS n FROM access_points WHERE org_id = ?', [orgId])?.n ?? 0;
  const activeCredentials = db.get<{ n: number }>('SELECT COUNT(*) AS n FROM issued_passes WHERE org_id = ? AND status = ?', [orgId, 'active'])?.n ?? 0;
  const anomalies = db.get<{ n: number }>('SELECT COUNT(*) AS n FROM anomaly_alerts WHERE org_id = ?', [orgId])?.n ?? 0;

  const paid = db.all<{ source: string }>('SELECT source FROM issued_passes WHERE org_id = ?', [orgId]);
  const paidCount = paid.filter((p) => p.source === 'self').length;

  return {
    orgId,
    today: { grants, denials, grantRate: grants + denials === 0 ? 0 : grants / (grants + denials), activePoints, activeCredentials },
    revenueEstimateCents: paidCount * 25_000,   // labeled estimate: paid passes × Day Pass reference price
    anomalies,
    localNowIso: localIso,
  };
}
```

- [ ] **Step B: `src/app/api/admin/business/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { computeBusinessKpis } from '@/lib/engine/business';
import { readSession } from '@/lib/session';
import { SESSION_COOKIE } from '@/lib/config';

export async function GET(req: Request): Promise<NextResponse> {
  const cookie = req.headers.get('cookie') ?? '';
  const token = cookie.split(`${SESSION_COOKIE}=`)[1]?.split(';')[0];
  const session = await readSession(token);
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const orgId = Number(url.searchParams.get('orgId') ?? '1');
  return NextResponse.json(computeBusinessKpis(getDb(), orgId));
}
```

- [ ] **Step C: `src/components/kpi-cards.tsx`** — used by `/admin/dashboard` (Task 15; wire once both exist — execution-order note) and the spec's business-value story:

```tsx
'use client';
import { useEffect, useState } from 'react';

interface Kpis {
  today: { grants: number; denials: number; grantRate: number; activePoints: number; activeCredentials: number };
  revenueEstimateCents: number;
  anomalies: number;
}

const fmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' });

export default function KpiCards() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  useEffect(() => { fetch('/api/admin/business').then((r) => r.json()).then(setKpis).catch(() => setKpis(null)); }, []);

  if (!kpis) return <div className="grid gap-3 md:grid-cols-3" />;
  const cards: Array<[string, string]> = [
    ['Akses hari ini', `${kpis.today.grants} GRANT / ${kpis.today.denials} DENY`],
    ['Grant rate', `${Math.round(kpis.today.grantRate * 100)}%`],
    ['Titik aktif / kredensial aktif', `${kpis.today.activePoints} / ${kpis.today.activeCredentials}`],
    ['Estimasi pendapatan (pass berbayar)', fmt.format(kpis.revenueEstimateCents)],
    ['Anomali terdeteksi', `${kpis.anomalies}`],
  ];
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {cards.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-slate-800 p-4">
          <p className="text-xs text-slate-400">{label}</p>
          <p className="mt-1 text-xl font-semibold">{value}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step D: Write the failing test `tests/engine/business.test.ts`** (seed + one gate event, then assert KPIs reflect it):

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { initDb } from '../src/lib/db';
import { seedDemo, seedDemoPortfolio } from '../src/lib/db/seed';
import { listAccessPointsByOrg } from '../src/lib/db/access';
import { createClient, __resetFake } from '../src/lib/eid/client';
import { computeBusinessKpis } from '../src/lib/engine/business';
import type { DBSession } from '../src/lib/db';

let db: DBSession;
let orgId: number;

beforeAll(async () => {
  __resetFake();
  db = initDb(':memory:');
  const eid = createClient();
  const seeded = seedDemo(db, eid);
  orgId = seeded.orgId;
  await seedDemoPortfolio(db, eid, orgId);
  const mainGateId = listAccessPointsByOrg(db, orgId).find((p) => p.name === 'Pintu Utama')!.id;
  db.run(
    `INSERT INTO access_events (org_id, pass_id, access_point_id, verdict, reasons, credential_id, action, actuator_detail, created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    [orgId, 'c1', mainGateId, 'GRANT', '[]', 'c1', 'open_gate', 'LED_HIJAU', '2026-08-29T04:00:00Z'],
  );
});

describe('business KPIs', () => {
  it('derives today ledger from access events', () => {
    const kpis = computeBusinessKpis(db, orgId, new Date('2026-08-29T09:00:00Z'));  // 16:00 WIB
    expect(kpis.today.grants).toBe(1);
    expect(kpis.today.denials).toBe(0);
    expect(kpis.today.grantRate).toBe(1);
    expect(kpis.today.activePoints).toBeGreaterThanOrEqual(3);
    expect(kpis.today.activeCredentials).toBeGreaterThanOrEqual(4);
  });
});
```

- [ ] **Step E: Run tests to verify pass**

Run: `npm test`
Expected: business.test passes. (`computeBusinessKpis` filters by epoch range [org-local midnight, +24h), so `2026-08-29T04:00:00Z` counts toward the local day even at +420 when UTC date is `08-28`; assert `today.grants` reflects only same-local-day events.)

- [ ] **Step F: Commit**

```bash
git add -A && git commit -m "feat(analytics): business KPIs + kpi cards (labeled ledger-derived)"
```

---

### Task 23 (new): Explain decision in plain language — LLM-assisted, off by default

**Execution order:** Phase 3, optional. Honors the spec's honest-AI framing: **decisions stay deterministic**; an LLM (via `EID_LLM_URL`) only re-frames the existing trace into prose. Off unless both `NEXT_PUBLIC_EXPLAIN=1` and `EID_LLM_URL` are set; any LLM failure falls back to the template. No verification routing ever depends on it.

**Files:**
- Create: `src/lib/engine/explain.ts`
- Modify: `src/app/api/verify/document/route.ts` (optional `?explain=1`)
- Test: `tests/engine/explain.test.ts` (Create)

- [ ] **Step A: `src/lib/engine/explain.ts`**

```ts
import type { DocumentVerificationTrace } from '../types';

export type ExplainSource = 'llm' | 'template';

export interface ExplainOutput { source: ExplainSource; text: string }

export function templateExplain(trace: DocumentVerificationTrace, holder: string, docTitle: string): string {
  const failed = trace.items.filter((i) => !i.ok).map((i) => i.label);
  if (trace.valid) return `Dokumen "${docTitle}" milik ${holder} valid: semua indikator lolos verifikasi.`;
  return `Dokumen "${docTitle}" milik ${holder} TIDAK valid karena ${failed.join(', ') || 'indikator verifikasi gagal'}.`;
}

function llmEnabled(): boolean {
  return process.env.NEXT_PUBLIC_EXPLAIN === '1' && !!process.env.EID_LLM_URL;
}

export async function explainDecision(input: {
  trace: DocumentVerificationTrace;
  holder: string;
  documentTitle: string;
}): Promise<ExplainOutput> {
  const fallback: ExplainOutput = { source: 'template', text: templateExplain(input.trace, input.holder, input.documentTitle) };
  if (!llmEnabled()) return fallback;
  try {
    const res = await fetch(process.env.EID_LLM_URL!, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) return fallback;
    const data = (await res.json()) as { text?: string };
    const text = data.text?.trim();
    if (!text) return fallback;
    return { source: 'llm', text };
  } catch {
    return fallback;
  }
}
```

- [ ] **Step B: Optionally wire `?explain=1` into `GET /api/verify/document`** — replace the final return in the Task 18 GET handler:

```ts
// replace:  return NextResponse.json(await verifyPresentationDocument(createClient(), qr));
const verified = await verifyPresentationDocument(createClient(), qr);
if (url.searchParams.get('explain') === '1') {
  const explanation = await explainDecision({
    trace: verified.trace,
    holder: verified.cred.holder,
    documentTitle: verified.cred.documentTitle ?? verified.cred.type,
  });
  return NextResponse.json({ ...verified, explanation });
}
return NextResponse.json(verified);
```

(import `explainDecision` from `@/lib/engine/explain`.)

- [ ] **Step C: Write the failing test `tests/engine/explain.test.ts`**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { templateExplain, explainDecision } from '../src/lib/engine/explain';
import type { DocumentVerificationTrace } from '../src/lib/types';

const okTrace: DocumentVerificationTrace = {
  valid: true,
  items: [
    { label: 'Periode Berlaku', ok: true },
    { label: 'Status Dokumen', ok: true },
    { label: 'Penerbit', ok: true, detail: 'Example University' },
    { label: 'Tanda Tangan (e.id)', ok: true },
  ],
  reasons: [],
};

describe('explain decision', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_EXPLAIN;
    delete process.env.EID_LLM_URL;
    vi.unstubAllGlobals();
  });

  it('template explanation without LLM env', async () => {
    const out = await explainDecision({ trace: okTrace, holder: 'panji@kampus.demo', documentTitle: 'SI Certificate' });
    expect(out.source).toBe('template');
    expect(out.text).toContain('valid');
  });

  it('template explains why invalid', () => {
    const bad: DocumentVerificationTrace = { valid: false, items: [{ label: 'Periode Berlaku', ok: false }], reasons: ['Di luar periode berlaku.'] };
    const t = templateExplain(bad, 'panji@kampus.demo', 'SI Certificate');
    expect(t).toContain('Periode Berlaku');
    expect(t).toContain('TIDAK valid');
  });

  it('uses LLM when enabled and reachable, falls back otherwise', async () => {
    process.env.NEXT_PUBLIC_EXPLAIN = '1';
    process.env.EID_LLM_URL = 'https://llm.example/v1/explain';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ text: 'Semua indikator lolos.' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const out = await explainDecision({ trace: okTrace, holder: 'panji@kampus.demo', documentTitle: 'SI Certificate' });
    expect(out.source).toBe('llm');
    expect(out.text).toBe('Semua indikator lolos.');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('boom', { status: 500 })));
    const fallback = await explainDecision({ trace: okTrace, holder: 'panji@kampus.demo', documentTitle: 'SI Certificate' });
    expect(fallback.source).toBe('template');
  });
});
```

- [ ] **Step D: Run tests to verify pass**

Run: `npm test`
Expected: explain tests pass. Document the framing (deterministic decisions; LLM is a label-maker for the trace only) in the demo README.

- [ ] **Step E: Commit**

```bash
git add -A && git commit -m "feat(explain): LLM-assisted plain-language explanations, off by default"
```

### Task 24 (new): External platform API (B2B2C) — OAuth2 client-credentials + signed webhook

Delivers the spec §19 external integration: a **platform tiket** (loket/tiket-like) creates events and collects payment; **TrustAccess owns e.id KYC, issuance, and check-in.** This builds directly on the Registerable engine (Task 10 + schema). Executes after Task 10 (self-registration) and Task 11 (verify). Optional phase for the demo — only shown if time allows.

**Files:**
- Create: `src/lib/auth/client-credentials.ts` (issue/verify tenant access tokens)
- Create: `src/lib/auth/webhook.ts` (HMAC sign/verify)
- Create: `src/app/api/v1/registerables/route.ts`, `src/app/api/v1/registerables/[id]/route.ts`
- Create: `src/app/api/v1/registrations/route.ts`, `src/app/api/v1/registrations/[id]/route.ts`
- Create: `src/app/api/v1/verify-identity/route.ts` (standalone ID verification → verdict)
- Create: `src/app/api/v1/webhooks/payment/route.ts`, `src/app/api/v1/credentials/[id]/route.ts`
- Create: `src/lib/db/external.ts` (external_apps + registration payment fields)
- Test: `tests/external-api.test.ts`, `tests/external-webhook.test.ts`

- [ ] **Step A: Auth helpers**

`src/lib/auth/client-credentials.ts` — given `client_id` + `client_secret`, look up `external_apps` (hash-comparison on `client_secret_hash`) and return a signed short-lived JWT Bearer with `appId`/`orgId` claims. `GET`/`POST /api/v1/*` middleware parses the Bearer and rejects unknown/inactive apps.

`src/lib/auth/webhook.ts`:

```ts
import { createHmac, timingSafeEqual } from 'crypto';

export function signWebhook(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

export function verifyWebhook(secret: string, body: string, signature: string): boolean {
  if (!signature) return false;
  const a = Buffer.from(signWebhook(secret, body));
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
```

- [ ] **Step B: `src/lib/db/external.ts`**

Insert/lookup rows in `external_apps`; seed one demo app (`loket.com` demo) in `src/lib/db/seed.ts`. Provide `insertExternalApp`, `getExternalAppByClientId`, `markRegistrationPaid(registrationId)` (sets `payment_status='paid'`, then auto-issues the credential by reusing the Task 10 issuance call).

- [ ] **Step C: Routes**

- `POST /api/v1/registerables` (Bearer): create a `registerables` row with `kind='event/external'`, `external_app_id=<appId>`, generate `reg_token`, return `{ id, regToken, qrPayload }`.
- `GET /api/v1/registerables/:id` (Bearer): return quotas/status scoped to its own org.
- `POST /api/v1/registrations` (Bearer): run e.id KYC (reuse Task 10 `insertKyc` → `approved`), record `kyc_ref`, set `payment_status='awaiting_payment'`, store `order_ref` from the platform, return `{ registrationId, status:'awaiting_payment' }`.
- `GET /api/v1/registrations/:id` (Bearer): return `{ status }` (`awaiting_payment` → `issued`).
- `POST /api/v1/verify-identity` (Bearer): run e.id KYC for a given identity and return `{ verified, ref }` verdict without creating a registration — a standalone ID check the platform can call independently.
- `POST /api/v1/webhooks/payment` (signed): verify HMAC via webhook secret of the app that owns the registerable; body `{ registrationId, status:'paid' }` → `markRegistrationPaid` → issue credential to e.id wallet → return `200 { issued: true, credentialId }`. **Reject if signature invalid or status != 'paid'.**
- `GET /api/v1/credentials/:id` (Bearer): return credential metadata for a registration's holder.

- [ ] **Step D: Tests**

`tests/external-api.test.ts`: valid Bearer can create event + registration (`awaiting_payment`); and a standalone `POST /api/v1/verify-identity` returns `{ verified: true, ref }` for a KYC-passing identity (and `verified: false` otherwise); wrong/missing Bearer → 401; unknown app → 401/403. `tests/external-webhook.test.ts`: valid HMAC + `paid` issues a credential (status→`issued`, `credential_id` set); invalid signature → 401 and **no credential issued**; `status:'awaiting_payment'` in callback → ignored.

- [ ] **Step E: Run tests to verify pass**

Run: `npm test`
Expected: external api + webhook tests pass; existing Registerable (Task 10) and verify (Task 11) tests unaffected.

- [ ] **Step F: Commit**

```bash
git add -A && git commit -m "feat(api): external B2B2C API — OAuth2 client-credentials + signed payment webhook"
```

---

## Self-Review

**Spec coverage:**
- OAuth SSO login → Task 8, UI Task 13 ✓
- KYC Gateway self-registration → Task 10, Task 13 ✓
- Issuer API (issue/revoke/auto-issue) → Tasks 9, 10, 6 (fake); generalized document issuance → Task 9 Extension ✓
- Holder API claim → holder page Task 13 + My Credentials portfolio Task 19 (fake mode: issue returns qr directly) ✓
- Verifier API + QR + Presentation → Tasks 11 + 11 Extension (full portfolio) ✓
- Signed-document verification (WHY valid/invalid) → Tasks 17/18 + `/verify/document` screen ✓
- Audit trail (gate + document events + anomalies) → lib/db/audit.ts Task 18, screen Task 20 ✓
- Delegation (host → guest scoped VisitorPass) → data model Task 2, API Task 21 ✓
- Business KPIs (grant rate, active points/credentials, estimated revenue, anomalies) → Task 22 + KpiCards ✓
- Select/LLM explanation of decisions → Task 23, OFF by default (`NEXT_PUBLIC_EXPLAIN` + `EID_LLM_URL`); decisions stay deterministic ✓
- Selective disclosure — noted as optional in spec; fake cleartext equivalent; documented ✓
- Template API (render pass card image) → NOT implemented as image rendering (kept QR-only). Documented in README roadmap as adapter extension.
- Webhook → Task 11 stub ✓
- Gating engine + explainable AI (trace) → Tasks 3/17, wired Tasks 11/14 ✓
- Anomaly detection → Task 4, wired Task 11 + audit Task 20 ✓
- Analytics/forecasting → Task 5, API Task 12, UI Task 15 ✓
- Monetization pay-per-access → Task 10 (payment mock) + revenue in Tasks 12/22 ✓
- Policy library (ONE engine, 6 domains) → data model Task 2, engine Task 17, dashboard Task 15 ✓
- Actuator simulated/ESP32 → Task 7 ✓
- Hardening: no hardware required → simulated default ✓
- Emoji/UI polish → Tailwind dark theme throughout ✓
- External B2B2C API (event by platform tiket, payment by platform, identity/issuance/check-in by TrustAccess) → schema Task 2 + Task 24 (OAuth2 client-credentials + signed webhook) ✓

**Gaps + fixes:** Template API image rendering is listed in README roadmap (out of MVP); MVP keeps QR-based access + issuance.

**Execution order / phase map (see header):** Phase 0 = Tasks 1–8; Phase 1 starts with Task 17 (pure modules) then 9/11 extensions, 18, 13/19, 14, 15, 20; Phase 2 = Tasks 10, 12, 22, then 21; Phase 3 = Task 23. Task 24 (external B2B2C API) = optional Phase 3+, reuses Task 10 issuance + Task 11 verify. Cross-checked: Task 11 route imports `buildGateTrace` (Task 17) — must run after 17; Tasks 18/19/20 import Task 17 modules — ordered after; `seedDemoFailDocuments` needed by scripts/seed.ts (Task 11 Step C) and Task 18's own seed — add at Task 18; `KpiCards` (Task 22) is adopted by the dashboard in the Task 15 extension only after Task 22 lands.

**Type consistency:** `EidClient` (Task 2 types) matches `FakeEidClient` (Task 6 + extension: `listCredentialsForHolder`) and route usage (Tasks 8–10, 18–19) ✓. `DocumentVerificationTrace = { valid, items, reasons }` fixed in Task 2 types; `verifyDocument` (Task 17) returns exactly that shape; Task 18 tests assert on it ✓. `insertIssuedPass(db, row)` is tolerant of missing doc columns (defaults) so older callers (Tasks 9/10) keep working ✓. Engine `evaluateGate(result, rule, localNow)` used in Task 11 with `toOrgLocal` ✓; `buildGateTrace(result, rule, decision, localNow)` mirrors those inputs ✓. `policyGateRule`/`toPolicy` handle the DB snake_case row (`prerequisites` = JSON text) → camelCase `GateRule` (Task 17) ✓. `detectAnomaly(logs)` returns reports with `passId` matching `credential_id` stored on `access_events.pass_id` ✓. `listTariffs`/`getTariff` from `src/lib/db/money.ts` ✓. Tests use a temp FILE db (`./data/test-trustaccess.db`) wherever routes call `getDb()` — `initDb`:memory: is never memoized, so mixing it with route-level `getDb()` yields empty DBs; the Task 11 original test was updated accordingly ✓. Concurrency safety: `vitest.config.ts` sets `fileParallelism: false` so the several test files sharing that DB path run sequentially and never rm/create it concurrently ✓. Room for `IMG`/`ENV` mismatch: none identified. (`computeBusinessKpis` filters "today" by epoch range [org-local midnight, +24h) — timezone-safe at 00:00–07:00 WIB ✓.)

**Plan saved to:** `docs/superpowers/plans/2026-08-29-trustaccess.md`.