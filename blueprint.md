# Blueprint — Inventory App (QR Code Based)

> Versi: 1.2  
> Tanggal: 6 Agustus 2026  
> Target Deploy: Cloudflare Pages  
> Arsitektur: Full Client-Side (Static Web App)
> Catatan: Semua icon menggunakan Font Awesome 6 Free (CDN) — tidak ada icon dari library lain

---

## 1. Ringkasan Proyek

Aplikasi inventory berbasis web yang berjalan sepenuhnya di browser (tanpa server backend). Data disimpan lokal menggunakan SQLite via WebAssembly (sql.js) dengan OPFS sebagai persistent storage. Setiap item inventory memiliki QR Code unik yang bisa di-scan untuk melihat detail, update status, atau melakukan check-in/check-out.

**Target pengguna:** Pengelola aset/equipment di berbagai jenis usaha (kantor, hotel, klinik, bengkel, dll).

**Fitur unggulan:**
- Scan QR Code via kamera untuk akses cepat ke data item
- Generate & print QR Code untuk label fisik (single & batch)
- Offline-ready (PWA)
- Multi-kategori inventory dengan custom fields dinamis per kategori
- Riwayat aktivitas & maintenance records per item
- Sistem notifikasi jadwal maintenance / kalibrasi / pajak
- **Sistem autentikasi lokal** — login dengan username + password, session via sessionStorage
- **Role-based permission** — Admin, Technician, Staff, Viewer dengan hak akses berbeda
- Lokasi hierarkis (Gedung → Lantai → Ruangan)
- Laporan & export (PDF, CSV, JSON)
- Bulk actions (update massal)
- Export data CSV / JSON lengkap

---

## 2. Stack Teknologi

| Layer | Teknologi | Versi | Alasan |
|-------|-----------|-------|--------|
| **Framework** | SvelteKit | latest | Ringan, build static optimal |
| **Static Adapter** | @sveltejs/adapter-static | latest | Output pure static files |
| **Build Tool** | Vite | latest | Bundled dengan SvelteKit |
| **Database** | sql.js (SQLite WASM) | 1.12.x | SQLite di browser, offline |
| **Storage** | OPFS (Origin Private File System) | native | Persistent storage browser |
| **QR Scanner** | html5-qrcode | 2.3.x | Scan via kamera device |
| **QR Generator** | qrcode | 1.5.x | Generate QR code SVG/PNG |
| **Icon** | Font Awesome 6 Free (CDN) | 6.x | Icon lengkap & familiar |
| **Alert/Toast** | SweetAlert2 | 11.x | Alert & toast modern |
| **Styling** | Tailwind CSS | 3.x | Utility-first, mobile-first |
| **PWA** | vite-plugin-pwa | latest | Service worker, offline cache |
| **Export** | file-saver | 2.x | Download CSV/JSON ke lokal |
| **CSV Parse** | Papa Parse | 5.x | Import CSV |
| **JSZip** | jszip | 3.x | Export QR code batch sebagai ZIP |

---

## 3. Arsitektur Sistem

```
┌─────────────────────────────────────────────────────┐
│                    BROWSER (Client)                  │
│                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  SvelteKit  │  │   sql.js    │  │    OPFS     │  │
│  │   (UI/UX)   │◄─►│  (SQLite)  │◄─►│  (Storage) │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
│         │                                            │
│  ┌──────▼──────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ QR Scanner  │  │ QR Generator│  │  PWA / SW   │  │
│  │(html5-qrcd) │  │  (qrcode)   │  │  (Offline)  │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────┘
              │
     Deploy ke Cloudflare Pages
     (HTTPS required for camera + WASM)
```

---

## 4. Struktur Database (SQLite)

### Tabel: `categories`
```sql
CREATE TABLE categories (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL UNIQUE,
  icon      TEXT,          -- Font Awesome class, e.g. "fa-snowflake"
  color     TEXT,          -- hex color untuk badge
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Tabel: `items`
```sql
CREATE TABLE items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  qr_code        TEXT NOT NULL UNIQUE,  -- UUID sebagai QR payload
  name           TEXT NOT NULL,
  category_id    INTEGER REFERENCES categories(id),
  brand          TEXT,
  model          TEXT,
  serial_no      TEXT,
  location_id    INTEGER REFERENCES locations(id),  -- lokasi hierarkis
  location_note  TEXT,          -- detail posisi bebas, e.g. "pojok kiri dekat jendela"
  condition      TEXT DEFAULT 'good',   -- good | fair | poor | broken
  status         TEXT DEFAULT 'available', -- available | in_use | maintenance | retired
  purchase_date  TEXT,
  purchase_price REAL,
  warranty_expiry TEXT,         -- tanggal garansi habis, untuk notifikasi
  notes          TEXT,
  image_url      TEXT,          -- base64 foto utama item
  created_at     TEXT DEFAULT (datetime('now')),
  updated_at     TEXT DEFAULT (datetime('now'))
);
```

### Tabel: `activity_log`
```sql
CREATE TABLE activity_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id    INTEGER REFERENCES items(id),
  action     TEXT NOT NULL,  -- check_in | check_out | maintenance | update | create | retire | relocate
  user_id    INTEGER REFERENCES users(id),
  user_name  TEXT,           -- snapshot nama (fallback jika user dihapus)
  notes      TEXT,
  meta       TEXT,           -- JSON extra data, e.g. {"from_location":1,"to_location":3}
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Tabel: `settings`
```sql
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
-- Default: company_name, company_logo, default_location, theme
```

### Tabel: `users`
Profil pengguna lokal — tidak ada auth, hanya identitas untuk activity log & maintenance record.

