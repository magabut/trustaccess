# TrustAccess — Trusted Credential & Access Infrastructure by e.id

**Status:** Draft — menunggu review
**Tanggal:** 2026-08-29 (diperbarui 2026-08-30)
**Konteks:** Hackathon vibecoding 1 hari. Kriteria juri: **kelayakan bisnis / monetisasi / solusi problem nyata**.

---

## 1. Ringkasan

TrustAccess adalah **Trusted Credential & Access Infrastructure** yang dibangun di atas e.id.

> TrustAccess mengubah kredensial digital tepercaya menjadi **dokumen yang terverifikasi**, **izin yang dapat dieksekusi**, dan **keputusan akses di dunia nyata**.

TrustAccess BUKAN sekadar QR scanner atau aplikasi locker. Locker/gate hanyalah *satu* demonstrasi fisik dari platform.

Prinsip produk: *apa pun yang perlu dibuktikan orang (akses, pembayaran, pemesanan, kehadiran) diterbitkan sebagai kredensial tersign yang bisa diverifikasi kapan pun, dengan masa berlaku dan recall.*

**Core story:**

```
IDENTITY → CREDENTIAL → TRUST → POLICY → PERMISSION → ACTION
```

**One trust engine, many real-world permissions.**

## 2. Posisi Produk

Produk dipahami sebagai pipeline tunggal:

```
Identity
  ↓
Verifiable Credential
  ↓
Signed Digital Document / Credential
  ↓
TrustAccess Policy Engine
  ↓
Permission / Entitlement
  ↓
Decision
  ↓
GRANT / DENY
  ↓
Physical or Digital Action
```

Contoh nyata:

```
Student Identity
  ↓
Student Credential
  ↓
Safety Induction Certificate (Signed Digital Document)
  ↓
Laboratory Access Policy
  ↓
Check credentials + validity + scope + prerequisites
  ↓
GRANT
  ↓
Open Laboratory / Locker / Gate
```

### 2.1 Batas Tanggung Jawab

| Layer | Pemilik | Tanggung jawab |
|---|---|---|
| **Trust layer** | **e.id** | identitas, verifiable credential, verifikasi kriptografis, issuer, holder, verifier |
| **Application/business layer** | **TrustAccess** | manajemen kredensial, generasi dokumen, policy engine, keputusan akses, delegasi, audit trail, analytics, anomaly detection, integrasi akses fisik/digital |

TrustAccess **tidak pernah mengklaim menandatangani dokumen secara kriptografis**. Signing dilakukan oleh e.id sebagai fondasi trust; TrustAccess **meminta issuance melalui e.id Issuer API** dan memakai hasil verifikasi e.id.

### 2.2 Model Inti — 6 Pertanyaan

Setiap evaluasi akses harus menjawab dengan jelas:

1. **WHO IS THE HOLDER?**
2. **WHAT VERIFIED CREDENTIALS DOES THE HOLDER HAVE?**
3. **WHAT DOES THE HOLDER WANT TO DO?**
4. **WHAT POLICY APPLIES?**
5. **IS THE HOLDER AUTHORIZED?**
6. **WHY was access granted or denied?**

### 2.3 Peran Pengguna — Bukan "Pengguna = Holder"

Konsep kunci: **satu orang bisa memegang banyak peran sekaligus**. Jangan mendesain `User = Holder`.

| Peran | Tanggung jawab | Contoh |
|---|---|---|
| **Holder** | Menerima & menyimpan credential, menunjukkan credential, menerima delegated access | Mahasiswa (Panji) menyimpan Student/Safety/Parking permit |
| **Issuer** | Menerbitkan credential / dokumen tersign | Universitas, trainer, freelancer, komunitas |
| **Verifier** | Memverifikasi kevalidan credential ("apakah credential ini valid?") | HR yang menerima sertifikat kandidat |
| **Administrator** | Mengelola org, access points, policy, audit, analitik | Admin gedung/kampus |

Contoh nyata multi-peran:

```
Panji (individu)          → Holder
Universitas XYZ           → Issuer · Verifier · Administrator
Panji (sebagai trainer)   → Holder · Issuer
```

Penting untuk arsitektur: peran **bukan** tipe user tetap, melainkan **kemampuan yang bisa dikombinasikan** pada akun yang sama. Ini membuka use case `Individual → Issuer → Holder` di samping `Organization → Holder`.

### 2.4 Tiga Sisi Produk

TrustAccess bukan hanya untuk organisasi. Tiga sisi produk yang saling memperkuat (network effect):

| Sisi | Nama | Pengguna | Fungsi inti |
|---|---|---|---|
| 🧑 **Personal** | TrustAccess Personal | Perorangan / holder | claim & simpan credential, tunjukkan credential, buktikan sertifikasi, event pass, membership, permit, menerima delegated access |
| 🏢 **Business** | TrustAccess Business | Organisasi (issuer/administrator) | terbitkan credential, buat policy, manage access point, manage verifier, delegation, audit, analytics, revenue |
| 🔍 **Verify** | TrustAccess Verify | Pihak yang hanya perlu verifikasi | "Apakah credential ini valid?" — scan QR → status valid/issuer/holder/expiry |

