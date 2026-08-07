/**
 * export.js — Export data ke JSON dan CSV
 */
import { getDb } from '$lib/db/database.js';
import { all }   from '$lib/db/database.js';

// ── Full JSON export ───────────────────────────────
export function exportFullJSON() {
  const tables = [
    'settings', 'users', 'locations', 'categories',
    'category_fields', 'checklist_templates',
    'items', 'item_custom_values',
    'activity_log', 'maintenance_records', 'notifications'
  ];

  const dump = { version: 1, exported_at: new Date().toISOString(), tables: {} };
  for (const t of tables) {
    try { dump.tables[t] = all(`SELECT * FROM ${t}`); }
    catch { dump.tables[t] = []; }
  }
  return JSON.stringify(dump, null, 2);
}

export function downloadJSON(filename = 'inventory-backup') {
  const json = exportFullJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${filename}-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── CSV export ─────────────────────────────────────
export function exportItemsCSV() {
  const rows = all(`
    SELECT i.id, i.qr_code, i.name,
           c.name  AS category, i.brand, i.model, i.serial_no,
           l.name  AS location, i.location_note,
           i.condition, i.status,
           i.purchase_date, i.purchase_price, i.warranty_expiry,
           i.notes, i.created_at, i.updated_at
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN locations  l ON i.location_id  = l.id
    ORDER BY i.name ASC
  `);
  if (!rows.length) return '';

  const headers = Object.keys(rows[0]);
  const escape  = v => {
    if (v == null) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(','))
  ];
  return lines.join('\r\n');
}

export function downloadCSV(filename = 'inventory-items') {
  const csv  = exportItemsCSV();
  if (!csv) return;
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${filename}-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadMaintenanceCSV() {
  const rows = all(`
    SELECT mr.id, i.name AS item_name, c.name AS category,
           mr.technician, mr.findings, mr.actions_taken,
           mr.cost, mr.created_at
    FROM maintenance_records mr
    LEFT JOIN items i      ON mr.item_id = i.id
    LEFT JOIN categories c ON i.category_id = c.id
    ORDER BY mr.created_at DESC
  `);
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const escape  = v => {
    if (v == null) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(','))
  ];
  const csv  = lines.join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `maintenance-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
