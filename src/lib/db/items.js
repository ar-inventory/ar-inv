import { run, get, all, getLastInsertId } from './database.js';

// ── READ ───────────────────────────────────────────────

export function getAllItems({ categoryId, status, condition, locationId, search, sortBy = 'name', sortDir = 'ASC' } = {}) {
  let sql = `
    SELECT
      i.*,
      c.name  AS category_name,
      c.icon  AS category_icon,
      c.color AS category_color,
      l.name  AS location_name
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN locations  l ON i.location_id  = l.id
    WHERE 1=1
  `;
  const params = [];

  if (categoryId) { sql += ' AND i.category_id = ?'; params.push(categoryId); }
  if (status)     { sql += ' AND i.status = ?';      params.push(status);     }
  if (condition)  { sql += ' AND i.condition = ?';   params.push(condition);  }
  if (locationId) { sql += ' AND i.location_id = ?'; params.push(locationId); }
  if (search) {
    sql += ' AND (i.name LIKE ? OR i.serial_no LIKE ? OR i.qr_code LIKE ? OR i.brand LIKE ? OR i.model LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q, q, q, q);
  }

  const allowedSort = ['name', 'created_at', 'updated_at', 'status', 'condition', 'purchase_date'];
  const col = allowedSort.includes(sortBy) ? sortBy : 'name';
  const dir = sortDir === 'DESC' ? 'DESC' : 'ASC';
  sql += ` ORDER BY i.${col} ${dir}`;

  return all(sql, params);
}

export function getItemById(id) {
  return get(`
    SELECT
      i.*,
      c.name  AS category_name,
      c.icon  AS category_icon,
      c.color AS category_color,
      l.name  AS location_name
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN locations  l ON i.location_id  = l.id
    WHERE i.id = ?
  `, [id]);
}

export function getItemByQRCode(qrCode) {
  return get(`
    SELECT
      i.*,
      c.name  AS category_name,
      c.icon  AS category_icon,
      c.color AS category_color,
      l.name  AS location_name
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN locations  l ON i.location_id  = l.id
    WHERE i.qr_code = ?
  `, [qrCode]);
}

// ── CREATE ────────────────────────────────────────────

export function createItem({
  qr_code, name, category_id, brand, model, serial_no,
  location_id, location_note, condition = 'good', status = 'available',
  purchase_date, purchase_price, warranty_expiry, notes, image_url
}) {
  run(
    `INSERT INTO items
      (qr_code, name, category_id, brand, model, serial_no,
       location_id, location_note, condition, status,
       purchase_date, purchase_price, warranty_expiry, notes, image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      qr_code, name, category_id ?? null, brand ?? null, model ?? null,
      serial_no ?? null, location_id ?? null, location_note ?? null,
      condition, status, purchase_date ?? null,
      purchase_price ?? null, warranty_expiry ?? null,
      notes ?? null, image_url ?? null
    ]
  );
  return getLastInsertId();
}

// ── UPDATE ────────────────────────────────────────────

export function updateItem(id, fields) {
  const allowed = [
    'name', 'category_id', 'brand', 'model', 'serial_no',
    'location_id', 'location_note', 'condition', 'status',
    'purchase_date', 'purchase_price', 'warranty_expiry', 'notes', 'image_url'
  ];
  const sets = [];
  const params = [];
  for (const [k, v] of Object.entries(fields)) {
    if (allowed.includes(k)) {
      sets.push(`${k} = ?`);
      params.push(v);
    }
  }
  if (!sets.length) return;
  sets.push(`updated_at = datetime('now','localtime')`);
  params.push(id);
  run(`UPDATE items SET ${sets.join(', ')} WHERE id = ?`, params);
}

export function updateItemStatus(id, status) {
  run(`UPDATE items SET status = ?, updated_at = datetime('now','localtime') WHERE id = ?`, [status, id]);
}

export function updateItemCondition(id, condition) {
  run(`UPDATE items SET condition = ?, updated_at = datetime('now','localtime') WHERE id = ?`, [condition, id]);
}

// ── DELETE ────────────────────────────────────────────

export function deleteItem(id) {
  run('DELETE FROM items WHERE id = ?', [id]);
}

export function bulkDeleteItems(ids) {
  ids.forEach(id => deleteItem(id));
}

// ── BULK UPDATES ──────────────────────────────────────

export function bulkUpdateStatus(ids, status) {
  ids.forEach(id => updateItemStatus(id, status));
}

export function bulkUpdateCondition(ids, condition) {
  ids.forEach(id => updateItemCondition(id, condition));
}

// ── CUSTOM VALUES ─────────────────────────────────────

export function getCustomValues(itemId) {
  return all(
    `SELECT icv.*, cf.field_key, cf.field_label, cf.field_type, cf.field_unit, cf.show_on_card
     FROM item_custom_values icv
     JOIN category_fields cf ON icv.field_id = cf.id
     WHERE icv.item_id = ?
     ORDER BY cf.sort_order ASC`,
    [itemId]
  );
}

export function setCustomValue(itemId, fieldId, value) {
  run(
    `INSERT INTO item_custom_values (item_id, field_id, value, updated_at)
     VALUES (?, ?, ?, datetime('now','localtime'))
     ON CONFLICT(item_id, field_id)
     DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [itemId, fieldId, value]
  );
}

export function setCustomValues(itemId, valuesMap) {
  // valuesMap: { fieldId: value, ... }
  for (const [fieldId, value] of Object.entries(valuesMap)) {
    setCustomValue(itemId, parseInt(fieldId), value);
  }
}

// ── STATS ─────────────────────────────────────────────

export function getItemStats() {
  const total       = get('SELECT COUNT(*) as cnt FROM items')?.cnt ?? 0;
  const available   = get("SELECT COUNT(*) as cnt FROM items WHERE status = 'available'")?.cnt ?? 0;
  const inUse       = get("SELECT COUNT(*) as cnt FROM items WHERE status = 'in_use'")?.cnt ?? 0;
  const maintenance = get("SELECT COUNT(*) as cnt FROM items WHERE status = 'maintenance'")?.cnt ?? 0;
  const retired     = get("SELECT COUNT(*) as cnt FROM items WHERE status = 'retired'")?.cnt ?? 0;
  const totalValue  = get('SELECT SUM(purchase_price) as total FROM items')?.total ?? 0;

  return { total, available, inUse, maintenance, retired, totalValue };
}

export function getStatsByCategory() {
  return all(`
    SELECT c.id, c.name, c.icon, c.color, COUNT(i.id) as total
    FROM categories c
    LEFT JOIN items i ON i.category_id = c.id
    GROUP BY c.id
    ORDER BY total DESC
  `);
}

// ── Generate QR Code payload ──────────────────────────
export function generateQRCode() {
  return `INV-${crypto.randomUUID()}`;
}