Alur Verify (contoh HR):

```
SCAN QR → TrustAccess Verify → e.id Verification →
  ✓ VERIFIED
  Safety Certification
  Holder: {nama} · Issuer: XYZ Training
  Status: ACTIVE · Valid Until: 2027
```

Monetisasi utama tetap **B2B Business** (paling jelas), sedangkan **Personal** adalah holder yang membentuk network effect, dan **Verify** membuka kebutuhan verifikasi lintas pihak.

> Cerita utama untuk hackathon: **Organization → Issue Credential → Individual → Present Credential → TrustAccess Policy → Access**.

## 3. Problem & Nilai Bisnis

**Problem nyata:**
- Organisasi masih bergantung pada ID card fisik, dokumen yang dicek manual, dan sistem akses yang terputus satu sama lain (paper cert ≠ access system).
- Tidak ada jejak audit yang siap audit; monetisasi di gerbang dilakukan manual (kas fisik).
- Verifikasi identitas tamu baru (KYC) tidak otomatis.

**Solusi:**
- Kredensial digital tersign (identitas, sertifikat, izin) terverifikasi kriptografis di gate/dokumen < 2 detik via QR.
- Dokumen terverifikasi dan izin akses lahir dari **kredensial yang sama** — sertifikat induksi keselamatan otomatis menjadi prasyarat akses lab.
- Pass terbit/revoke instan (Issuer API), termasuk masa berlaku (nbf/exp).
- Audit trail lengkap (siapa punya kredensial apa, masuk ke mana, kapan, kenapa).
- Pay-per-access di frontdoor: tamu bayar → auto-issue pass.

**Siapa yang bayar (monetisasi):**
- **B2B SaaS:** pengelola gedung/kampus/event/mall/residence membayar **per-gate/per-bulan** + komisi/fee transaksi.
- **Transaction:** pay-per-access (day-pass, sewa locker, area tertentu) & pay-per-verification via QRIS (mock di MVP, siap Midtrans/Xendit).
- **Credential issuance:** fee issuer/layanan penerbitan dokumen — termasuk **perorangan sebagai issuer** (trainer, freelancer, komunitas), bukan hanya organisasi.
- **Individual → issuer:** membuka alur `Individual → Issuer → Holder` yang menambah cakupan pasar.
- **Enterprise:** custom deployment & integrasi.
- Dashboard revenue memperlihatkan aliran uang per gate/area/hari (data demo diberi label jelas).

## 4. Kemampuan e.id yang Dipakai

| Capability e.id | Penggunaan di TrustAccess |
|---|---|
| OAuth SSO | Login app (admin, operator gate, host/member). App tidak menyimpan password. |
| KYC Gateway (Privy/VIDA) | Self-registration tamu: validasi identitas asli sebelum pass terbit. |
| Issuer API | Terbitkan Access/Receipt/Booking VC + dokumen/kredensial (sertifikat, induksi, kartu mahasiswa/karyawan) + auto-issuance + revocation. |
| Holder API | Claim kredensial/dokumen di halaman holder / wallet. |
| Verifier API | Pemeriksaan gate/locker + verifikasi dokumen: Presentation Request/Result, QR verification. |
| Template API | Render Dokumen/Sertifikat terverifikasi menjadi gambar dengan data tervalidasi. |
| Webhook | Hasil verifikasi & hasil KYC real-time ke aplikasi. |

## 5. Signed Digital Document / Verifiable Credential

Konsep kelas-utama: **Signed Digital Documents / Verifiable Credentials**.

Contoh tipe dokumen:
- Certificate
- Training Certificate
- Safety Induction Certificate
- Student Credential
- Employee Credential
- Parking Permit
- Event Pass
- Membership Credential
- Visitor Pass
- License / Certification
- Access Pass
- Receipt / Proof of Purchase

**Prinsip:** TrustAccess **meminta issuance dari e.id** dan menggunakan e.id sebagai infrastruktur trust/kredensial. TrustAccess tidak mengklaim menandatangani dokumen sendiri.

Contoh dokumen (Safety Induction Certificate):

```
SAFETY INDUCTION CERTIFICATE

Holder:            Panji Bawono
Course:            Laboratory Safety Induction
Issued:            29 Aug 2026
Valid Until:       29 Aug 2027
Issuer:            Example University
Status:            ✓ ACTIVE
Verification:      ✓ VERIFIED BY e.id
```

Termasuk QR / mekanisme verifikasi sesuai konteks.

## 6. Document Issuance Flow

Alur demo yang jelas:

```
Admin / Issuer
  ↓
Create Credential / Document
  ↓
Select holder
  ↓
Enter credential data
  ↓
Request issuance through e.id Issuer API
  ↓
Credential becomes signed/verifiable
  ↓
Holder receives / claims credential
  ↓
Credential appears in Holder view
  ↓
Credential can be presented / verified
```

