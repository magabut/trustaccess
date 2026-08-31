---
marp: true
theme: vp
size: 16:9
paginate: true
footer: "TrustAccess × e.id"
---

<!--
note: Sapaan singkat. "5 menit; ada demo. Satu kalimat: TrustAccess adalah platform yang menggunakan API e.id untuk mengubah verifiable credentials menjadi permission untuk mengakses dokumen, layanan, event, maupun fasilitas fisik."
-->

<!-- _class: cover -->

<span class="badge">e.id Integration · Proyek 1 Hari · 2026</span>

# TrustAccess

<div class="tagline">Credential Terpercaya untuk Akses Nyata.<br><span class="dim">Trusted Credentials. Real-World Access.</span></div>

<p class="sub">Platform yang menggunakan API e.id untuk mengubah verifiable credentials menjadi <strong>permission</strong> — untuk dokumen, layanan, event, maupun fasilitas fisik.<br><span class="dim">Team: &lt;Nama Tim&gt;</span></p>

---

<!--
note: 3 rasa sakit yang nyata di organisasi mana pun yang punya gerbang/pintu.
-->

# Masalah: "valid" belum tentu "berhak"

- **Fotokopi & email manual** — dokumen mudah dipalsukan, verifikasi manual sulit, tanpa jejak.
- **Gate mengandalkan orang** — keputusan tidak konsisten, DENY tanpa alasan, GRANT tanpa catatan.
- **Verifikasi "siapa" ≠ "berhak"** — kredensial lulus belum tentu memberi hak akses ke lab, ruang server, atau area khusus.

> Foto profil tidak memberi Anda kunci pintu. Yang memberi kunci adalah **keputusan izin** — dan saat ini keputusan itu tidak pernah terbaca, pun tercatat.

---

<!--
note: Kesadaran: e.id sudah menyelesaikan identitas. Yang hilang adalah lapisan keputusan. Di situlah kami.
-->

# Dua lapisan: e.id = identitas, TrustAccess = keputusan

- e.id adalah **infrastruktur kepercayaan**: SSO, KYC, issuer, holder, verifier, dompet, template, webhook.
- e.id menjawab *"apakah dokumen ini benar?"* — bukan *"bolehkah pemegangnya masuk?"*.
- **TrustAccess adalah produk SaaS** yang duduk di atasnya: policy engine, access control, audit, analitik.

<div class="card">**e.id** = identity / infrastructure<br>**TrustAccess** = authorization / product — dibeli & dijalankan oleh organisasi.</div>

---

<!--
note: Solusi dalam satu kalimat: satu engine deterministik yang menilai portofolio penuh dan memberi alasan.
-->

# Solusi: satu engine, banyak izin

- **Engine deterministik murni:** input = portofolio credential + aturan akses → output `GRANT` / `DENY` + **daftar alasan** + **trace**. Tanpa network, unit-test penuh.
- Menilai **seluruh portofolio holder** — bukan satu QR untuk satu izin.
- Setiap keputusan punya jejak yang bisa dibaca: **"WHY DENIED?" adalah fitur utama**, bukan tambahan.

<div class="cols">
<div>

<div class="card"><span class="grant">GRANT</span> Pintu Lab<br><span class="mono">» Lab Access ✓<br>» Safety Induction ✓</span></div>

</div>
<div>

<div class="card deny-card"><span class="deny">DENY</span> Laboratory B<br><span class="mono">» Safety Induction ✗<br>EXPIRED → no access</span></div>

</div>
</div>

---

<!--
note: Ini yang membedakan dari scanner biasa: keputusan memakai konteks nyata organisasi.
-->

# Aturan nyata, bukan sekadar "scan"

- **Prasyarat lintas-kredensial:** masuk lab butuh `Laboratory Access` **dan** `Safety Induction` — keduanya valid saat itu.
- **Jam operasional** (07:00–18:00 JKT), rentang berlaku, **area-scope**, status **revoked**.
- **Anomali otomatis:** retry cepat setelah DENY, 3+ titik akses dalam 1 jam, jam tak biasa.
- Satu engine yang sama untuk **semua domain**: kampus, kantor, event, parkir, residensial.

---

<!--
note: Demo cepat. Panji, mahasiswa dengan Student Credential + Safety Induction.
-->

# Demo 1 — dari issuance ke kunci terbuka

- Admin menerbitkan kredensial melalui **Issuer API e.id** → masuk dompet holder.
- Panji scan QR di **Pintu Lab** → engine menilai **portofolio penuh**.

```
input   : Student Credential ✓ · Safety Induction ✓ · hours 07–18 ✓
policy  : LaboratoryAccess
decision: GRANT  1-pass-per-access  used: pass#4 (lab + safety)
```

- Access event tercatat: **siapa, kapan, gate apa, keputusan apa** — sejak awal.