```sql
CREATE TABLE users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  role       TEXT DEFAULT 'staff',  -- admin | technician | staff | viewer
  avatar_color TEXT DEFAULT '#6366f1', -- warna avatar inisial
  is_active  INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Tabel: `locations`
Lokasi hierarkis untuk tracking posisi equipment secara terstruktur.

```sql
CREATE TABLE locations (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL,
  parent_id INTEGER REFERENCES locations(id),  -- NULL = root (gedung/site)
  level     INTEGER DEFAULT 0,  -- 0=gedung, 1=lantai, 2=ruangan
  created_at TEXT DEFAULT (datetime('now'))
);
-- Contoh: Gedung A → Lantai 2 → Ruang Server
```

### Tabel: `notifications`
Alert otomatis dari engine pengecekan jadwal.

```sql
CREATE TABLE notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id    INTEGER REFERENCES items(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,  -- overdue_maintenance | upcoming_maintenance | overdue_calibration | warranty_expiry
  message    TEXT NOT NULL,
  is_read    INTEGER DEFAULT 0,
  due_date   TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

## 4b. Schema Tambahan: Custom Fields System

### Tabel: `category_fields`
Mendefinisikan field apa saja yang dimiliki setiap kategori.

```sql
CREATE TABLE category_fields (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id   INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  field_key     TEXT NOT NULL,       -- identifier unik, e.g. "temperature_default"
  field_label   TEXT NOT NULL,       -- label tampil, e.g. "Temperatur Default (°C)"
  field_type    TEXT NOT NULL,       -- text | number | select | date | textarea | boolean
  field_options TEXT,                -- JSON array untuk type=select, e.g. '["R22","R32","R410A"]'
  field_unit    TEXT,                -- satuan, e.g. "°C", "V", "A", "BTU"
  is_required   INTEGER DEFAULT 0,   -- 0=opsional, 1=wajib isi
  show_on_card  INTEGER DEFAULT 0,   -- tampil di item card (ringkasan)
  sort_order    INTEGER DEFAULT 0,   -- urutan tampil di form
  created_at    TEXT DEFAULT (datetime('now')),
  UNIQUE(category_id, field_key)
);
```

### Tabel: `item_custom_values`
Menyimpan nilai custom field untuk setiap item.

```sql
CREATE TABLE item_custom_values (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id     INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  field_id    INTEGER NOT NULL REFERENCES category_fields(id) ON DELETE CASCADE,
  value       TEXT,                  -- semua tipe disimpan sebagai text
  updated_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(item_id, field_id)
);
```

### Tabel: `maintenance_records`
Snapshot nilai custom fields saat maintenance dilakukan — untuk history teknis.

```sql
CREATE TABLE maintenance_records (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id       INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  activity_id   INTEGER REFERENCES activity_log(id),
  technician_id INTEGER REFERENCES users(id),
  technician    TEXT,                -- nama teknisi (fallback jika user dihapus)
  findings      TEXT,                -- temuan/catatan
  actions_taken TEXT,                -- tindakan yang dilakukan
  field_snapshot TEXT,               -- JSON snapshot semua custom values saat itu
  checklist_snapshot TEXT,           -- JSON snapshot checklist item yang dicentang
  photos        TEXT,                -- JSON array base64 foto dokumentasi (maks 3)
  cost          REAL,                -- biaya maintenance jika ada
  created_at    TEXT DEFAULT (datetime('now'))
);
```

### Tabel: `checklist_templates`
Template poin-poin pemeriksaan per kategori untuk teknisi.

```sql
CREATE TABLE checklist_templates (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  item_text   TEXT NOT NULL,         -- e.g. "Bersihkan filter"
  sort_order  INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);
-- Contoh untuk AC: "Cuci filter", "Cek level freon", "Uji suhu output", "Periksa kondensasi"
```

### Contoh Data: Custom Fields untuk Kategori AC

```json
[
  { "field_key": "capacity_btu",       "field_label": "Kapasitas (BTU)",          "field_type": "number", "field_unit": "BTU",  "show_on_card": true  },
  { "field_key": "temp_default",       "field_label": "Temperatur Default",        "field_type": "number", "field_unit": "°C",   "show_on_card": true  },
  { "field_key": "voltage",            "field_label": "Tegangan",                  "field_type": "number", "field_unit": "V"     },
  { "field_key": "ampere",             "field_label": "Ampere",                    "field_type": "number", "field_unit": "A"     },
  { "field_key": "refrigerant",        "field_label": "Tipe Refrigerant",          "field_type": "select", "field_options": ["R22","R32","R410A","R134a"] },
  { "field_key": "last_service_date",  "field_label": "Tanggal Service Terakhir",  "field_type": "date"   },
  { "field_key": "next_service_date",  "field_label": "Tanggal Service Berikutnya","field_type": "date",   "show_on_card": true  },
  { "field_key": "indoor_location",    "field_label": "Posisi Unit Indoor",        "field_type": "text"   },
  { "field_key": "outdoor_location",   "field_label": "Posisi Unit Outdoor",       "field_type": "text"   },
  { "field_key": "inverter",           "field_label": "Inverter",                  "field_type": "boolean" }
]
```

### Relasi Antar Tabel Custom Fields

```
categories
    │
    └──(1:N)── category_fields
                    │
                    └──(1:N)── item_custom_values ──(N:1)── items
                                                                │
                                                                └──(1:N)── maintenance_records
```

### Flow Data Custom Fields

```
1. Admin buat kategori "AC & Pendingin"
       ↓
2. Admin tambah custom fields di Categories → Custom Fields tab
   (temperature_default, voltage, refrigerant, dll)
       ↓
3. User buat item baru, pilih kategori "AC & Pendingin"
   → Form otomatis tampilkan field standar + custom fields kategori ini
       ↓
4. User isi semua field → simpan
   → items table: data standar
   → item_custom_values table: nilai custom fields
       ↓
5. Teknisi scan QR item → buka halaman detail
   → Lihat semua info + nilai custom fields saat ini
       ↓
6. Teknisi klik "Catat Maintenance"
   → Modal form muncul: temuan, tindakan, update nilai custom fields
       ↓
7. Simpan maintenance record
   → activity_log: action="maintenance"
   → maintenance_records: snapshot semua nilai + catatan teknisi
   → item_custom_values: nilai terbaru diupdate
```

---

## 5. Struktur Folder Proyek

```
inventory/
├── .kiro/
│   └── blueprint.md
├── src/
│   ├── app.html
│   ├── app.css
│   ├── lib/
│   │   ├── db/
│   │   │   ├── database.js           # inisialisasi sql.js + OPFS
│   │   │   ├── items.js              # CRUD items
│   │   │   ├── categories.js         # CRUD categories
│   │   │   ├── customFields.js       # CRUD category_fields & item_custom_values
│   │   │   ├── maintenance.js        # maintenance records
│   │   │   ├── checklist.js          # checklist templates
│   │   │   ├── locations.js          # CRUD lokasi hierarkis
│   │   │   ├── users.js              # CRUD profil pengguna lokal
│   │   │   ├── notifications.js      # baca/tulis/mark-read notifikasi
│   │   │   ├── activity.js           # activity log
│   │   │   └── settings.js           # app settings
│   │   ├── components/
│   │   │   ├── Header.svelte             # top navigation + notif badge
│   │   │   ├── BottomNav.svelte          # mobile bottom navigation
│   │   │   ├── ItemCard.svelte           # card item inventory
│   │   │   ├── QRScanner.svelte          # kamera QR scanner
│   │   │   ├── QRDisplay.svelte          # tampil & print QR code
│   │   │   ├── QRBatchPrint.svelte       # print label batch multi-item
│   │   │   ├── CustomFieldForm.svelte    # render form dinamis dari definisi field
│   │   │   ├── CustomFieldBuilder.svelte # UI admin untuk tambah/edit field
│   │   │   ├── ChecklistBuilder.svelte   # UI admin untuk kelola checklist template
│   │   │   ├── MaintenanceModal.svelte   # modal catat maintenance + checklist + foto
│   │   │   ├── MaintenanceHistory.svelte # riwayat maintenance dengan snapshot nilai
│   │   │   ├── NotificationPanel.svelte  # panel notifikasi jadwal
│   │   │   ├── LocationPicker.svelte     # picker lokasi hierarkis (Gedung>Lantai>Ruangan)
│   │   │   ├── UserSwitcher.svelte       # pilih/ganti profil pengguna aktif
│   │   │   ├── BulkActionBar.svelte      # action bar saat multi-select items
│   │   │   ├── StatusBadge.svelte
│   │   │   ├── ConditionBadge.svelte
│   │   │   └── EmptyState.svelte
│   │   ├── stores/
│   │   │   ├── db.js             # writable store untuk database
│   │   │   ├── items.js          # items store
│   │   │   ├── activeUser.js     # profil pengguna yang sedang aktif
│   │   │   └── ui.js             # ui state (loading, modal, notif, dll)
│   │   └── utils/
│   │       ├── qr.js             # generate QR code utils
│   │       ├── export.js         # CSV / JSON / PDF export
│   │       ├── import.js         # CSV / JSON import
│   │       ├── notifications.js  # engine cek jadwal & generate notif
│   │       └── format.js         # date, currency, lokasi formatter
│   └── routes/
│       ├── +layout.svelte        # root layout
│       ├── +page.svelte          # Dashboard / Home
│       ├── items/
│       │   ├── +page.svelte      # List semua items + bulk action + filter
│       │   ├── new/
│       │   │   └── +page.svelte  # Form tambah item (standar + custom fields)
│       │   └── [id]/
│       │       ├── +page.svelte  # Detail item + maintenance history
│       │       └── edit/
│       │           └── +page.svelte  # Edit item (standar + custom fields)
│       ├── scan/
│       │   └── +page.svelte      # QR Scanner page
│       ├── categories/
│       │   └── +page.svelte      # Manage categories + custom fields + checklist
│       ├── reports/
│       │   └── +page.svelte      # Laporan: overdue, rekap aset, nilai, export
│       ├── locations/
│       │   └── +page.svelte      # Manage lokasi hierarkis
│       └── settings/
│           └── +page.svelte      # App settings + users management
├── static/
│   ├── favicon.svg
│   └── icons/                    # PWA icons
├── svelte.config.js
├── vite.config.js
├── tailwind.config.js
├── package.json
└── blueprint.md
```

---

## 6. Halaman & Fitur Detail

### 6.1 Dashboard (`/`)
- Header: nama perusahaan + logo + avatar pengguna aktif (klik → UserSwitcher)
- Badge notifikasi di header jika ada item overdue/upcoming
- Summary cards: Total Items, Available, In Use, Maintenance, Overdue
- Panel "Perlu Perhatian": items overdue maintenance atau warranty hampir habis
- Recent activity (7 terakhir)
- Quick actions: Scan QR, Add Item, Lihat Laporan
- Shortcut per kategori: klik kategori → langsung filter items

### 6.2 Items List (`/items`)
- Grid/List view toggle
- Filter: kategori, status, kondisi, lokasi (picker hierarkis)
- Search by nama / serial / QR code
- Sort: nama, tanggal, status, kondisi
- **Bulk Select**: checkbox per item → BulkActionBar muncul di bawah
  - Bulk: ganti status, ganti kondisi, pindah lokasi, print label, hapus
- Tombol: Add Item, Scan QR, Print Batch Label
- Pagination / infinite scroll

### 6.3 Add / Edit Item (`/items/new`, `/items/[id]/edit`)

Form dibagi dua bagian:

**A. Field Standar (semua kategori)**
- Nama item, Kategori, Brand, Model, Serial Number
- Lokasi (LocationPicker hierarkis: Gedung → Lantai → Ruangan) + Catatan lokasi
- Kondisi, Status, Tanggal Beli, Harga Beli, **Tanggal Garansi Habis**, Catatan
- Upload foto item (disimpan sebagai base64, max 500KB)
- Auto-generate QR Code UUID saat create
- Preview QR Code sebelum simpan

**B. Custom Fields (dinamis per kategori)**
- Setiap kategori bisa punya field tambahan yang dikonfigurasi sendiri
- Field ditambahkan di halaman Categories → tab "Custom Fields"
- Saat membuat/edit item, field tambahan muncul otomatis sesuai kategori yang dipilih
- Mendukung tipe field: `text`, `number`, `select` (dropdown), `date`, `textarea`, `boolean` (toggle)
- Nilai custom field disimpan terpisah di tabel `item_custom_values`

**Contoh custom fields per kategori:**

| Kategori | Contoh Custom Field |
|----------|-------------------|
| AC & Pendingin | Kapasitas BTU, Temperatur Default (°C), Tegangan (V), Ampere (A), Refrigerant Type, Tanggal Service Terakhir |
| Komputer & IT | Spesifikasi CPU, RAM (GB), Storage, OS, IP Address, MAC Address |
| Kendaraan | Nomor Polisi, Warna, Tahun, CC Mesin, Nomor STNK, Tanggal Pajak |
| Alat Ukur | Satuan Ukur, Range Min, Range Max, Akurasi, Tanggal Kalibrasi |
| Keamanan | Area Cakupan, IP Camera, Username, Port |

**Flow Maintenance Record via Custom Fields:**
Saat teknisi melakukan maintenance dan scan QR item AC, mereka bisa:
1. Update status → "maintenance"
2. Isi form custom fields: temperatur aktual, tegangan aktual, kondisi freon, dll
3. Semua nilai tersimpan di `item_custom_values` dengan timestamp
4. Riwayat nilai custom fields bisa dilihat di tab "History" detail item
5. Perubahan nilai tercatat di `activity_log` lengkap dengan siapa yang update

### 6.4 Detail Item (`/items/[id]`)
- Semua info item (field standar + custom fields)
- Custom fields yang punya `show_on_card=true` ditampilkan di bagian atas sebagai highlight
- QR Code display besar (bisa download/print single)
- Tab **"Info"**: semua detail item + nilai custom fields saat ini
- Tab **"Maintenance"**: riwayat semua maintenance records lengkap dengan checklist, foto, snapshot nilai
- Tab **"Aktivitas"**: log semua perubahan (siapa, kapan, apa)
- Tombol: Edit, **Catat Maintenance**, Pindah Lokasi, Check In/Out, Retire
- Modal "Catat Maintenance":
  - Pilih teknisi (dari daftar users)
  - Checklist template per kategori (centang poin yang sudah dikerjakan)
  - Upload foto dokumentasi (maks 3, compressed base64)
  - Update nilai custom fields (tegangan, suhu, dll)
  - Temuan & tindakan (textarea)
  - Biaya maintenance
- SweetAlert2 untuk konfirmasi action berbahaya (retire, hapus)

### 6.5 QR Scanner (`/scan`)
- Akses kamera (meminta permission dengan instruksi jelas jika ditolak)
- Scan QR → redirect ke detail item
- Jika QR tidak dikenal: SweetAlert2 "QR Code tidak terdaftar" + opsi tambah item baru
- Pilihan: torch on/off, flip camera (front/back)
- Mode "Scan & Update Status": scan langsung muncul popup ganti status tanpa masuk detail page — cocok untuk audit cepat

### 6.6 Categories (`/categories`)
- CRUD kategori (nama, icon FA, warna badge)
- Preview icon + warna realtime
- Tab **"Custom Fields"** per kategori:
  - Tambah field baru: isi label, pilih tipe, satuan, opsional/wajib
  - Drag & drop reorder urutan field
  - Toggle "Tampil di card" — field penting muncul di item card ringkasan
  - Hapus field (dengan warning jika sudah ada data)
  - Duplikasi field dari kategori lain sebagai template
- Tab **"Checklist Maintenance"** per kategori:
  - Tambah poin checklist: teks, urutan
  - Drag & drop reorder
  - Checklist ini muncul saat teknisi catat maintenance

**Tipe Field yang Tersedia:**
| Tipe | Input UI | Contoh Penggunaan |
|------|----------|-------------------|
| `text` | Input teks biasa | IP Address, Nomor Polisi |
| `number` | Input angka + satuan | Tegangan (V), Suhu (°C) |
| `select` | Dropdown + option builder | Tipe Refrigerant |
| `date` | Date picker | Tanggal Kalibrasi |
| `textarea` | Teks panjang | Catatan Spesifikasi |
| `boolean` | Toggle on/off | Inverter, Garansi Aktif |

### 6.7 Settings (`/settings`)
- **Nama Perusahaan** + Logo (upload, base64)
- Lokasi default untuk item baru
- Theme (light/dark)
- **Manajemen Users**: tambah/edit/nonaktifkan profil pengguna lokal
- **Manajemen Lokasi**: shortcut ke `/locations`
- Export semua data (JSON lengkap: items + custom values + maintenance + categories + fields)
- Import data (JSON)
- Reset / clear all data (dengan konfirmasi SweetAlert2 ketik "HAPUS SEMUA")

### 6.8 Locations (`/locations`) *(halaman baru)*
- Tree view: Gedung → Lantai → Ruangan
- Tambah/edit/hapus node lokasi
- Cek jumlah item di tiap lokasi
- Hapus lokasi hanya bisa jika tidak ada item di dalamnya (atau relokasi dulu)

### 6.9 Reports (`/reports`) *(halaman baru)*
- **Tab "Overdue & Upcoming"**:
  - Items yang maintenance-nya terlewat
  - Items yang jadwal maintenance-nya dalam 7/14/30 hari ke depan
  - Items dengan warranty yang hampir/sudah habis
- **Tab "Rekap Aset"**:
  - Total item per kategori, per lokasi, per status, per kondisi
  - Estimasi total nilai aset (dari purchase_price)
  - Items terlama tanpa maintenance
- **Tab "Riwayat Maintenance"**:
  - Semua maintenance records dengan filter tanggal, kategori, teknisi
  - Total biaya maintenance per periode
- Export semua tab ke CSV atau cetak (PDF via `window.print()`)

---

## 7. Design System

### 7.1 Color Palette (mengikuti referensi UI)
```css
:root {
  --bg:         #f0f2f7;
  --surface:    #ffffff;
  --surface2:   #f8f9fc;
  --border:     #e2e6ef;
  --text:       #1a1d27;
  --text-muted: #6b7280;
  --primary:    #6366f1;   /* indigo — aksi utama */
  --primary-h:  #4f46e5;
  --accent:     #10b981;   /* emerald — available/success */
  --warning:    #f59e0b;   /* amber — in_use/warning */
  --danger:     #ef4444;   /* red — broken/danger */
  --info:       #3b82f6;   /* blue — info */
}
```

### 7.2 Status Color Mapping
| Status | Warna | FA Icon |
|--------|-------|---------|
| available | `--accent` (#10b981) | `fa-circle-check` |
| in_use | `--warning` (#f59e0b) | `fa-person-walking` |
| maintenance | `--info` (#3b82f6) | `fa-screwdriver-wrench` |
| retired | `--text-muted` (#6b7280) | `fa-box-archive` |

### 7.3 Condition Color Mapping
| Kondisi | Warna | FA Icon |
|---------|-------|---------|
| good | `--accent` | `fa-thumbs-up` |
| fair | `--warning` | `fa-triangle-exclamation` |
| poor | `--danger` | `fa-circle-exclamation` |
| broken | `#7f1d1d` (red-900) | `fa-ban` |

### 7.4 Typography
- Font: `'Segoe UI', system-ui, -apple-system, sans-serif`
- Monospace (serial/QR): `'Cascadia Code', 'Fira Code', monospace`

### 7.5 Radius & Shadow (sama dengan referensi)
```css
--radius:    12px;
--radius-sm: 8px;
--shadow-sm: 0 1px 3px rgba(0,0,0,.08);
--shadow-md: 0 4px 12px rgba(0,0,0,.1);
```

---

## 8. Mobile-First Layout

### Bottom Navigation (mobile, < 768px)
```
[ Dashboard ] [ Items ] [ SCAN ] [ Reports ] [ Settings ]
  fa-house    fa-boxes  [QR btn]  fa-chart-bar  fa-gear
```
- Tombol Scan di tengah menonjol (floating style, warna primary)
- Badge merah di Dashboard jika ada notifikasi belum dibaca
- Desktop: sidebar navigation kiri dengan label teks

### Desktop Sidebar Navigation
```
[Logo + Nama Perusahaan]
─────────────────────────
fa-house        Dashboard      [badge notif]
fa-boxes        Items
fa-qrcode       Scan QR
fa-tags         Categories
fa-location-dot Locations
fa-chart-bar    Reports
─────────────────────────
fa-gear         Settings
─────────────────────────
[Avatar] Nama User Aktif  ▾
```

### Responsive Breakpoints
- Mobile: < 640px → single column, bottom nav
- Tablet: 640–1024px → 2 col grid, sidebar overlay
- Desktop: > 1024px → sidebar permanent, 3 col grid

---

## 9. QR Code Implementation

### Format QR Payload
```
INV-{UUID-v4}
contoh: INV-550e8400-e29b-41d4-a716-446655440000
```

### Flow Scan
```
Buka /scan → Request kamera → Scan QR
    ↓
Parse payload → Cek prefix "INV-"
    ↓
Query DB: SELECT * FROM items WHERE qr_code = ?
    ↓
Ditemukan → Navigate ke /items/[id]
Tidak ditemukan → SweetAlert2 error "QR Code tidak terdaftar"
```

### QR Label Print (Single)
- Template print-friendly
- Tampilkan: QR Code, Nama Item, Kategori, Lokasi, Serial/ID
- `window.print()` dengan CSS `@media print`

### QR Label Print (Batch)
- Pilih multiple items dari list → klik "Print Labels"
- Layout: 4 label per baris di kertas A4 (atau sesuaikan ukuran label)
- Setiap label: QR Code + Nama Item + Lokasi + ID singkat
- Preview sebelum print

---

## 10. Offline & PWA

### Service Worker Cache Strategy
- `cache-first` untuk assets (JS, CSS, icons)
- `network-first` untuk navigasi

### OPFS Data Persistence
- Database SQLite disimpan sebagai file di OPFS
- Auto-save setiap ada perubahan data (debounce 500ms)
- Backup manual via export JSON

### Notification Engine
Berjalan saat app dibuka (di `+layout.svelte`):
```javascript
// Pseudocode engine notifikasi
function runNotificationEngine(db) {
  const today = new Date();
  
  // 1. Cek custom fields bertipe 'date' yang punya suffix '_date' / 'next_'
  //    misal: next_service_date, next_calibration_date
  // 2. Cek warranty_expiry di tabel items
  // 3. Bandingkan dengan today + threshold (7 hari = upcoming, < today = overdue)
  // 4. Insert ke tabel notifications jika belum ada notif untuk item+type hari ini
  // 5. Update badge counter di header & dashboard
}
```
- Notifikasi tidak push ke sistem OS, cukup in-app
- Panel notif bisa dibuka dari header (icon `fa-bell`)
- Mark as read per item atau "tandai semua dibaca"

### Cloudflare Pages Headers
File `_headers` di folder `static/`:
```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
```
*Diperlukan untuk SharedArrayBuffer (WASM sql.js)*

---

## 11. SweetAlert2 Usage Patterns

```javascript
// Konfirmasi hapus
Swal.fire({
  title: 'Hapus item ini?',
  text: 'Tindakan ini tidak dapat dibatalkan.',
  icon: 'warning',
  showCancelButton: true,
  confirmButtonColor: '#ef4444',
  cancelButtonText: 'Batal',
  confirmButtonText: 'Ya, Hapus'
})

// Toast sukses
Swal.fire({
  toast: true,
  position: 'top-end',
  icon: 'success',
  title: 'Item berhasil disimpan',
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true
})

// Toast error
Swal.fire({
  toast: true,
  position: 'top-end',
  icon: 'error',
  title: 'Gagal menyimpan data',
  showConfirmButton: false,
  timer: 3000
})
```

---

## 12. Kategori Default (Seed Data)

| Nama | Icon FA | Warna |
|------|---------|-------|
| AC & Pendingin | `fa-snowflake` | #3b82f6 |
| Elektronik | `fa-plug` | #8b5cf6 |
| Komputer & IT | `fa-laptop` | #6366f1 |
| Furnitur Kantor | `fa-chair` | #f59e0b |
| Kendaraan | `fa-car` | #ef4444 |
| Peralatan Dapur | `fa-utensils` | #10b981 |
| Alat Ukur | `fa-ruler` | #06b6d4 |
| Keamanan | `fa-shield` | #64748b |
| Lainnya | `fa-box` | #6b7280 |

---

## 13. Rencana Implementasi (Urutan Pengerjaan)

### Phase 1 — Fondasi
- [ ] Setup proyek SvelteKit + Tailwind + Vite
- [ ] Konfigurasi adapter-static untuk Cloudflare Pages
- [ ] Setup sql.js + OPFS database layer
- [ ] Buat schema & migrations (semua tabel)
- [ ] Seed data: kategori default + custom fields default + checklist default + lokasi contoh

### Phase 2 — Core UI & Users
- [ ] Layout utama (Header + BottomNav mobile + Sidebar desktop)
- [ ] Design system (CSS variables, komponen dasar)
- [ ] Integrasi Font Awesome 6 Free (CDN) — **satu-satunya sumber icon**
- [ ] Integrasi SweetAlert2
- [ ] UserSwitcher: pilih/tambah profil pengguna lokal
- [ ] Dashboard page (summary cards + panel notifikasi + recent activity)

### Phase 3 — Lokasi & CRUD Items
- [ ] Locations page: tree view hierarkis + CRUD
- [ ] LocationPicker komponen
- [ ] Items list page (grid + filter + search + bulk select)
- [ ] BulkActionBar komponen
- [ ] Add item form (standar + location picker)
- [ ] Edit item form
- [ ] Detail item page (tab Info + tab Maintenance + tab Aktivitas)
- [ ] Delete item (konfirmasi Swal)

### Phase 3b — Custom Fields & Checklist System
- [ ] UI Custom Field Builder di halaman Categories
- [ ] CRUD `category_fields` (tambah, edit, hapus, reorder)
- [ ] Komponen `CustomFieldForm.svelte` — render form input dinamis
- [ ] Simpan & load `item_custom_values`
- [ ] ChecklistBuilder di halaman Categories
- [ ] Modal Catat Maintenance (checklist + foto + custom fields + biaya)
- [ ] `maintenance_records` dengan snapshot
- [ ] Tampil riwayat maintenance di detail item

### Phase 4 — QR Code
- [ ] Generate QR Code saat create item
- [ ] QR Display single + download + print
- [ ] QR Batch Print (multi-item, layout A4)
- [ ] QR Scanner page (html5-qrcode)
- [ ] Mode "Scan & Update Status" (popup cepat)
- [ ] Scan → navigate to detail

### Phase 5 — Notifikasi & Reports
- [ ] Notification engine (cek jadwal saat app buka)
- [ ] NotificationPanel komponen
- [ ] Reports page: tab Overdue, tab Rekap Aset, tab Riwayat Maintenance
- [ ] Export CSV dan print PDF dari reports

### Phase 6 — Settings & Export/Import
- [ ] Settings page (Nama Perusahaan, logo, users, theme)
- [ ] Export JSON lengkap (semua data + definisi fields)
- [ ] Import JSON
- [ ] Dark mode
- [ ] Reset data dengan konfirmasi ketik "HAPUS SEMUA"

### Phase 7 — PWA & Deploy
- [ ] vite-plugin-pwa setup
- [ ] Service worker config
- [ ] `_headers` Cloudflare
- [ ] Test di mobile (Android Chrome + iOS Safari)
- [ ] Deploy ke Cloudflare Pages

---

## 14. Catatan Teknis Penting

1. **HTTPS wajib** untuk akses kamera (QR scan). Cloudflare Pages otomatis HTTPS.
2. **SharedArrayBuffer** diperlukan oleh sql.js — butuh header COOP/COEP (lihat `_headers`).
3. **OPFS** hanya tersedia di browser modern (Chrome 86+, Firefox 111+, Safari 15.2+). Fallback: localStorage untuk data kecil.
4. **Base64 image** — gambar item & foto maintenance disimpan sebagai base64 di SQLite. Batasi upload (max 500KB per foto, compress di browser sebelum simpan menggunakan Canvas API).
5. **Font Awesome 6 Free** — diload via CDN (`https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.x.x/css/all.min.css`). **Tidak ada icon dari library lain** — semua icon di seluruh aplikasi wajib menggunakan FA Free.
6. **SvelteKit static** — gunakan `prerender = true` + `trailingSlash = 'always'` untuk Cloudflare Pages compatibility.
7. **QR Code UUID** — generate di frontend menggunakan `crypto.randomUUID()` (native browser API, no library needed).
8. **Custom fields schema** — `field_options` untuk tipe `select` disimpan sebagai JSON string di SQLite, di-parse saat dibutuhkan.
9. **Maintenance snapshot** — `field_snapshot` dan `checklist_snapshot` di `maintenance_records` menyimpan JSON sehingga riwayat tidak terpengaruh jika field/checklist dihapus di masa depan.
10. **Export lengkap** — saat export JSON, sertakan semua tabel (`categories`, `category_fields`, `checklist_templates`, `locations`, `items`, `item_custom_values`, `maintenance_records`, `activity_log`) agar bisa di-import ulang secara utuh.
11. **Notification engine** — bukan push notification, murni in-app. Jalankan di layout `onMount` dengan `requestIdleCallback` agar tidak memblokir render.
12. **Lokasi hierarkis** — gunakan recursive query SQLite (`WITH RECURSIVE`) untuk build tree lokasi. sql.js mendukung ini.
13. **Users lokal** — tidak ada password/auth. Simpan `active_user_id` di localStorage. Pilih profil cukup dengan klik di UserSwitcher.
14. **JSZip** — untuk bulk export QR Code sebagai ZIP, generate canvas QR di browser lalu masukkan ke zip, download sekali klik.

---

## 15. Font Awesome 6 Free — Referensi Icon yang Digunakan

Semua icon dalam aplikasi menggunakan FA Free. Berikut mapping lengkap:

| Konteks | FA Class |
|---------|----------|
| **Navigasi** | |
| Dashboard | `fa-solid fa-house` |
| Items | `fa-solid fa-boxes-stacked` |
| Scan QR | `fa-solid fa-qrcode` |
| Categories | `fa-solid fa-tags` |
| Locations | `fa-solid fa-location-dot` |
| Reports | `fa-solid fa-chart-bar` |
| Settings | `fa-solid fa-gear` |
| Notifikasi | `fa-solid fa-bell` |
| **Actions** | |
| Tambah | `fa-solid fa-plus` |
| Edit | `fa-solid fa-pen-to-square` |
| Hapus | `fa-solid fa-trash` |
| Simpan | `fa-solid fa-floppy-disk` |
| Scan | `fa-solid fa-camera` |
| Download | `fa-solid fa-download` |
| Upload/Import | `fa-solid fa-upload` |
| Export | `fa-solid fa-file-export` |
| Print | `fa-solid fa-print` |
| Filter | `fa-solid fa-filter` |
| Search | `fa-solid fa-magnifying-glass` |
| Refresh | `fa-solid fa-rotate` |
| Close/X | `fa-solid fa-xmark` |
| Back | `fa-solid fa-arrow-left` |
| Checklist | `fa-solid fa-list-check` |
| Foto | `fa-solid fa-image` |
| **Status** | |
| Available | `fa-solid fa-circle-check` |
| In Use | `fa-solid fa-person-walking` |
| Maintenance | `fa-solid fa-screwdriver-wrench` |
| Retired | `fa-solid fa-box-archive` |
| **Kondisi** | |
| Good | `fa-solid fa-thumbs-up` |
| Fair | `fa-solid fa-triangle-exclamation` |
| Poor | `fa-solid fa-circle-exclamation` |
| Broken | `fa-solid fa-ban` |
| **Custom Field Types** | |
| Text | `fa-solid fa-font` |
| Number | `fa-solid fa-hashtag` |
| Select | `fa-solid fa-chevron-down` |
| Date | `fa-solid fa-calendar-days` |
| Textarea | `fa-solid fa-align-left` |
| Boolean | `fa-solid fa-toggle-on` |
| **Kategori Default** | |
| AC & Pendingin | `fa-solid fa-snowflake` |
| Elektronik | `fa-solid fa-plug` |
| Komputer & IT | `fa-solid fa-laptop` |
| Furnitur Kantor | `fa-solid fa-chair` |
| Kendaraan | `fa-solid fa-car` |
| Peralatan Dapur | `fa-solid fa-utensils` |
| Alat Ukur | `fa-solid fa-ruler` |
| Keamanan | `fa-solid fa-shield-halved` |
| Lainnya | `fa-solid fa-box` |
| **Misc** | |
| User/Profil | `fa-solid fa-user` |
| Users | `fa-solid fa-users` |
| Lokasi | `fa-solid fa-map-marker-alt` |
| Lantai | `fa-solid fa-layer-group` |
| Ruangan | `fa-solid fa-door-open` |
| Gedung | `fa-solid fa-building` |
| Warning | `fa-solid fa-triangle-exclamation` |
| Info | `fa-solid fa-circle-info` |
| Success | `fa-solid fa-circle-check` |
| Overdue | `fa-solid fa-clock` |
| Biaya | `fa-solid fa-money-bill-wave` |
| QR Code | `fa-solid fa-qrcode` |

---

*Blueprint ini akan diupdate sesuai perkembangan implementasi.*

---

## 16. Sistem Autentikasi & Role-Based Permission

> Ditambahkan: Versi 1.2
> Status: Akan diimplementasi di Phase 7

### 16.1 Latar Belakang

Aplikasi ini berjalan full client-side (tanpa server backend). Sistem autentikasi yang diimplementasikan bersifat **client-side authentication** — cukup untuk mencegah akses tidak sengaja dan kesalahan operasional, bukan untuk keamanan tingkat enterprise.

Password di-hash menggunakan **SHA-256** sebelum disimpan ke SQLite. Session disimpan di `sessionStorage` sehingga otomatis hilang saat browser/tab ditutup.

---

### 16.2 Perubahan Database

#### Tabel `users` — tambah kolom `password_hash`

```sql
ALTER TABLE users ADD COLUMN password_hash TEXT;
-- NULL = belum set password (hanya untuk transisi dari versi lama)
-- Wajib diisi saat buat user baru
```

#### Tabel `sessions` — track session aktif (opsional, via sessionStorage saja)

Tidak perlu tabel tambahan. Session cukup disimpan di `sessionStorage`:

```javascript
// sessionStorage key: 'inv_session'
{
  user_id:    1,
  user_name:  "Admin",
  role:       "admin",
  logged_in_at: "2026-08-06T10:00:00.000Z"
}
```

Session hilang otomatis saat:
- Tab browser ditutup
- Browser ditutup
- User klik Logout

---

### 16.3 Role & Permission Matrix

| Aksi | Admin | Technician | Staff | Viewer |
|------|:-----:|:----------:|:-----:|:------:|
| **Lihat semua halaman** | ✓ | ✓ | ✓ | ✓ |
| **Tambah item baru** | ✓ | ✓ | ✓ | ✗ |
| **Edit item** | ✓ | ✓ | ✓ | ✗ |
| **Hapus item** | ✓ | ✗ | ✗ | ✗ |
| **Scan QR + lihat detail** | ✓ | ✓ | ✓ | ✓ |
| **Update status via scan** | ✓ | ✓ | ✓ | ✗ |
| **Catat maintenance** | ✓ | ✓ | ✗ | ✗ |
| **Bulk actions (status/kondisi)** | ✓ | ✓ | ✓ | ✗ |
| **Bulk delete** | ✓ | ✗ | ✗ | ✗ |
| **Kelola kategori & custom fields** | ✓ | ✗ | ✗ | ✗ |
| **Kelola lokasi** | ✓ | ✗ | ✗ | ✗ |
| **Pengaturan umum (nama, logo)** | ✓ | ✗ | ✗ | ✗ |
| **Kelola users** | ✓ | ✗ | ✗ | ✗ |
| **Export data** | ✓ | ✗ | ✗ | ✗ |
| **Import data** | ✓ | ✗ | ✗ | ✗ |
| **Reset semua data** | ✓ | ✗ | ✗ | ✗ |
| **Lihat laporan** | ✓ | ✓ | ✓ | ✓ |

---

### 16.4 Flow Autentikasi

```
Pertama kali buka app (belum ada user)
    ↓
Redirect ke /setup — wajib buat akun Admin pertama
    ↓
Isi nama + password Admin → Simpan
    ↓
Redirect ke /login

─────────────────────────────────────────

Login normal:
    ↓
Halaman /login — pilih username → masuk password
    ↓
SHA-256(password) === password_hash di DB?
    ├── Ya  → Simpan session ke sessionStorage → Redirect ke /
    └── Tidak → Tampil SweetAlert2 error "Password salah"

─────────────────────────────────────────

Dalam app:
    ↓
Setiap navigasi → layout cek sessionStorage
    ├── Session ada & valid → lanjut render
    └── Session tidak ada → redirect ke /login

─────────────────────────────────────────

Logout:
    ↓
Klik Logout → Hapus sessionStorage → Redirect ke /login
```

---

### 16.5 Implementasi Permission di UI

Permission di-check menggunakan **helper function** yang dibaca dari session aktif:

```javascript
// src/lib/auth/permissions.js

export const PERMISSIONS = {
  admin: {
    canEdit: true, canDelete: true, canMaintenance: true,
    canManageCategories: true, canManageLocations: true,
    canSettings: true, canExport: true, canReset: true
  },
  technician: {
    canEdit: true, canDelete: false, canMaintenance: true,
    canManageCategories: false, canManageLocations: false,
    canSettings: false, canExport: false, canReset: false
  },
  staff: {
    canEdit: true, canDelete: false, canMaintenance: false,
    canManageCategories: false, canManageLocations: false,
    canSettings: false, canExport: false, canReset: false
  },
  viewer: {
    canEdit: false, canDelete: false, canMaintenance: false,
    canManageCategories: false, canManageLocations: false,
    canSettings: false, canExport: false, canReset: false
  }
};

export function can(permission) {
  const session = getSession();
  if (!session) return false;
  return PERMISSIONS[session.role]?.[permission] ?? false;
}
```

Di komponen Svelte:

```svelte
{#if can('canDelete')}
  <button class="btn btn-danger" on:click={handleDelete}>
    <i class="fa-solid fa-trash"></i> Hapus
  </button>
{/if}

{#if can('canMaintenance')}
  <button class="btn btn-primary" on:click={() => showMaintModal = true}>
    <i class="fa-solid fa-screwdriver-wrench"></i> Catat Maintenance
  </button>
{/if}
```

Untuk halaman yang sepenuhnya terkunci (Settings, Categories):

```javascript
// Di +layout.svelte atau per halaman
if (!can('canSettings')) goto('/');
```

---

### 16.6 Halaman Baru yang Diperlukan

| Halaman | Route | Keterangan |
|---------|-------|------------|
| Setup Admin | `/setup` | Hanya muncul jika belum ada user sama sekali |
| Login | `/login` | Form pilih user + masuk password |

---

### 16.7 Perubahan di Komponen yang Ada

| File | Perubahan |
|------|-----------|
| `+layout.svelte` | Cek session setiap render, redirect ke `/login` jika tidak ada |
| `src/lib/stores/ui.js` | Tambah `currentUser` store dari sessionStorage |
| `src/lib/db/users.js` | Tambah fungsi `setPassword`, `verifyPassword`, `hashPassword` |
| `src/lib/db/seed.js` | Hapus auto-seed users — user dibuat manual di `/setup` |
| `Header.svelte` | Tombol Logout, tampilkan nama + role user aktif |
| `UserSwitcher.svelte` | Hapus komponen ini — diganti sistem login |
| `items/[id]/+page.svelte` | Sembunyikan tombol Delete, Maintenance berdasarkan role |
| `items/+page.svelte` | Sembunyikan bulk delete, tombol Add Item berdasarkan role |
| `categories/+page.svelte` | Redirect jika bukan Admin |
| `locations/+page.svelte` | Redirect jika bukan Admin |
| `settings/+page.svelte` | Redirect jika bukan Admin |
| `reports/+page.svelte` | Akses semua role, tapi export hanya Admin |

---

### 16.8 Keamanan & Batasan

**Yang dilindungi:**
- Akses UI — tombol dan halaman tersembunyi sesuai role
- Redirect otomatis jika belum login atau tidak punya permission
- Session expire saat browser ditutup

**Yang TIDAK dilindungi (keterbatasan client-side):**
- User teknis bisa membuka DevTools dan melihat/mengubah sessionStorage
- Password hash bisa dilihat langsung dari SQLite di DevTools → Application → OPFS
- Tidak ada enkripsi data di storage

**Kesimpulan:** Sistem ini **cukup untuk operasional sehari-hari** di lingkungan kerja normal. Bukan untuk menyimpan data sangat rahasia.

---

### 16.9 Rencana Implementasi (Phase 7)

- [ ] Tambah `password_hash` ke tabel `users` + migration
- [ ] Buat `src/lib/auth/` — `hash.js`, `session.js`, `permissions.js`
- [ ] Halaman `/setup` — buat admin pertama kali
- [ ] Halaman `/login` — form login dengan password
- [ ] Update `+layout.svelte` — auth guard global
- [ ] Update `Header.svelte` — tampil user aktif + tombol logout
- [ ] Hapus `UserSwitcher.svelte`
- [ ] Update `seed.js` — hapus auto-seed users default
- [ ] Apply permission di semua halaman dan komponen
- [ ] Test semua role skenario

---

*Blueprint ini akan diupdate sesuai perkembangan implementasi.*
