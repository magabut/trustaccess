# VerifyPass — Access Control Platform by e.id

**Status:** Draft — menunggu review
**Tanggal:** 2026-08-29
**Konteks:** Hackathon vibecoding 1 hari. Kriteria juri: **kelayakan bisnis / monetisasi / solusi problem nyata**.

---

## 1. Ringkasan

VerifyPass adalah **platform akses fisik berbasis Verifiable Credential (VC)** yang dibangun di atas e.id. e.id adalah fondasi *trust* (identitas, credential, verifikasi kriptografis); VerifyPass menambahkan layer nilai bisnis di atasnya: **decision/gating engine, anomaly detection, analytics & forecasting, dan monetisasi pay-per-access** di gerbang.

Prinsip produk: *apa pun yang perlu dibuktikan orang (akses, pembayaran, pemesanan, kehadiran) diterbitkan sebagai VC tersign yang bisa diverifikasi kapan pun, dengan masa berlaku dan recall.*

## 2. Problem & Nilai Bisnis

**Problem nyata:**
- Pengelola gedung/kampus/event/mall/residence masih pakai ID card print, daftar tamu manual, dan verifikasi yang lambat serta rawan pemalsuan.
- Tidak ada jejak audit siap audit; monetisasi di gerbang dilakukan manual (kas fisik).
- Verifikasi identitas tamu baru (KYC) tidak otomatis.

**Solusi:**
- Verifikasi kriptografis di gate < 2 detik via QR tanpa menyimpan data pribadi berlebih (selective disclosure).
- Pass terbit/revoke instan (Issuer API), termasuk masa berlaku (nbf/exp).
- Audit trail lengkap (siapa masuk ke mana, kapan, hasilnya).
- Pay-per-access di frontdoor: tamu bayar → auto-issue pass.
- AI di atas kepercayaan: gating prasyarat, deteksi anomali, analytics + forecast.

**Siapa yang bayar (monetisasi):**
- **B2C:** tamu/pengunjung membayar per akses (day-pass, sewa locker, area tertentu) via QRIS (mock di MVP, siap Midtrans/Xendit).
- **B2B:** pengelola gedung/kampus/event membayar **SaaS per-gate/bulan** + platform mengambil komisi/fee transaksi.
- Dashboard revenue analytics memperlihatkan aliran uang per gate/area/hari.

## 3. Kemampuan e.id yang Dipakai

| Capability e.id | Penggunaan di VerifyPass |
|---|---|
| OAuth SSO | Login app (admin, operator gate, host/member). App tidak menyimpan password. |
| KYC Gateway (Privy/VIDA) | Self-registration tamu: validasi identitas asli sebelum pass terbit. |
| Issuer API | Terbitkan Access/Receipt/Booking VC + auto-issuance + revocation. |
| Holder API | Claim pass di halaman holder / wallet. |
| Verifier API | Pemeriksaan gate/locker: Presentation Request/Result, QR verification. |
| Template API | Render Pass Card / Sertifikat Akses menjadi gambar dengan data tervalidasi. |
| Webhook | Hasil verifikasi & hasil KYC real-time ke aplikasi. |

## 4. Arsitektur

Stack: **Next.js fullstack (single app) + TypeScript + Postgres** (SQLite fallback untuk kecepatan MVP). Deploy satu tempat (Vercel/Railway). JS untuk visualisasi analytics.

**Komponen terisolasi:**
- `lib/eid/*` — klien e.id terpusat (issuer, verifier, oauth, kyc, template, webhook handler). *Satu-satunya modul yang tahu e.id;* di sandbox/dev diganti fake adapter dengan format identik.
- `lib/engine/gating.ts` — pure function keputusan akses (GRANT/DENY + reason list). Tanpa network; unit-test penuh.
- `lib/engine/anomaly.ts` — pure function skor anomali (baseline bergerak + std dev).
- `lib/engine/stats.ts` — aggregasi + forecasting (linear regression/moving average). Pure.
- `lib/actuator/*` — `ActuatorProvider`: `SimulatedActuator` (default demo) & `Esp32Actuator` (opsional, HTTP/WebSocket lokal).
- `lib/db/*` — schema + seed data demo realistik (kampus).