---

<!--
note: Bagian paling penting: DENY harus bisa dijelaskan. Plus verifikasi dokumen mandiri.
-->

# Demo 2 — DENY yang bisa dijelaskan

- **Budi** — Safety Induction-nya kedaluwarsa → `DENY` di Laboratory B, lengkap dengan trace:

```
checks  : Lab Access ✓ · Safety Induction ✗ EXPIRED
decision: DENY  reason: safety induction tidak berlaku
trace   : kamu butuh Safety Induction yang aktif untuk area ini
```

- **Verifikasi dokumen** apa pun: valid / expired / revoked — satu trace terbaca.
- **Analytics:** volume, grant/deny rate, estimasi revenue (*data demo berlabel*).

---

<!--
note: Demo pendaftaran publik (Registerable) — satu engine untuk event, ruangan, kegiatan, membership. Konsisten dengan "satu mesin, banyak izin".
-->

# Demo 3 — pendaftaran publik, satu engine

- Organisasi membuat **Registerable** (konser, ruangan Lab, kegiatan, membership) → sistem membuat **QR pendaftaran unik** per objek.
- Tamu umum **scan QR** → **e.id KYC** → berbayar? **bayar mock** · gratis? **langsung next** → **credential/tiket terbit** ke dompet.
- Scan bisa lewat **aplikasi e.id Identity Wallet**: QR = **deep-link** → terbuka halaman daftar → identitas otomatis dari wallet (OAuth/KYC e.id) → tiket masuk ke dompet e.id.

```
scan QR → e.id KYC → [ bayar mock | gratis → next ] → EventTicket/AccessPass terbit → check-in
```

<div class="cols">
<div class="card">**Event / konser**<br>EventTicket → check-in venue · VIP area</div>
<div class="card">**Ruangan / area**<br>claim access point (scan **QR fisik**) → AccessPass</div>
</div>

- **Claim access point:** admin scan QR fisik di ruangan → access point terpasang & aktif di org.

---

<!--
note: Semua kemampuan e.id yang terpakai dalam satu proyek.
-->

# TrustAccess = produk; e.id = infrastruktur

- **e.id** menyediakan identity, signing, credential — sebagai **API / infra**.
- **TrustAccess** mengubah credential itu menjadi **permission & aksi nyata** — sebagai **produk SaaS** yang organisasi bayar.
- **Adapter tunggal** `lib/eid/*`: satu-satunya modul yang mengenal e.id → bisnis logic TrustAccess tak bergantung pada detail API e.id.

<div class="card mono">trustaccess = decisions(i)  →  <span class="ok">e.id</span> = identity(i), signatures(i)</div>

<div class="cols">
<div class="card">**TrustAccess (produk)**<br>org · policy · credential mgmt · access control · audit · analytics · anomaly · physical/digital</div>
<div class="card">**e.id (infra)**<br>identity/SSO · KYC · issuance · holder/wallet · verification · template · webhook</div>
</div>

---

<!--
note: Peran pengguna bukan tipe user tetap — satu akun bisa gabung beberapa peran. Ini membuka use case individual→issuer.
-->

# Peran, bukan "User = Holder"

Satu orang bisa memegang banyak peran sekaligus — peran adalah **kemampuan**, bukan tipe user tetap.

| Peran | Tanggung jawab |
|---|---|
| **Holder** | menerima & menyimpan credential, menunjukkan, menerima delegated access |
| **Issuer** | menerbitkan credential / dokumen tersign |
| **Verifier** | memverifikasi kevalidan credential |
| **Administrator** | mengelola org, access points, policy, audit, analitik |

```
Panji (individu)        → Holder
Universitas XYZ         → Issuer · Verifier · Administrator
Panji (sebagai trainer) → Holder · Issuer     ← punya banyak peran
```

Tidak selalu `Organization → Holder`. Bisa juga **`Individual → Issuer → Holder`**.

---

<!--
note: Tiga sisi produk — Personal (network effect), Business (revenue utama), Verify (transaksi). Cerita lomba = Business + Holder.
-->

# Tiga sisi produk

| Sisi | Pengguna | Fungsi inti | Bisnis |
|---|---|---|---|
| 🧑 **Personal** | perorangan / holder | claim, simpan & tunjukkan credential; sertifikasi, event pass, permit; delegated access | freemium — network effect |
| 🏢 **Business** | organisasi (issuer/admin) | issue credential, buat policy, manage access point & verifier, delegation, audit, analytics, revenue | **B2B SaaS** — revenue utama |
| 🔍 **Verify** | pihak yang perlu verifikasi | "apakah credential ini valid?" — scan QR → status | per-verification |

```
SCAN QR → TrustAccess Verify →
  ✓ VERIFIED   Safety Certification
     Holder: {nama} · Issuer: XYZ Training
     Status: ACTIVE · Valid Until: 2027
```

