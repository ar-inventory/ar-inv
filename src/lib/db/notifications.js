import { run, get, all } from './database.js';
import { getAllItems } from './items.js';

export function getUnreadNotifications() {
  return all(`
    SELECT n.*, i.name as item_name, i.qr_code, c.icon as category_icon
    FROM notifications n
    LEFT JOIN items i ON n.item_id = i.id
    LEFT JOIN categories c ON i.category_id = c.id
    WHERE n.is_read = 0
    ORDER BY n.due_date ASC, n.created_at DESC
  `);
}

export function getAllNotifications(limit = 50) {
  return all(`
    SELECT n.*, i.name as item_name, i.qr_code, c.icon as category_icon
    FROM notifications n
    LEFT JOIN items i ON n.item_id = i.id
    LEFT JOIN categories c ON i.category_id = c.id
    ORDER BY n.is_read ASC, n.created_at DESC
    LIMIT ?
  `, [limit]);
}

export function getUnreadCount() {
  return get('SELECT COUNT(*) as cnt FROM notifications WHERE is_read = 0')?.cnt ?? 0;
}

export function markAsRead(id) {
  run('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
}

export function markAllAsRead() {
  run('UPDATE notifications SET is_read = 1 WHERE is_read = 0');
}

function upsertNotification({ item_id, type, message, due_date }) {
  // Cek apakah sudah ada notif unread untuk item+type ini
  const existing = get(
    'SELECT id FROM notifications WHERE item_id = ? AND type = ? AND is_read = 0',
    [item_id, type]
  );
  if (existing) return; // Sudah ada, skip

  run(
    'INSERT INTO notifications (item_id, type, message, due_date) VALUES (?, ?, ?, ?)',
    [item_id, type, message, due_date ?? null]
  );
}

// ── Engine: jalankan saat app dibuka ─────────────────
// Parse 'YYYY-MM-DD' sebagai local midnight agar konsisten dengan
// datetime('now','localtime') di database (bukan UTC).
function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function runNotificationEngine() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in14 = new Date(today); in14.setDate(in14.getDate() + 14);
  const in30 = new Date(today); in30.setDate(in30.getDate() + 30);

  // Ambil semua item yang perlu dicek
  const items = all(`
    SELECT i.*, c.name as category_name
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    WHERE i.status != 'retired'
  `);

  items.forEach(item => {
    // 1. Cek warranty_expiry
    if (item.warranty_expiry) {
      const expiry = parseLocalDate(item.warranty_expiry);
      if (expiry < today) {
        upsertNotification({
          item_id: item.id,
          type: 'warranty_expired',
          message: `Garansi ${item.name} sudah habis sejak ${item.warranty_expiry}`,
          due_date: item.warranty_expiry
        });
      } else if (expiry <= in30) {
        upsertNotification({
          item_id: item.id,
          type: 'warranty_expiry',
          message: `Garansi ${item.name} akan habis pada ${item.warranty_expiry}`,
          due_date: item.warranty_expiry
        });
      }
    }
  });

  // 2. Cek custom field bertipe 'date' dengan nama mengandung 'next_' atau 'jadwal_'
  const dateFields = all(`
    SELECT icv.item_id, icv.value, cf.field_label, i.name as item_name
    FROM item_custom_values icv
    JOIN category_fields cf ON icv.field_id = cf.id
    JOIN items i ON icv.item_id = i.id
    WHERE cf.field_type = 'date'
      AND (cf.field_key LIKE 'next_%' OR cf.field_key LIKE 'jadwal_%' OR cf.field_key LIKE '%_next_%')
      AND icv.value IS NOT NULL AND icv.value != ''
      AND i.status != 'retired'
  `);

  dateFields.forEach(row => {
    if (!row.value) return;
    const dueDate = parseLocalDate(row.value);
    if (dueDate < today) {
      upsertNotification({
        item_id: row.item_id,
        type: 'overdue_maintenance',
        message: `${row.item_name} — ${row.field_label} sudah lewat: ${row.value}`,
        due_date: row.value
      });
    } else if (dueDate <= in14) {
      upsertNotification({
        item_id: row.item_id,
        type: 'upcoming_maintenance',
        message: `${row.item_name} — ${row.field_label} dalam ${Math.ceil((dueDate - today) / 86400000)} hari (${row.value})`,
        due_date: row.value
      });
    }
  });
}

export const NOTIF_ICONS = {
  overdue_maintenance:  'fa-solid fa-clock text-danger',
  upcoming_maintenance: 'fa-solid fa-bell text-warning',
  warranty_expired:     'fa-solid fa-shield-halved text-danger',
  warranty_expiry:      'fa-solid fa-shield-halved text-warning'
};

export const NOTIF_LABELS = {
  overdue_maintenance:  'Maintenance Terlambat',
  upcoming_maintenance: 'Jadwal Maintenance Dekat',
  warranty_expired:     'Garansi Sudah Habis',
  warranty_expiry:      'Garansi Hampir Habis'
};