**Permukaan UI:**
1. **Admin Console** — kelola org/area/gate/rule/tarif; issue/revoke pass; audit log; analytics; alert anomali.
2. **Gate Verifier Screen** (`/gate/:id`) — scanner QR → e.id Verifier → engine → hijau/merah + alasan; tombol buka locker.
3. **Holder Pass Page** (`/holder/:passId`) — pas tampil + QR untuk discan.
4. **Self-registration** (`/register`) — daftar → KYC → pilih tarif → bayar (mock) → auto-issue.

## 5. Data Model

- `Organization` — multi-tenant: nama, zona waktu, mata uang, konfigurasi e.id.
- `User` — admin/operator/host; terhubung ke subjek OAuth SSO e.id (bukan password lokal).
- `Area` — pengelompokan akses.
- `AccessPoint` — target fisik: tipe `gate | locker | room`.
- `AccessRule` — inti gating per area/point: credential wajib + **prasyarat credential** (list jeniss), jam operasional, rentang valid, tarif opsional.
- `Tariff`/`Plan` — pricing day-pass, per-area, locker-rent, bulanan.
- `CredentialTemplate` — peta ke e.id Document Schema (fullName, area, validFrom, validUntil, dll).
- `IssuedPass` — cermin VC: credentialId e.id, holder, template, rule, status `active|revoked|expired`, sumber `admin|self|delegated`, hostRef.
- `AccessEvent` — tiap verifikasi: accessPoint, verdict `GRANT|DENY`, reason[], credential, holder, waktu, tipe aksi, hasil aktuator.
- `Payment` — order, tariff, nominal, metode (mock), status, receiptCredentialId.
- `KYCRequest` — referensi gateway, provider, status.
- `AnomalyAlert` — hasil deteksi.
- `Delegation` — host → guest pass (child credential terbatas).

## 6. AI Engine (3 Lapis, Explainable)

Framing jujur: **rule engine deterministik + scoring statistik + LLM opsional untuk narasi**. Tidak overclaim deep learning.

1. **Gating engine (deterministik + skor 0–100):**
   Input hasil verifikasi e.id + rule + waktu saat ini.
   Cek berurutan: jenis credential sesuai? → prasyarat credential lain dipenuhi? → rentang valid & jam operasi ok? → scope area ok? → tidak revoked?
   Output `GRANT`/`DENY` + `reason[]` eksplisit, mis. *"Ditolak: prasyarat 'Safety Induction' tidak dimiliki."*

2. **Anomaly detection (statistik):**
   Baseline bergerak per credential (jam tipikal, gate tipikal) → deviasi: pass dipakai di gate lain, di luar jam, DENY-retry pendek, pola delegasi aneh → skor > ambang → `AnomalyAlert` + notifikasi admin.

3. **Analytics & forecasting (statistik):**
   Agregasi volume pengunjung, titik/dan jam terpadat, revenue per gate/area/hari, tingkat aktivasi pass. Forecast linear regression/moving-average untuk esok.
   LLM opsional (dapat dimatikan) untuk ringkasan bahasa alami alert: *"3 penolakan di Gardu B jam 09:40 karena Safety Induction kedaluwarsa."*

## 7. Flow Utama

1. **Onboarding:** admin login via e.id SSO → setup org, area, gate, rule, tarif.
2. **Issue manual:** admin/host terbitkan Access Credential → holder claim di halamannya.
3. **Self-serve:** tamu `/register` → KYC Gateway → pilih tarif → bayar (mock) → auto-issue Access VC (validFrom/validUntil).
4. **Delegasi:** host mengundang tamu → sistem terbitkan child credential (nama + hostRef + area/waktu terbatas) → tamu claim.
5. **Gate/Locker:** holder pindai QR → Verifier API (Presentation Result) → gating engine → GRANT/DENY + alasan → `ActuatorProvider` (simulasi animasi / ESP32) → `AccessEvent` + webhook.
6. **Backend:** aggregasi analytics, alert anomali, forecasting; pembayaran menghasilkan Receipt VC tersign.