---

<!--
note: TrustAccess juga bisa jadi backend untuk platform tiket luar (loket.com/tiket.com): mereka bikin event + pembayaran, TrustAccess pegang verifikasi id + kredensial + check-in.
-->

# API untuk platform tiket (B2B2C)

TrustAccess jadi **backend** bagi loket.com / tiket.com — mereka sibuk jual tiket & bayar, TrustAccess pegang **identitas + kredensial + check-in**.

```
platform buat event      → POST /api/v1/registerables
checkout                 → POST /api/v1/registrations → e.id KYC
bayar di platform        → callback signed 'paid' (HMAC)
TrustAccess terbit tiket → EventTicket → dompet → check-in GRANT
```

<div class="cols">
<div class="card">**Platform tiket**<br>event · kuota · <strong>pembayaran</strong></div>
<div class="card">**TrustAccess (API)**<br>e.id KYC · kredensial · <strong>check-in</strong> · audit</div>
</div>

- **OAuth2 client-credentials** + callback webhook **ber-tanda** (HMAC) — tanpa "paid" yang sah, tiket tak terbit.

---

<!--
note: Registrasi adalah ke TrustAccess, bukan ke e.id. e.id hanya jadi mekanisme identity/trust saat onboarding.
-->

# Daftar ke TrustAccess, pakai identitas e.id

- **Bukan** "Register to e.id" — **account-nya account TrustAccess**.
- e.id hanya menyediakan **mekanisme identity/trust saat onboarding**.

```
      TRUSTACCESS                     e.id
   CREATE ACCOUNT                OAuth / KYC
        │                            │
        └──── Continue with e.id ───►│
                                     │ Identity verified
        ◄──────── verified ──────────┘
        │
   TrustAccess User / Admin / Holder
```

- **Organisasi:** buat org, daftarkan admin (verified via e.id) → atur areas, access points, credential templates, policies.
- **Holder:** daftar → terima credential dari organisasi → scan QR di gate → keputusan GRANT/DENY.

---

<!--
note: Antisipasi keberatan. Kami jujur soal batas.
-->

# Kejujuran teknologi

- **"AI"** kami = rule chain + statistik; LLM narasi **opsional, off secara default**.
- TrustAccess **tidak menandatangani dokumen** — signing selalu di e.id.
- **Payment = mock** (integrasi Midtrans/Xendit siap); angka dashboard = **data demo berlabel**.
- QR mewakili identitas holder di MVP (binding perangkat = produksi e.id); ESP32 di-abstraksi — demo penuh **tanpa hardware**.

---

<!--
note: Bagian bisnis — angka adalah simulasi berlabel untuk kejujuran.
-->

# Jejak komersial

- **Model:** langganan per-gate/bulan + komisi per peristiwa akses.
- **Siapa membayar siapa:** organisasi membayar **TrustAccess** (produk); TrustAccess memakai **API e.id** sebagai infra trust.
- **Skenario kampus contoh** (label: estimasi): 12 gate ⇒ ± Rp 18 jt/bln.

<div class="cols three">
<div class="kpi"><div class="num">Rp250k</div><div class="lbl">per gate / bulan</div></div>
<div class="kpi"><div class="num">Rp500</div><div class="lbl">komisi / akses</div></div>
<div class="kpi"><div class="num">1→N</div><div class="lbl">domain dalam satu deployment</div></div>
</div>

- Satu biaya integrasi e.id, banyak gerbang & banyak domain yang dilayani.

---

<!--
note: Mengapa ini layak menang — output terukur.
-->

# Pembeda yang terukur

- **Setiap DENY punya alasan terbaca** — pembeda vs scanner/QR biasa.
- **Portofolio penuh** dievaluasi lintas-kredensial — bukan QR tunggal.
- **Jejak audit lengkap + deteksi anomali** otomatis sejak hari pertama.
- Diverifikasi unit test: GRANT/DENY, prasyarat, kedaluwarsa, area-scope, anomali, trace dokumen.
- Berjalan **tanpa hardware**, siap untuk hardware — langsung pakai pasca-hackathon.

---

<!--
note: Penutup + CTA. Tawarkan demo/link.
-->

<!-- _class: end -->

# Roadmap & ajakan

- **Sekarang:** sandbox e.id → produksi; binding presentasi ke perangkat pengguna.
- **Berikutnya:** actuator fisik (ESP32 asli), integrasi pembayaran, template per domain.
- **Undangan:** coba 5 menit — terbitkan kredensial, buka kunci pintu, tonton alasan DENY-nya.

<div class="card">**TrustAccess** — dari *"dokumen yang benar"* menuju *"hak yang benar, pada saat yang benar."*</div>

Dash <span class="dim">· · ·</span> **Sesi tanya jawab**