## 7. Document Verification Screen

Route: `/verify/document`. Verifier bisa memindai atau men-submit QR kredensial/dokumen.

Tampilkan:

```
DOCUMENT VERIFIED
✓ Signature valid
✓ Issuer verified
✓ Holder verified
✓ Credential active
✓ Not expired
✓ Not revoked
```

Tampilkan hanya informasi minimum yang diperlukan.

Status jelas:

- **GREEN: VERIFIED**
- **RED: INVALID / REVOKED / EXPIRED**

UI harus menjelaskan **mengapa** gagal:

```
❌ Credential expired
Expired on: 27 Aug 2026
```

atau:

```
❌ Credential revoked
Revoked by issuer: Example University
```

## 8. Policy Engine

Mesin kebijakan **deterministik**. **Jangan gunakan LLM untuk keputusan otorisasi.**

```
evaluateGate(credentials[], rule, now)

returns {
  verdict: "GRANT" | "DENY",
  usedPassId?,
  reason[],
  passChecks[]
}
```

Pisahkan:

- `resolveMainPass()`
- `checkPrerequisites()`

Sistem mengevaluasi **SELURUH PORTFOLIO kredensial aktif milik holder**.

> Kredensial prasyarat boleh berbeda dari kredensial akses utama.
>
> Contoh: Credential A = Laboratory Access; Credential B = Safety Induction. Holder hanya boleh masuk jika **keduanya** valid.

**Dokumen terhubung ke kebijakan akses.** Dokumen tersign BUKAN sekadar PDF/sertifikat; ia bisa menjadi **prasyarat otorisasi**:

```
LABORATORY ACCESS

Required credentials:
  ✓ Student Credential
  ✓ Laboratory Access
  ✓ Safety Induction

Operating hours:  07:00–18:00
Area:             Laboratory
Action:           GRANT ACCESS
```

## 9. "WHY DENIED?" — Fitur Kelas Utama

Setiap keputusan DENY harus dapat dijelaskan:

```
ACCESS DENIED — Laboratory

Identity            ✓ VERIFIED
Student Credential  ✓ VALID
Laboratory Access   ✓ VALID
Safety Induction    ✕

Reason:
Safety Induction expired on 27 Aug 2026.

Required action:
Renew Safety Induction.
```

Jangan menampilkan sekadar "Access Denied." Buat trace keputusan terlihat:

```
Verification Trace

Identity            ✓
Signature           ✓
Credential Status   ✓
Area Scope          ✓
Validity            ✓
Prerequisite #1     ✓
Prerequisite #2     ✕
FINAL DECISION: DENY
```

## 10. Use Case Domains — Satu Mesin, Banyak Izin

Semua domain adalah **konfigurasi/contoh dari mesin yang sama**, bukan fitur terpisah.

| Domain | Kredensial (contoh) | Akses |
|---|---|---|
| Campus (demo utama) | Student Credential + Safety Induction | Laboratory / Locker / Gate |
| Office | Employee Credential + Security Clearance | Office / Server Room |
| Event | Event Ticket + VIP Credential | VIP Area |
| Parking | Parking Credential | Parking Gate |
| Residence | Resident Credential + Visitor Delegation | Building / Room |
| Industrial | Worker Credential + Safety Training + Machine Certification | Restricted Machine Area |
| Education | Student Credential + Safety Induction | Laboratory |

Pesan produk:

> **Satu mesin trust, banyak izin dunia nyata.**
> TrustAccess tidak hanya memverifikasi siapa Anda — ia memverifikasi **apa yang berhak Anda lakukan**.

## 11. Delegasi (Dipertahankan)

Host → guest tetap jadi konsep kelas utama.

```
Host:     Panji
Guest:    Budi
Permission:
  Area:   Meeting Room A
  Valid:  14:00–17:00
```

Sistem menerbitkan kredensial terbatas (child credential).

Pada verifikasi:

```
✓ Guest identity
✓ Delegation valid
✓ Host relationship valid
✓ Area scope valid
✓ Time valid
→ GRANT
```

## 12. Holder Experience — "My Credentials"

Tampilan bersih portofolio holder:

```
MY CREDENTIALS

🎓 Student Credential     ✓ Verified  · Valid until 2027
🦺 Safety Induction       ✓ Verified  · Valid until 2027
🔬 Laboratory Access      ✓ Verified  · Valid until 2027
🚗 Parking Permit         ✓ Verified
```

Untuk setiap kredensial: View, QR / Present, status verifikasi, masa berlaku, issuer, status revoke.

**Jangan mengekspos data pribadi yang tidak perlu.**

## 13. Admin Experience

Dashboard fokus pada **nilai bisnis**:

```
Active Credentials     · Today's Access     · Grant Rate
Denied Attempts        · Active Access Points · Revenue
```

Live Access:

