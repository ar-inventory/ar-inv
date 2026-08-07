# Rencana SaaS — Inventory App

> Dokumen perencanaan untuk mengubah Inventory App (single-user, offline-first) menjadi SaaS multi-user/multi-tenant. Ditulis agar tidak ada keputusan yang terlewat saat migrasi dimulai.

---

## 1. Kondisi Saat Ini (Baseline)

- **Stack**: SvelteKit 2 + Svelte 5, `adapter-static`, SPA penuh (fallback `index.html`).
- **Database**: `sql.js` (WASM) + OPFS di **browser** — semua data tersimpan per-perangkat.
- **Auth**: SHA-256 tanpa salt, session di `sessionStorage` (`inv_session`), RBAC `can()` **hanya client-side**.
- **Foto**: disimpan sebagai base64 di database (bloat cepat).
- **Deploy**: Cloudflare Pages statis (`DEPLOY.md`).
- **Keunggulan yang bisa dipertahankan**: UI/UX lengkap, QR scan/generate, maintenance checklist, report, PWA offline.

---

## 2. Gap Analysis — Kenapa Belum Bisa SaaS

| Area | Masalah | Dampak |
|---|---|---|
| Data | OPFS per-browser, tidak tersinkronisasi | Tidak ada data terpusat antar perangkat |
| Auth | Hash lemah, session client-side | Tidak aman untuk multi-user |
| Authorisasi | Hanya client-side (`can()`) | Mudah di-bypass |
| Foto | Base64 di DB | DB membengkak; butuh object storage |
| Deploy | Static hosting tanpa server runtime | Tidak bisa jalankan API/auth |
| Multi-tenant | Tidak ada konsep tenant | Data bercampur |

---

## 3. Opsi Arsitektur SaaS

### Opsi A — Node Server (VPS/Docker/Fly/Render/Railway) ✅ Rekomendasi
- **Stack**: `@sveltejs/adapter-node` + SQLite file (atau Postgres) + **Lucia** (auth) + **Lucide** (ikon) + object storage (R2/S3) untuk foto.
- **Kelebihan**: paling "proper", kontrol penuh, mudah scaling.
- **Kekurangan**: ganti host, DEPLOY.md ditulis ulang total.

### Opsi B — Tetap di Cloudflare
- **Stack**: `@sveltejs/adapter-cloudflare` + **D1** (SQLite server-side) + Lucia.
- **Kelebihan**: tidak pindah host, gratis-ish, tetap Cloudflare.
- **Kekurangan**: seluruh lapisan data ditulis ulang (query D1 via server functions), keterbatasan platform.

### Perbandingan cepat
| Kriteria | A (Node) | B (Cloudflare D1) |
|---|---|---|
| Kesulitan migrasi | Sedang | Tinggi (data layer dirombak) |
| Fleksibilitas | Tinggi | Menengah |
| Biaya skala kecil | ~$5–20/bln | Rendah/0 |
| Reuse frontend | ~30–40% | ~30% |

---

## 4. Migrasi Berfase (Recommended Path)

### Fase 0 — Persiapan (tanpa perubahan besar)
- Backup/Export JSON rutin.
- Tetap deploy versi offline saat ini.

### Fase 1 — Backend & API
- Pilih Opsi A atau B.
- Migrasi lapisan data: panggilan sinkron `get('SELECT...')` di browser → **async fetch ke endpoint server**.
- Semua halaman disesuaikan (await di data loaders).
- Implementasi Lucia (auth), session aman, password dengan salt (argon2/bcrypt).

### Fase 2 — Authorisasi Server-side
- Pindahkan enforcement RBAC `can()` ke server (middleware per-route/endpoint).
- Sesi & izin diverifikasi server, bukan cuma browser.

### Fase 3 — Multi-tenancy
- Kolom `tenant_id` di semua tabel (atau DB per-tenant).
- Skema user: role `owner`/`admin`/`member`.

### Fase 4 — Foto & Storage
- Pindahkan foto base64 → object storage (R2/S3), simpan URL saja di DB.
- Kompresi saat upload (sudah ada `compressImage`).

### Fase 5 — Hardening & Ops
- HTTPS, rate limiting, verifikasi email, audit log server, backup terjadwal.
- DEPLOY.md versi baru untuk server hosting.

---

## 5. Estimasi Effort

| Item | Effort |
|---|---|
| Data layer rewrite (async + API) | ~40% dari total |
| Auth + RBAC server-side | ~20% |
| Multi-tenancy | ~15% |
| Storage foto | ~10% |
| Hardening, backup, deploy baru | ~15% |

**Frontend yang ada dipakai ulang ~30–40%**; sisanya refactor.

---

## 6. Keputusan yang Masih Perlu Diambil

- [ ] Pilih **Opsi A (Node server)** atau **Opsi B (Cloudflare D1)**
- [ ] SQLite vs Postgres (kalau A): SQLite cukup untuk 1 perusahaan skala kecil–menengah
- [ ] Skema billing/team diperlukan atau cukup per-perusahaan (tenant tunggal multi-user)?
- [ ] Mulai Fase 1 sekarang atau tunda sampai fitur offline stabil?
