# Panduan Deploy ke Cloudflare Pages

## Prasyarat
- Akun GitHub: https://github.com
- Akun Cloudflare: https://dash.cloudflare.com
- Git terinstall di komputer

---

## Langkah 1 — Init Git & Push ke GitHub

```bash
# Di folder d:\App\inventory, jalankan:
git init
git add .
git commit -m "Initial commit: Inventory App"

# Buat repo baru di GitHub (jangan centang Initialize README)
# Lalu:
git remote add origin https://github.com/USERNAME/REPO-NAME.git
git branch -M main
git push -u origin main
```

---

## Langkah 2 — Connect ke Cloudflare Pages

1. Login ke https://dash.cloudflare.com
2. Klik **Workers & Pages** → **Create application** → **Pages**
3. Klik **Connect to Git** → pilih repo GitHub yang baru dibuat
4. Konfigurasi build:

| Setting | Value |
|---------|-------|
| **Framework preset** | SvelteKit |
| **Build command** | `npm run build` |
| **Build output directory** | `build` |
| **Root directory** | *(kosongkan)* |
| **Node.js version** | `20` |

5. Klik **Save and Deploy**

---

## Langkah 3 — Verifikasi Setelah Deploy

Setelah deploy selesai, buka URL Cloudflare Pages Anda dan pastikan:

- [ ] Halaman dashboard muncul (tidak 404)
- [ ] Database berhasil dimuat (tidak ada error "Gagal memuat database")
- [ ] QR Scanner bisa membuka kamera (butuh HTTPS — otomatis di Cloudflare)
- [ ] Header COOP/COEP aktif (cek di DevTools → Network → pilih request → Response Headers)

---

## Langkah 4 — Update Setelah Ada Perubahan

```bash
git add .
git commit -m "Deskripsi perubahan"
git push
```

Cloudflare Pages akan otomatis rebuild dan redeploy.

---

## Custom Domain (Opsional)

1. Di Cloudflare Pages → **Custom domains**
2. Tambah domain Anda
3. Ikuti instruksi DNS yang diberikan

---

## Catatan Penting

### Data Tersimpan di Browser
Semua data inventory tersimpan di browser masing-masing pengguna (SQLite via OPFS).
Data **tidak tersinkronisasi** antar perangkat — ini by design untuk aplikasi offline-first.

Untuk backup/restore, gunakan fitur **Export JSON** di halaman Settings.

### Kamera & HTTPS
Fitur scan QR membutuhkan HTTPS. Cloudflare Pages otomatis menyediakan HTTPS,
jadi tidak perlu konfigurasi tambahan.

### Header COOP/COEP
File `static/_headers` sudah mengatur header yang diperlukan untuk SQLite WASM.
Cloudflare Pages membaca file ini secara otomatis.

### Preview Lokal
```bash
# Build production + jalankan server preview
preview.bat

# Development dengan hot reload
npm run dev
```