```
🟢 Laboratory A   Panji  GRANTED
🔴 Laboratory B   Budi   DENIED — Safety Induction expired
🟢 Locker 12      Andi   GRANTED
```

## 14. Audit Trail

Setiap verifikasi menghasilkan `AccessEvent`:

- holder
- credential
- access point
- policy
- verdict
- reasons
- timestamp
- actuator result
- usedPassId

Audit view:

```
VERIFICATION TRACE — 29 Aug 2026 14:32

Holder:            Panji Bawono
Access Point:      Laboratory A
Decision:          GRANTED
Credentials evaluated:
  Student ✓
  Lab Access ✓
  Safety Induction ✓
Action:            Door / Locker UNLOCKED
```

## 15. Anomaly Detection

Tetap **statistik & explainable**:

- repeated DENY attempts
- unusual gate usage
- unusual access time
- credential suddenly used at another location
- suspicious delegation pattern

Alert contoh:

```
⚠ ANOMALY DETECTED
7 denied attempts
Gate: Laboratory B
Period: 10 minutes
Primary reason: Safety Induction missing
```

Ini adalah **operational intelligence**, BUKAN mekanisme otorisasi.

## 16. AI Positioning — Jujur

JANGAN klaim "AI memutuskan siapa boleh masuk."

- **Authorization:** Deterministic Policy Engine.
- **Anomaly Detection:** Statistical analysis.
- **AI / LLM (opsional):** Penjelasan bahasa alami + ringkasan operasional.

Contoh LLM (opsional, dapat dimatikan):

> "Three access attempts were denied at Laboratory B because the required Safety Induction credential had expired."

Keputusan GRANT/DENY **wajib deterministik**.

## 17. Monetization

Terlihat di produk dengan data demo berlabel.

### Business model

Model monetisasi mengikuti **tiga sisi produk**:

| Sisi | Model | Payer |
|---|---|---|
| **Personal** | **Freemium / gratis** (network effect) | perorangan (holder) — akuisisi, bukan revenue |
| **Business** | **B2B SaaS** per access point / gate / bulan + credential issuance fee | organisasi (issuer/administrator) — revenue utama |
| **Verify** | **Transaction / per-verifikasi** (pay-per-check) | pihak ketiga yang verifikasi credential |

Pendukung:
- **B2B SaaS** — per access point / gate / bulan.
- **Transaction** — pay-per-access & pay-per-verification.
- **Credential issuance** — potensi issuer/service fee (termasuk perorangan sebagai issuer: trainer/freelancer/komunitas).
- **Enterprise** — custom deployment & integration.

Contoh dashboard:

```
REVENUE
Today's Access       1,284
Paid Access            842
Transaction Revenue   Rp 1.240.000
Monthly Active Gates    12
Estimated MRR         Rp 18.000.000
```

Gunakan data demo/simulasi yang diberi label jelas. Jangan menyiratkan integrasi pembayaran riil jika MVP hanya memakai mock payment.

## 18. Pendaftaran Generik (Registerable)

Satu mesin pendaftaran yang sama menangani **semua hal yang bisa didaftarkan** — ruangan, event/konser, kegiatan/training, membership, permit — bukan fitur per-jenis. Konsisten dengan prinsip "one trust engine, many real-world permissions".

### Konsep

Organisasi membuat **Registerable** (satu entitas generik dengan `kind`). Setiap Registerable punya **QR pendaftaran unik**. Siapa pun (tamu umum, tanpa akun organisasi) memindai QR → daftar langsung → dapat credential/tiket yang masuk dompet e.id.

### Alur pendaftaran (umum, termasuk event/ruangan/kegiatan)

```
Org membuat Registerable (room / event / activity / membership / permit)
   ↓
System generate QR pendaftaran unik per Registerable
   ↓
ORANG scan QR → halaman pendaftaran
   ↓
e.id KYC (identitas terverifikasi — "didaftarkan langsung dengan e.id")
   ↓
[ berbayar ] → bayar mock (QRIS demo) → next
[ gratis   ] → next (lewati pembayaran)
   ↓
Credential / tiket / permit diterbitkan (via Issuer API e.id) ke dompet
   ↓
Cek masuk / check-in via QR → TrustAccess policy → GRANT / DENY
```

### Pendaftaran via scan di aplikasi e.id Identity Wallet

QR pendaftaran adalah **universal / deep link** (`https://trustaccess.id/r/:token`), bukan semata teks. Pemindaian bisa dilakukan langsung dari konteks **aplikasi e.id Identity Wallet** (wallet holder resmi e.id: *"Verified Once, Trusted Everywhere"*, blockchain-secured):

1. Holder memindai QR pendaftaran (kamera / Identity Wallet).
2. Deep link terbuka ke **halaman pendaftaran TrustAccess**.
3. Karena Identity Wallet sudah terautentikasi, mekanisme **e.id OAuth/SSO + KYC** mengidentifikasi si pendaftar **tanpa isi form ulang**.
4. Berbayar? → bayar (mock) → next; gratis → next.
5. Kredensial/tiket **terbit otomatis ke dompet e.id (Identity Wallet)**.
6. **Check-in**: holder buka Identity Wallet → tampilkan QR tiket → penjaga scan → `GRANT`/`DENY` (TrustAccess).