## 8. Endpoint / Route

- Auth: `/api/auth/eid` (OAuth SSO callback), session.
- Admin: CRUD `/api/admin/organizations`, `/areas`, `/access-points`, `/rules`, `/tariffs`, `.../passes` (issue/revoke).
- Self-serve: `/register`, `/api/register` (KYC → payment mock → auto-issue).
- Gate: `/gate/:id`, `/api/verify` (payload QR → e.id verifier → engine → result + aksi).
- Webhooks: `/api/webhooks/eid/verification`, `/api/webhooks/eid/kyc`.
- Analytics: `/api/stats/*`.
- Holder: `/holder/:passId`.
- Aktuator: `/api/actuate` (internal, dipanggil engine saat GRANT).

## 9. Demo Script (~5–7 menit, tanpa hardware)

Cerita: kampus dengan 3 area (Ruang Umum, Lab, Parkir) + locker.

1. Login admin via **e.id SSO** → buat area & gate, set rule: Lab butuh prasyarat "Safety Induction".
2. Self-serve: tamu daftar → **KYC (mock)** → pilih day-pass → bayar (mock) → **auto-issue Access VC** muncul di holder page.
3. Gate: scan QR → **GRANT (hijau)** + alasan. Log tercatat.
4. Locker: dalam area → UNLOCK locker (simulasi/animasi).
5. Gagal: coba masuk Lab tanpa "Safety Induction" → **DENY (merah)** + alasan jelas.
6. Kadaluarsa: pass habis masa → DENY.
7. **Delegasi:** host mengundang tamu → tamu masuk sebagai guest dengan pass terbatas.
8. Dashboard: **analytics** (volume, jam sibuk) + **anomaly alert** (pass dipakai di gate tidak biasa) + **revenue per gate**.

## 10. Kejujuran Teknologi (Anti-Overclaim)

- "AI" pada materi demo = rule chain + statistik + LLM narasi opsional. Siap dinilai teknis.
- Payment adalah **mock**; flag bahwa integrasi Midtrans/Xendit siap di-produksi.
- Jika sandbox e.id tidak tersedia saat build: dipakai **fake adapter** dengan format respons identik (dokumentasikan saat demo sebagai "mode sandbox").
- Hardware (ESP32) **tidak wajib** — `ActuatorProvider` di-abstraksi. Demo berjalan penuh dengan simulasi.

## 11. Sukses-Kriteria

- Demo end-to-end jalan tanpa hardware.
- Setiap keputusan gate punya alasan terbaca (GRANT/DENY + reason).
- Unit test engine lulus: GRANT/DENY, prasyarat, kedaluwarsa, anomali, stats.
- Revenue analytics tampak di dashboard.
- Hampir semua capability e.id terpajang (SSO, KYC, issuer, holder, verifier, template, webhook).

## 12. Risiko & Mitigasi

- **Sandbox e.id tidak tersedia** → fake adapter, dokumentasikan.
- **Over-scope** → MVP terkunci pada daftar fitur di spec ini; tambahan hanya jika waktu sisa.
- **Demo gagal hardware** → none, karena hardware opsional.

## 13. Di Luar Scope (MVP 1 Hari)

- Integrasi hardware ESP32 (opsional, hanya bila stabil).
- Payment riil (Midtrans/Xendit).
- Integrasi gerbang/aktuator komersial.
- OTP email/SMS; notifikasi push; multi-bahasa.
- Full SSO tenant management enterprise.

## 14. Stack Ringkas

Next.js (App Router) + TypeScript · Prisma/Drizzle + Postgres/SQLite · Tailwind · Recharts/ApexCharts · `qrcode` untuk QR · `jsonwebtoken` untuk parse VC (bila perlu) · konfigurasi environment variables untuk e.id sandbox keys.