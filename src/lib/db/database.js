/**
 * database.js — Inisialisasi sql.js + OPFS persistent storage
 *
 * Strategi:
 * 1. Coba load database dari OPFS (jika sudah ada sebelumnya)
 * 2. Jika belum ada / OPFS tidak support → buat database baru di memory
 * 3. Setiap perubahan data → auto-save ke OPFS (debounce 500ms)
 */

let db = null;
let SQL = null;
let saveTimer = null;
const DB_FILENAME = 'inventory.db';

// ── Deteksi OPFS support ──────────────────────────────
function isOPFSSupported() {
  return (
    typeof navigator !== 'undefined' &&
    'storage' in navigator &&
    'getDirectory' in navigator.storage
  );
}

// ── Load sql.js (WASM) ────────────────────────────────
async function loadSqlJs() {
  if (SQL) return SQL;

  // Fetch sql-wasm.js dan eval dengan CommonJS shim
  // Cara ini bypass bundler dan bekerja di semua browser modern
  const res = await fetch('/sql.js/sql-wasm.js');
  if (!res.ok) throw new Error(`Gagal fetch sql-wasm.js: ${res.status}`);
  const scriptText = await res.text();

  // Buat CommonJS shim agar module.exports bekerja di browser
  const wrapped = `
    var module = { exports: {} };
    var exports = module.exports;
    var require = function() { return {}; };
    ${scriptText}
    return module.exports;
  `;
  // eslint-disable-next-line no-new-func
  let initSqlJs;
  try {
    initSqlJs = new Function(wrapped)();
  } catch (e) {
    throw new Error('Gagal parse sql-wasm.js: ' + e.message);
  }

  if (typeof initSqlJs !== 'function') {
    throw new Error('initSqlJs bukan fungsi — cek format file sql-wasm.js');
  }

  SQL = await initSqlJs({
    locateFile: (file) => `/sql.js/${file}`
  });
  return SQL;
}

// ── Baca database dari OPFS ───────────────────────────
async function loadFromOPFS() {
  if (!isOPFSSupported()) return null;
  try {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(DB_FILENAME);
    const file = await fileHandle.getFile();
    const buffer = await file.arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    // File belum ada — first run
    return null;
  }
}

// ── Simpan database ke OPFS ───────────────────────────
async function saveToOPFS(database) {
  if (!isOPFSSupported()) return;
  try {
    const data = database.export();
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(DB_FILENAME, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();
  } catch (e) {
    console.warn('[DB] Gagal simpan ke OPFS:', e);
  }
}

// ── Auto-save dengan debounce ─────────────────────────
export function scheduleSave() {
  if (!db) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveToOPFS(db), 500);
}

// ── Inisialisasi database ─────────────────────────────
export async function initDatabase() {
  if (db) return db;

  const SqlJs = await loadSqlJs();

  const existingData = await loadFromOPFS();

  if (existingData && existingData.length > 0) {
    db = new SqlJs.Database(existingData);
    console.log('[DB] Database di-load dari OPFS');
  } else {
    db = new SqlJs.Database();
    console.log('[DB] Database baru dibuat');
    await runMigrations(db);
    scheduleSave();
  }

  return db;
}

// ── Getter database instance ──────────────────────────
export function getDb() {
  if (!db) throw new Error('Database belum diinisialisasi. Panggil initDatabase() terlebih dahulu.');
  return db;
}

// ── Helper: query dengan parameter ───────────────────
export function query(sql, params = []) {
  const d = getDb();
  return d.exec(sql, params);
}

export function run(sql, params = []) {
  const d = getDb();
  d.run(sql, params);
  scheduleSave();
}

export function get(sql, params = []) {
  const d = getDb();
  const result = d.exec(sql, params);
  if (!result.length || !result[0].values.length) return null;
  const cols = result[0].columns;
  const row = result[0].values[0];
  return Object.fromEntries(cols.map((c, i) => [c, row[i]]));
}

export function all(sql, params = []) {
  const d = getDb();
  const result = d.exec(sql, params);
  if (!result.length) return [];
  const cols = result[0].columns;
  return result[0].values.map(row =>
    Object.fromEntries(cols.map((c, i) => [c, row[i]]))
  );
}

export function getLastInsertId() {
  const result = get('SELECT last_insert_rowid() as id');
  return result?.id ?? null;
}

