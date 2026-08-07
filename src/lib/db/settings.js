import { run, get, all, scheduleSave } from './database.js';

export function getSetting(key, defaultValue = null) {
  const row = get('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : defaultValue;
}

export function setSetting(key, value) {
  run(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value]
  );
}

export function getAllSettings() {
  const rows = all('SELECT key, value FROM settings');
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

export function getCompanyName() {
  return getSetting('company_name', 'Perusahaan Saya');
}

export function getTheme() {
  return getSetting('theme', 'light');
}

export function getDefaultLocationId() {
  const val = getSetting('default_location_id');
  return val ? parseInt(val) : null;
}

export function getActiveUserId() {
  const val = getSetting('active_user_id');
  return val ? parseInt(val) : null;
}

export function setActiveUser(userId) {
  setSetting('active_user_id', String(userId));
}