**Catatan integrasi:** Varian ini (deep link + verifikasi e.id) **pasti bisa** tanpa akses internal wallet; wallet e.id dipakai untuk sign-in/KYC serta sebagai dompet kredensial. *Verifiable presentation* yang dibaca langsung oleh wallet (QR dibaca oleh Identity Wallet dan hasilnya dikirim ke TrustAccess) menjadi **roadmap** bila API/SDK wallet e.id tersedia — di luar kendali kita (fitur wallet milik PT Ekosistim Indo Digital).

### Percabangan pendaftaran

| Registerable `kind` | Contoh | Credential terbit | Cek masuk |
|---|---|---|---|
| `room` / area | Lab, ruang server, gedung | AccessPass / permit | gate / door / room scan |
| `event` / konser | konser, seminar, workshop | EventTicket (+ VIP) | check-in venue / VIP area |
| `activity` | training, kursus, kelas | Certificate / attendance | kehadiran |
| `membership` | gym, club, residensial | MemberCredential | ghate / member area |

### Boundary e.id (konsisten)

- **e.id** = identity (SSO), KYC, issuance, holder/wallet, verification, template, webhook.
- **TrustAccess** = entitas Registerable, QR pendaftaran, alur KYC→pembayaran→penerbitan, policy check-in, dashboard, audit.
- "Didaftarkan langsung dengan e.id" berarti **e.id KYC mengautentikasi si pendaftar** dan **Issuer API menerbitkan credential**; keputusan pendaftaran & akses ada di TrustAccess.

## 19. Integrasi Eksternal — API untuk Platform Tiket (B2B2C)

TrustAccess juga diekspos sebagai **backend-as-a-service** agar platform tiketing eksternal (mis. loket.com, tiket.com) bisa membuat event, memungut pembayaran, dan *menyerahkan verifikasi identitas, penerbitan kredensial, serta check-in ke TrustAccess*. Ini **memakai kembali mesin Registerable** (§18) — hanya alur pembayaran digeser ke callback eksternal + auth tenant OAuth2.

### Pemisahan peran

| Pemilik | Peran |
|---|---|
| **Platform eksternal** (loket/tiket) | bikin event, kelola kuota, memungut **pembayaran** dengan sistem checkout-nya sendiri |
| **TrustAccess** | e.id KYC, terbit **kredensial terverifikasi** ke dompet e.id, policy **check-in** (GRANT/DENY), audit |
| **e.id** | infra identitas/KYC/issuance/wallet/verification (satu adapter `lib/eid/*`) |

### Alur (pembayaran eksternal)

```
Platform eksternal daftar sbg aplikasi → Client ID+Secret (OAuth2) + Webhook secret
   ↓
POST /api/v1/registerables  → TrustAccess bentuk Registerable (kind: event/external)
   ↓
Checkout di platform: POST /api/v1/registrations { orderId } → TrustAccess jalankan e.id KYC
   → balas registrationId status=awaiting_payment
   ↓
Platform bayar sendiri (checkout platform) → kirim callback SIGNED
   POST /api/v1/webhooks/payment { registrationId, status: paid }
   ↓
TrustAccess validasi signature (HMAC webhook secret)
   → terbit kredensial ke dompet e.id → status=issued   (tanpa 'paid', tiket tak terbit)
   ↓
Check-in venue: scan QR tiket → TrustAccess verify kredensial + policy → GRANT/DENY + trace
```

### API eksternal (tenant-scoped, `/api/v1/*`)

- `POST /api/v1/registerables` · `GET /api/v1/registerables/:id` — buat & cek event/kuota.
- `POST /api/v1/registrations` · `GET /api/v1/registrations/:id` — mulai registrasi (KYC) & cek status.
- `POST /api/v1/verify-identity` — **verifikasi ID berdiri sendiri**: platform eksternal kirim identitas → TrustAccess jalankan e.id KYC → balas verdict `{ verified: true|false, ref }`. Dipakai platform sebagai pengecekan mandiri, atau diikuti alur registrasi/penerbitan.
- `POST /api/v1/webhooks/payment` — callback pembayaran **signed** dari platform eksternal.
- `GET /api/v1/credentials/:id` — info kredensial yang terbit.

### Sekuritas & boundary

- **OAuth2 client-credentials** → Bearer token per-tenant; scope terbatas ke event/org milik tenant tsb.
- **Signed webhook** (HMAC dengan webhook secret per aplikasi): callback pembayaran diverifikasi sebelum penerbitan.
- Platform eksternal **tidak pernah melihat data KYC e.id** — hanya mendapat verdict penyelesaian KYC (sukses/gagal).
- **Payment sepenuhnya di luar TrustAccess**; tanpa callback `paid` yang sah, kredensial tidak terbit.
- Konsisten: identitas & signing tetap di e.id; keputusan & penerbitan via programa TrustAccess.