// ── MIGRATIONS ────────────────────────────────────────
async function runMigrations(database) {
  console.log('[DB] Menjalankan migrations...');

  database.run(`PRAGMA journal_mode = WAL;`);
  database.run(`PRAGMA foreign_keys = ON;`);

  // ── Tabel: settings ──────────────────────────────────
  database.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // ── Tabel: users ─────────────────────────────────────
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      role          TEXT DEFAULT 'staff',
      avatar_color  TEXT DEFAULT '#6366f1',
      is_active     INTEGER DEFAULT 1,
      password_hash TEXT,
      created_at    TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  // ── Tabel: locations ─────────────────────────────────
  database.run(`
    CREATE TABLE IF NOT EXISTS locations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      parent_id  INTEGER REFERENCES locations(id) ON DELETE SET NULL,
      level      INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  // ── Tabel: categories ────────────────────────────────
  database.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL UNIQUE,
      icon       TEXT DEFAULT 'fa-solid fa-box',
      color      TEXT DEFAULT '#6b7280',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  // ── Tabel: category_fields ───────────────────────────
  database.run(`
    CREATE TABLE IF NOT EXISTS category_fields (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id   INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      field_key     TEXT NOT NULL,
      field_label   TEXT NOT NULL,
      field_type    TEXT NOT NULL DEFAULT 'text',
      field_options TEXT,
      field_unit    TEXT,
      is_required   INTEGER DEFAULT 0,
      show_on_card  INTEGER DEFAULT 0,
      sort_order    INTEGER DEFAULT 0,
      created_at    TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(category_id, field_key)
    );
  `);

  // ── Tabel: checklist_templates ───────────────────────
  database.run(`
    CREATE TABLE IF NOT EXISTS checklist_templates (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      item_text   TEXT NOT NULL,
      sort_order  INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  // ── Tabel: items ─────────────────────────────────────
  database.run(`
    CREATE TABLE IF NOT EXISTS items (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      qr_code         TEXT NOT NULL UNIQUE,
      name            TEXT NOT NULL,
      category_id     INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      brand           TEXT,
      model           TEXT,
      serial_no       TEXT,
      location_id     INTEGER REFERENCES locations(id) ON DELETE SET NULL,
      location_note   TEXT,
      condition       TEXT DEFAULT 'good',
      status          TEXT DEFAULT 'available',
      purchase_date   TEXT,
      purchase_price  REAL,
      warranty_expiry TEXT,
      notes           TEXT,
      image_url       TEXT,
      created_at      TEXT DEFAULT (datetime('now','localtime')),
      updated_at      TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  // ── Tabel: item_custom_values ────────────────────────
  database.run(`
    CREATE TABLE IF NOT EXISTS item_custom_values (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id    INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      field_id   INTEGER NOT NULL REFERENCES category_fields(id) ON DELETE CASCADE,
      value      TEXT,
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(item_id, field_id)
    );
  `);

  // ── Tabel: activity_log ──────────────────────────────
  database.run(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id    INTEGER REFERENCES items(id) ON DELETE CASCADE,
      action     TEXT NOT NULL,
      user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      user_name  TEXT,
      notes      TEXT,
      meta       TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  // ── Tabel: maintenance_records ───────────────────────
  database.run(`
    CREATE TABLE IF NOT EXISTS maintenance_records (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id            INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      activity_id        INTEGER REFERENCES activity_log(id) ON DELETE SET NULL,
      technician_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
      technician         TEXT,
      findings           TEXT,
      actions_taken      TEXT,
      field_snapshot     TEXT,
      checklist_snapshot TEXT,
      photos             TEXT,
      cost               REAL,
      created_at         TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  // ── Tabel: notifications ─────────────────────────────
  database.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id    INTEGER REFERENCES items(id) ON DELETE CASCADE,
      type       TEXT NOT NULL,
      message    TEXT NOT NULL,
      is_read    INTEGER DEFAULT 0,
      due_date   TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  // ── Indexes ──────────────────────────────────────────
  database.run(`CREATE INDEX IF NOT EXISTS idx_items_category    ON items(category_id);`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_items_location    ON items(location_id);`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_items_status      ON items(status);`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_items_qr          ON items(qr_code);`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_activity_item     ON activity_log(item_id);`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_maintenance_item  ON maintenance_records(item_id);`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_notif_read        ON notifications(is_read);`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_custom_val_item   ON item_custom_values(item_id);`);

  // ── Migration: tambah kolom baru jika belum ada (untuk DB lama) ──
  try { database.run(`ALTER TABLE users ADD COLUMN password_hash TEXT`); } catch {}

  console.log('[DB] Migrations selesai.');
}

// ── Export database sebagai Uint8Array ────────────────
export function exportDatabase() {
  return getDb().export();
}

// ── Reset database (hapus semua data) ────────────────
export async function resetDatabase() {
  const d = getDb();
  const tables = [
    'notifications', 'maintenance_records', 'activity_log',
    'item_custom_values', 'items', 'checklist_templates',
    'category_fields', 'categories', 'locations', 'users', 'settings'
  ];
  tables.forEach(t => d.run(`DELETE FROM ${t};`));
  d.run(`DELETE FROM sqlite_sequence;`);
  await saveToOPFS(d);
}
