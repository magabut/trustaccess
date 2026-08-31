# TrustAccess

Trusted Credential & Access Infrastructure by e.id

## Quick start

```bash
npm install
cp .env.local.example .env.local   # edit if using real e.id
npm run dev
```

Login via `/login` → use any email for demo.

## Demo flow

1. Login (e.id mock)
2. Go to Gate Verifier → paste JSON credential → verify → GRANT/DENY + trace
3. Holder credentials view
4. Admin → Audit Trail
5. Revenue / Stats stub

## Architecture

- One policy engine (`src/lib/engine/gating.ts`)
- e.id adapter (`src/lib/eid/client.ts`) — Fake + Real
- SQLite via better-sqlite3
- Pure modules: anomaly, stats, document verify, credential service

## License

Internal hackathon build.
