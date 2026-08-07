import { run, get, all, getLastInsertId } from './database.js';

export const ACTION_LABELS = {
  create:      'Ditambahkan',
  update:      'Diperbarui',
  maintenance: 'Maintenance',
  check_in:    'Check In',
  check_out:   'Check Out',
  relocate:    'Dipindahkan',
  retire:      'Dinonaktifkan',
  delete:      'Dihapus'
};

export const ACTION_ICONS = {
  create:      'fa-solid fa-plus',
  update:      'fa-solid fa-pen-to-square',
  maintenance: 'fa-solid fa-screwdriver-wrench',
  check_in:    'fa-solid fa-arrow-right-to-bracket',
  check_out:   'fa-solid fa-arrow-right-from-bracket',
  relocate:    'fa-solid fa-location-dot',
  retire:      'fa-solid fa-box-archive',
  delete:      'fa-solid fa-trash'
};

export function logActivity({ item_id, action, user_id = null, user_name = null, notes = null, meta = null }) {
  run(
    `INSERT INTO activity_log (item_id, action, user_id, user_name, notes, meta)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [item_id, action, user_id, user_name, notes, meta ? JSON.stringify(meta) : null]
  );
  return getLastInsertId();
}

export function getActivityByItem(itemId, limit = 50) {
  return all(
    `SELECT * FROM activity_log WHERE item_id = ? ORDER BY created_at DESC LIMIT ?`,
    [itemId, limit]
  );
}

export function getRecentActivity(limit = 10) {
  return all(`
    SELECT al.*, i.name as item_name, i.qr_code, c.icon as category_icon, c.color as category_color
    FROM activity_log al
    LEFT JOIN items i ON al.item_id = i.id
    LEFT JOIN categories c ON i.category_id = c.id
    ORDER BY al.created_at DESC
    LIMIT ?
  `, [limit]);
}

export function getActivityStats() {
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-');
  return {
    total:     get('SELECT COUNT(*) as cnt FROM activity_log')?.cnt ?? 0,
    today:     get(`SELECT COUNT(*) as cnt FROM activity_log WHERE created_at >= ?`, [`${today} 00:00:00`])?.cnt ?? 0,
    maintenance: get(`SELECT COUNT(*) as cnt FROM activity_log WHERE action = 'maintenance'`)?.cnt ?? 0
  };
}