## 20. Arsitektur

Stack: **Next.js fullstack (single app) + TypeScript + SQLite (better-sqlite3)** — sink dengan rencana implementasi untuk kecepatan MVP 1 hari; Postgres siap untuk produksi (butuh ORM/adapter). Deploy demo di **Railway (volume persisten) atau lokal** — better-sqlite3 tidak cocok di Vercel serverless (native module + disk ephemeral). JS (Recharts) untuk visualisasi analytics.

**Komponen terisolasi:**
- `lib/eid/*` — klien e.id terpusat (issuer, verifier, oauth, kyc, template, webhook handler). *Satu-satunya modul yang tahu e.id;* di sandbox/dev diganti fake adapter dengan format identik.
- `lib/engine/gating.ts` — pure function keputusan akses (GRANT/DENY + reason list + `usedPassId` + `passChecks`). Tanpa network; unit-test penuh.
- `lib/engine/anomaly.ts` — pure function skor anomali (baseline bergerak + std dev).
- `lib/engine/stats.ts` — agregasi + forecasting (linear regression/moving average). Pure.
- `lib/actuator/*` — `ActuatorProvider`: `SimulatedActuator` (default demo) & `Esp32Actuator` (opsional, HTTP/WebSocket lokal).
- `lib/db/*` — schema + seed data demo realistik (kampus, office, event, parking, residence, industrial).
- `lib/credential/*` — **BARU** model portofolio kredensial: status kredensial (active/expired/revoked), portofolio holder, siklus hidup kredensial (issue/claim/revoke).
- `lib/document/*` — **BARU** dokumen tersign: pembangun verification trace dokumen, QR dokumen, rendering dokumen (P1).
- `lib/policy/*` — **BARU** kebijakan: definisi policy domain, library policy multi-domain (campus/office/event/parking/residence/industrial), pemetaan ke engine.

**Batasan ketat:**

```
e.id adapter
  ↓
normalized internal model
  ↓
business engine
```

Rest aplikasi TIDAK boleh bergantung langsung pada detail API e.id. Fake adapter mengikuti interface internal yang sama dengan adapter e.id asli.

## 21. Data Model

- `Organization` — multi-tenant: nama, zona waktu, mata uang, konfigurasi e.id.
- `User` — admin/operator/host/member; terhubung ke subjek OAuth SSO e.id (bukan password lokal).
- `Area` — pengelompokan akses.
- `AccessPoint` — target fisik: tipe `gate | locker | room`; punya **QR unik** (sticker fisik) berisi `{ v:1, accessPointId }`; QR dipakai **dua arah** — admin scan → claim ke org, holder scan → akses.
- `Registerable` — **BARU generik** hal yang bisa didaftarkan publik: `kind` (`room` | `event` | `activity` | `membership`), nama/venue/tanggal, harga (0 = gratis), kuota, QR pendaftaran unik, credential/ticket template + policy check-in yang terbit. `kind: event/external` (atau `source: external`) menandai Registerable yang dibuat melalui API platform eksternal.
- `ExternalApp` — **BARU** aplikasi/platform pihak ketiga: `client_id`, `client_secret` (hash), `webhook_secret`, `org_id` scoped, status. Dipakai untuk OAuth2 client-credentials + verifikasi signed webhook.
- `Registration` — **BARU** transaksi pendaftaran: registerableId, holder (subjek e.id/KYC), payment (mock) bila berbayar, status, credentialId terbit. Untuk alur eksternal ditambah `order_ref` (id order di platform), `payment_status` (`awaiting_payment | paid`), dan `external_app_id`.
- `AccessRule` — inti gating per area/point: kredensial wajib utama + **kredensial prasyarat** (portfolio penuh), jam operasional, rentang valid, scope area, action.
- `Policy` — **BARU** konfigurasi contoh domain (campus/office/event/parking/residence/industrial): nama, area, kredensial + prasyarat, jam, action, deskripsi. Katalog kebijakan; aturan runtime di `AccessRule` (Pintu Lab dsb.) adalah **instance/kebijakan yang diaktifkan** pada access point — keduanya memakai engine gating yang sama.
- `DocumentTemplate` — **BARU** template dokumen tersign yang dapat diterbitkan (nama, kategori, field, issuer label, validitas default). Berisi: Sertifikat, Safety Induction, Student/Employee Credential, Parking Permit, dst.
- `CredentialTemplate` — peta ke e.id Document Schema (fullName, area, validFrom, validUntil, dll) — dipertahankan untuk kompatibilitas.
- `IssuedPass` / `IssuedCredential` — **ledger dokumen/kredensial tersign**: credentialId e.id, holder, template, rule/policy, status `active|revoked|expired`, sumber `admin|self|delegated`, + metadata dokumen (documentTitle, issuerLabel, description), hostRef.
- `Delegation` — **BARU** host → guest: host, guest, area, rentang valid, status, credentialId child.
- `AccessEvent` — tiap verifikasi: accessPoint, policy/rule, verdict `GRANT|DENY`, reason[], credential(s) dievaluasi, holder, waktu, tipe aksi, hasil aktuator, `usedPassId`.
- `Payment` — order, tariff, nominal, metode (mock), status, receiptCredentialId.
- `KYCRequest` — referensi gateway, provider, status.
- `AnomalyAlert` — hasil deteksi.

