import { run, get, all, getLastInsertId } from './database.js';

export function getAllCategories() {
  return all('SELECT * FROM categories ORDER BY name ASC');
}

export function getCategoryById(id) {
  return get('SELECT * FROM categories WHERE id = ?', [id]);
}

export function createCategory({ name, icon = 'fa-solid fa-box', color = '#6b7280' }) {
  run(
    'INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)',
    [name, icon, color]
  );
  return getLastInsertId();
}

export function updateCategory(id, { name, icon, color }) {
  run(
    `UPDATE categories SET
      name  = COALESCE(?, name),
      icon  = COALESCE(?, icon),
      color = COALESCE(?, color)
    WHERE id = ?`,
    [name ?? null, icon ?? null, color ?? null, id]
  );
}

export function deleteCategory(id) {
  const cnt = get('SELECT COUNT(*) as cnt FROM items WHERE category_id = ?', [id]);
  if (cnt?.cnt > 0) {
    throw new Error(`Tidak bisa hapus — masih ada ${cnt.cnt} item di kategori ini.`);
  }
  run('DELETE FROM categories WHERE id = ?', [id]);
}

export function getItemCountByCategory(id) {
  const result = get('SELECT COUNT(*) as cnt FROM items WHERE category_id = ?', [id]);
  return result?.cnt ?? 0;
}

// ── Category Fields ────────────────────────────────────

export function getFieldsByCategory(categoryId) {
  return all(
    'SELECT * FROM category_fields WHERE category_id = ? ORDER BY sort_order ASC, id ASC',
    [categoryId]
  );
}

export function createField(categoryId, {
  field_key, field_label, field_type = 'text',
  field_options = null, field_unit = null,
  is_required = 0, show_on_card = 0, sort_order = 0
}) {
  run(
    `INSERT INTO category_fields
      (category_id, field_key, field_label, field_type, field_options, field_unit, is_required, show_on_card, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [categoryId, field_key, field_label, field_type,
     field_options ? JSON.stringify(field_options) : null,
     field_unit, is_required ? 1 : 0, show_on_card ? 1 : 0, sort_order]
  );
  return getLastInsertId();
}

export function updateField(id, {
  field_label, field_type, field_options,
  field_unit, is_required, show_on_card, sort_order
}) {
  run(
    `UPDATE category_fields SET
      field_label   = COALESCE(?, field_label),
      field_type    = COALESCE(?, field_type),
      field_options = ?,
      field_unit    = ?,
      is_required   = COALESCE(?, is_required),
      show_on_card  = COALESCE(?, show_on_card),
      sort_order    = COALESCE(?, sort_order)
    WHERE id = ?`,
    [
      field_label ?? null,
      field_type ?? null,
      field_options != null ? JSON.stringify(field_options) : null,
      field_unit ?? null,
      is_required != null ? (is_required ? 1 : 0) : null,
      show_on_card != null ? (show_on_card ? 1 : 0) : null,
      sort_order ?? null,
      id
    ]
  );
}

export function deleteField(id) {
  run('DELETE FROM category_fields WHERE id = ?', [id]);
}

export function reorderFields(fieldIds) {
  fieldIds.forEach((id, index) => {
    run('UPDATE category_fields SET sort_order = ? WHERE id = ?', [index, id]);
  });
}

// Parse field_options dari JSON string
export function parseFieldOptions(field) {
  if (!field.field_options) return [];
  try { return JSON.parse(field.field_options); }
  catch { return []; }
}

// ── Checklist Templates ────────────────────────────────

export function getChecklistByCategory(categoryId) {
  return all(
    'SELECT * FROM checklist_templates WHERE category_id = ? ORDER BY sort_order ASC, id ASC',
    [categoryId]
  );
}

export function createChecklistItem(categoryId, { item_text, sort_order = 0 }) {
  run(
    'INSERT INTO checklist_templates (category_id, item_text, sort_order) VALUES (?, ?, ?)',
    [categoryId, item_text, sort_order]
  );
  return getLastInsertId();
}

export function updateChecklistItem(id, { item_text, sort_order }) {
  run(
    'UPDATE checklist_templates SET item_text = COALESCE(?, item_text), sort_order = COALESCE(?, sort_order) WHERE id = ?',
    [item_text ?? null, sort_order ?? null, id]
  );
}

export function deleteChecklistItem(id) {
  run('DELETE FROM checklist_templates WHERE id = ?', [id]);
}

export function reorderChecklist(itemIds) {
  itemIds.forEach((id, index) => {
    run('UPDATE checklist_templates SET sort_order = ? WHERE id = ?', [index, id]);
  });
}
