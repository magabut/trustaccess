# TrustAccess

Verifier-first credential access platform.

## Quick start

```bash
cd app
npm install
cp .env.local.example .env.local   # isi EID_CLIENT_ID, EID_CLIENT_SECRET, EID_LOGIN_VERIFICATION_ID
npm run dev        # dev server (Next.js 16)
npm test           # run tests (vitest, serial, sqlite)
npm run build      # build produksi (also runs migrations)
npm run seed       # seed demo data (manual, sekali)
```

## Alur login e.id (real mode)

1. Buka `http://localhost/login`
2. Klik **Start QR Login**
3. Scan QR di aplikasi e.id, lalu **approve**
4. Klik **Check now** → akan redirect ke `/dashboard` jika `approved: true`

## Dashboard

Menampilkan statistik ringkas:
- **Total users** (dari tabel `users`)
- **Total check-in events** (dari tabel `access_events`)
- **Total granted check-in** (dengan verdict `GRANT`)

## Alur autentikasi

- `POST /api/verifier/login/start` → mengembalikan `sessionId` + `oauthUrl`
- User scan QR di wallet e.id, approve
- `POST /api/verifier/login/result` dengan `sessionId` → `approved: true` → login sukses, session dibuat, redirect ke `/dashboard`

## Konfigurasi env (`app/.env.local.example`)

```env
EID_FAKE=0
EID_CLIENT_ID=eid-d9vui3N9qAd34TGH1pVHxEoKylrn
EID_CLIENT_SECRET=eidkey-XKjsuCL4imAbm3YybturEmvsIDhnf698fukKzFzAMR7r1x135bOiWEwbn
EID_VERIFIER_BASE_URL=https://gateway.e.id
EID_BASE_URL=https://api-wallet.e.id
EID_LOGIN_VERIFICATION_ID=<valid-verification-id>
DOMAIN=localhost
SESSION_SECRET=<rahasia-kuat>
POSTGRES_DB=trustaccess
POSTGRES_USER=trustaccess
POSTGRES_PASSWORD=<password-kuat>
DATABASE_URL=postgresql://trustaccess:<password>@postgres:5432/trustaccess
```

## Alur development

```bash
# 1. Jalankan stack Docker
docker compose --env-file .env.production up -d --build

# 2. Buka browser ke http://localhost/login
# 3. Start QR Login, scan + approve di wallet e.id
# 4. Klik Check now → redirect ke /dashboard

# 5. Tes backup/restore
docker compose --env-file .env.production exec -T postgres pg_dump ...
```

## Catatan penting

- `better-sqlite3` masih runtime dependency (akan di-remove di checkpoint akhir)
- `npm run build` membutuhkan `python3 make g++` di stage Builder untuk native module
- `EID_FAKE=1` untuk development cepat tanpa kredensial e.id
- `docker compose down -v` akan menghapus data PostgreSQL; gunakan `docker compose down` untuk menjaga data
- `scripts/backup-postgres.sh` membuat dump otomatis ke folder `backups/`
- Jadwal test: `vitest run` serial (`fileParallelism: false`, `maxWorkers: 1`)

## Struktur repo

- `app/` — Aplikasi Next.js 16 + TypeScript (source code utama)
- `docker/` — Dockerfile, docker-compose.yml, Caddyfile
- `docs/` — Desain teknis, panduan deploy, panduan backup
- `scripts/` — Migrasi DB, script backup
- `tests/` — Test suite Vitest (serial, tidak paralel)
- `app/AGENTS.md` — Instruksi untuk agent
- `app/.env.local.example` — Contoh env (jangan commit!)
<tool_call>
<function=bash>
<parameter=command>
rtk git -C .worktrees/docker-postgresql-vps add README.md && rtk git -C .worktrees/docker-postgresql-vps commit -m "docs: add README"