## 22. Endpoint / Route

- Auth: `/api/auth/eid` (OAuth SSO callback), session.
- Admin: CRUD `/api/admin/organizations`, `/areas`, `/access-points`, `/rules`, `/tariffs`, **`/api/admin/credentials` (issue/revoke dokumen & kredensial)**, templates, **`/api/admin/registerables` (CRUD Registerable: room/event/activity/membership + generate QR)**.
- **Claim access point (provisioning):** `POST /api/admin/access-points/claim` — scan QR fisik `{ v:1, accessPointId }` → access point terpasang & aktif di org.
- **Registerable QR (pendaftaran publik):** `/r/:token` & `/api/r/:token` — scan QR → halaman pendaftaran → **e.id KYC** → [bayar mock bila berbayar | next bila gratis] → auto-issue credential ke dompet.
- Document verification: **`/api/verify/document`** (QR dokumen → e.id verifier → verification trace → VERIFIED/INVALID + alasan).
- Self-serve: `/register`, `/api/register` (KYC → payment mock → auto-issue) — dipakai oleh engine Registerable generik.
- Gate: `/gate/:id`, `/api/verify` (payload QR → e.id verifier → policy engine atas **portofolio penuh** → result + trace + aksi).
- Check-in event: `/api/verify/registerable` — QR ticket dari e.id → verify → GRANT/DENY masuk venue / broadcast.
- **External API (B2B2C, `oauth client-credentials` scoped per app):**
  - `POST /api/v1/registerables` · `GET /api/v1/registerables/:id` — platform eksternal buat/cek event.
  - `POST /api/v1/registrations` · `GET /api/v1/registrations/:id` — mulai registrasi (KYC e.id) & cek status (`awaiting_payment` → `issued`).
  - `POST /api/v1/verify-identity` — verifikasi ID mandiri: kirim identitas → e.id KYC → verdict `{ verified, ref }`.
  - `POST /api/v1/webhooks/payment` — callback pembayaran **signed** (HMAC) dari platform; hanya callback `paid` yang sah memicu penerbitan kredensial.
  - `GET /api/v1/credentials/:id` — info kredensial terbit.
- Holder: **`/holder` (My Credentials)**, `/holder/:credentialId` (present QR).
- Audit: **`/admin/audit`** (verification traces dari AccessEvent + Registration).
- Webhooks: `/api/webhooks/eid/verification`, `/api/webhooks/eid/kyc`.
- Analytics: `/api/stats/*` (volume, grant/deny rate, estimasi revenue, anomali, live access, registrations).
- Aktuator: `/api/actuate` (internal, dipanggil engine saat GRANT).

## 23. Prioritas (P0/P1/P2)

**P0 — inti demo:**
- Holder credential
- QR presentation
- e.id verification / fake adapter
- Policy engine
- GRANT/DENY
- Why Denied (trace)
- Signed/verifiable credential/document concept
- Audit trail
- Beautiful UI
- Locker/gate simulator

**P1:**
- Credential issuance (admin + UI)
- Delegation
- KYC mock
- Payment mock
- Revenue dashboard

**P2:**
- Anomaly detection
- Forecasting
- LLM explanation
- ESP32 integration

Jangan mengorbankan demo end-to-end utama demi fitur opsional.

## 24. Demo Story (~5–7 menit, tanpa hardware)

> "Today, organizations still rely on physical cards, manually checked documents, and disconnected access systems."

1. Admin login menggunakan e.id.
2. Admin menerbitkan kredensial Safety Induction (dokumen tersign).
3. Holder melihat kredensial yang tersign/dapat diverifikasi.
4. Holder mempresentasikan QR.
5. TrustAccess memverifikasi kredensial.
6. Policy engine memeriksa akses.
7. Akses GRANTED.
8. Simulasi door/locker terbuka.
9. Ubah kredensial menjadi expired/revoked.
10. Scan lagi.
11. Akses DENIED.
12. Sistem menjelaskan dengan jelas mengapa.
13. Tampilkan audit trail.
14. Tampilkan anomaly.
15. Tampilkan revenue/business dashboard.
16. Jelaskan bahwa mesin yang sama mampu memberi daya akses office, campus, event, parking, residence, industrial.

**Bonus demo — pendaftaran publik (Registerable):**

