/**
 * import.js — Import data dari JSON backup
 */
import { getDb, scheduleSave } from '$lib/db/database.js';

export async function importFromJSON(jsonText) {
  let dump;
  try { dump = JSON.parse(jsonText); }
  catch { throw new Error('File JSON tidak valid'); }

  if (!dump.version || !dump.tables) throw new Error('Format backup tidak dikenali');

  const db = getDb();
  const order = [
    'settings', 'users', 'locations', 'categories',
    'category_fields', 'checklist_templates',
    'items', 'item_custom_values',
    'activity_log', 'maintenance_records', 'notifications'
  ];

  // Hapus data lama dulu (dalam urutan terbalik untuk FK)
  const deleteOrder = [...order].reverse();
  deleteOrder.forEach(t => {
    try { db.run(`DELETE FROM ${t}`); } catch {}
  });
  try { db.run(`DELETE FROM sqlite_sequence`); } catch {}

  // Insert data baru
  let importedCount = 0;
  for (const table of order) {
    const rows = dump.tables[table];
    if (!rows?.length) continue;

    const cols = Object.keys(rows[0]);
    const ph   = cols.map(() => '?').join(',');
    const sql  = `INSERT OR IGNORE INTO ${table} (${cols.join(',')}) VALUES (${ph})`;

    for (const row of rows) {
      try {
        db.run(sql, cols.map(c => row[c]));
        importedCount++;
      } catch (e) {
        console.warn(`[Import] Skip row di ${table}:`, e.message);
      }
    }
  }

  scheduleSave();
  return importedCount;
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsText(file, 'utf-8');
  });
}
