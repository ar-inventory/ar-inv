import { run, get, all, getLastInsertId } from './database.js';
import { logActivity } from './activity.js';
import { updateItemStatus } from './items.js';

export function getMaintenanceByItem(itemId) {
  return all(
    `SELECT mr.*, u.name as technician_name, u.avatar_color
     FROM maintenance_records mr
     LEFT JOIN users u ON mr.technician_id = u.id
     WHERE mr.item_id = ?
     ORDER BY mr.created_at DESC`,
    [itemId]
  );
}

export function getAllMaintenance({ technicianId, dateFrom, dateTo, limit = 100 } = {}) {
  let sql = `
    SELECT mr.*, i.name as item_name, i.qr_code,
           c.name as category_name, c.icon as category_icon,
           u.name as technician_name
    FROM maintenance_records mr
    LEFT JOIN items i ON mr.item_id = i.id
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN users u ON mr.technician_id = u.id
    WHERE 1=1
  `;
  const params = [];
  if (technicianId) { sql += ' AND mr.technician_id = ?'; params.push(technicianId); }
  if (dateFrom)     { sql += ' AND mr.created_at >= ?';   params.push(dateFrom + ' 00:00:00'); }
  if (dateTo)       { sql += ' AND mr.created_at <= ?';   params.push(dateTo + ' 23:59:59');   }
  sql += ' ORDER BY mr.created_at DESC LIMIT ?';
  params.push(limit);
  return all(sql, params);
}

export function createMaintenanceRecord({
  item_id,
  technician_id = null,
  technician = null,
  findings = null,
  actions_taken = null,
  field_snapshot = null,
  checklist_snapshot = null,
  photos = null,
  cost = null,
  user_id = null,
  user_name = null
}) {
  // Log aktivitas dulu
  const activityId = logActivity({
    item_id,
    action: 'maintenance',
    user_id,
    user_name: user_name ?? technician,
    notes: findings
  });

  run(
    `INSERT INTO maintenance_records
      (item_id, activity_id, technician_id, technician, findings, actions_taken,
       field_snapshot, checklist_snapshot, photos, cost)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item_id, activityId,
      technician_id, technician,
      findings, actions_taken,
      field_snapshot ? JSON.stringify(field_snapshot) : null,
      checklist_snapshot ? JSON.stringify(checklist_snapshot) : null,
      photos ? JSON.stringify(photos) : null,
      cost ?? null
    ]
  );

  const recordId = getLastInsertId();

  // Update status item jadi available setelah maintenance
  updateItemStatus(item_id, 'available');

  return recordId;
}

export function parseMaintenanceRecord(record) {
  return {
    ...record,
    field_snapshot:     record.field_snapshot     ? JSON.parse(record.field_snapshot)     : {},
    checklist_snapshot: record.checklist_snapshot ? JSON.parse(record.checklist_snapshot) : [],
    photos:             record.photos             ? JSON.parse(record.photos)             : []
  };
}

export function getTotalMaintenanceCost({ itemId, dateFrom, dateTo } = {}) {
  let sql = 'SELECT SUM(cost) as total FROM maintenance_records WHERE 1=1';
  const params = [];
  if (itemId)   { sql += ' AND item_id = ?';      params.push(itemId); }
  if (dateFrom) { sql += ' AND created_at >= ?';  params.push(dateFrom + ' 00:00:00'); }
  if (dateTo)   { sql += ' AND created_at <= ?';  params.push(dateTo + ' 23:59:59'); }
  return get(sql, params)?.total ?? 0;
}