1. Admin org membuat **Event "Konser"** dan sebuah **Ruangan Lab** (Registerable) → sistem generate **QR pendaftaran** masing-masing.
2. Admin men-scan **QR fisik access point** → ruangan **ter-claim** & aktif di org.
3. Orang umum **scan QR event** → halaman pendaftaran.
4. **e.id KYC** — identitas terverifikasi langsung via e.id.
5. Event berbayar → **bayar mock** → next; (alternatif: event **gratis → next langsung**).
6. **EventTicket** diterbitkan ke dompet e.id.
7. Check-in venue: scan QR tiket → verify → **GRANT** masuk → (VIP: policy tambahan `VIPCredential`).

**Bonus demo — integrasi eksternal (B2B2C, §19):**

1. Platform tiket (simulasi loket.com/tiket.com) daftar sebagai aplikasi → **Client ID+Secret + Webhook secret**.
2. Platform buat event lewat **`POST /api/v1/registerables`**.
3. Pembeli checkout di platform → **`POST /api/v1/registrations`** → TrustAccess jalankan **e.id KYC** → `registrationId` status `awaiting_payment`.
4. Platform kirim callback **signed** **`POST /api/v1/webhooks/payment`** `{ status: paid }` → validasi HMAC → **EventTicket terbit** ke dompet e.id.
5. Check-in venue: scan QR tiket → verify → **GRANT** masuk.

**Demo case (campus):**

```
CASE A: Student + valid Lab Access + valid Safety Induction  → GRANT → 🔓 Unlock
CASE B: Student + Lab Access + expired Safety Induction      → DENY → explain
CASE C: Revoked credential                                    → DENY
CASE D: Credential valid but wrong area                       → DENY
```

**Final message:**

> **TrustAccess doesn't just verify who you are.**
> **It verifies what you are entitled to do.**

## 25. Kejujuran Teknologi (Anti-Overclaim)

- "AI" pada materi demo = rule chain + statistik + LLM narasi opsional. Siap dinilai teknis.
- Payment adalah **mock**; flag bahwa integrasi Midtrans/Xendit siap di-produksi. **Pada API eksternal (B2B2C) pembayaran hidup di platform tiket** — TrustAccess hanya menerima callback `paid` yang signature-nya diverifikasi; di MVP callback ini disimulasikan/mock.
- TrustAccess **tidak menandatangani dokumen sendiri** — signing dilakukan e.id. TrustAccess meminta issuance via Issuer API dan memakai verifikasi e.id.
- Jika sandbox e.id tidak tersedia saat build: dipakai **fake adapter** dengan format respons identik (dokumentasikan saat demo sebagai "mode sandbox").
- Hardware (ESP32) **tidak wajib** — `ActuatorProvider` di-abstraksi. Demo berjalan penuh dengan simulasi.
- Data revenue/MRR dashboard adalah **data demo/simulasi berlabel**.
- QR/presentasi mewakili identitas **holder** (MVP: QR valid = identitas holder). Binding presentasi ke perangkat/sesi hidup adalah kemampuan e.id di produksi — disebutkan sebagai batasan MVP, bukan klaim keamanan penuh.

## 26. Sukses-Kriteria

- Demo end-to-end jalan tanpa hardware (16 langkah cerita).
- Setiap keputusan gate punya alasan terbaca (GRANT/DENY + reason + trace).
- Dokumen tersign terverifikasi (signature, issuer, holder, status, expiry, revoke).
- Portofolio penuh dievaluasi (prasyarat lintas-kredensial).
- Unit test engine lulus: GRANT/DENY, prasyarat, kedaluwarsa, area-scope, anomali, stats, document trace.
- Revenue analytics tampak di dashboard (data demo berlabel).
- Hampir semua capability e.id terpajang (SSO, KYC, issuer, holder, verifier, template, webhook).
- External API (opsional, bila waktu sisa): platform tiket simulasi bisa buat event, KYC via `POST /api/v1/registrations`, terima credential setelah callback `paid` yang signature-nya valid.

## 27. Risiko & Mitigasi

- **Sandbox e.id tidak tersedia** → fake adapter, dokumentasikan.
- **Over-scope** → MVP terkunci pada P0/P1 di spec ini; tambahan hanya jika waktu sisa.
- **Kebingungan "satu pass / satu QR"** → QR membawa identitas holder; sistem menarik portofolio penuh; engine menilai vs rule gate.
- **Demo gagal hardware** → none, karena hardware opsional.

## 28. Di Luar Scope (MVP 1 Hari)

- Integrasi hardware ESP32 (opsional, hanya bila stabil).
- Payment riil (Midtrans/Xendit).
- Integrasi gerbang/aktuator komersial.
- OTP email/SMS; notifikasi push; multi-bahasa.
- Full SSO tenant management enterprise.
- Rendering dokumen grafis penuh (template API e.id) — MVP memakai QR + render teks; image rendering = roadmap.

## 29. Stack Ringkas

Next.js (App Router) + TypeScript · better-sqlite3 + SQLite (Postgres siap produksi) · Tailwind · Recharts · `qrcode` untuk QR · `jose` untuk session/parse VC (bila perlu) · konfigurasi environment variables untuk e.id sandbox keys.