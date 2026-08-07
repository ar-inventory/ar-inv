import { run, get, all, getLastInsertId } from './database.js';
import { hashPassword, verifyPassword } from '$lib/auth/hash.js';

export function getAllUsers() {
  return all('SELECT id, name, role, avatar_color, is_active, created_at FROM users ORDER BY name ASC');
}

export function getActiveUsers() {
  // Ambil semua kolom termasuk password_hash untuk keperluan filter di login
  return all('SELECT * FROM users WHERE is_active = 1 ORDER BY name ASC');
}

export function getUserById(id) {
  return get('SELECT id, name, role, avatar_color, is_active, created_at FROM users WHERE id = ?', [id]);
}

export function getUserByName(name) {
  return get('SELECT * FROM users WHERE name = ? AND is_active = 1', [name]);
}

export function hasAnyUser() {
  const result = get('SELECT COUNT(*) as cnt FROM users');
  return (result?.cnt ?? 0) > 0;
}

export function hasAnyAdmin() {
  const result = get("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin' AND password_hash IS NOT NULL AND password_hash != ''");
  return (result?.cnt ?? 0) > 0;
}

export function createUser({ name, role = 'staff', avatar_color = '#6366f1' }) {
  run(
    'INSERT INTO users (name, role, avatar_color) VALUES (?, ?, ?)',
    [name, role, avatar_color]
  );
  return getLastInsertId();
}

export async function createUserWithPassword({ name, role = 'staff', avatar_color = '#6366f1', password }) {
  const hash = await hashPassword(password);
  run(
    'INSERT INTO users (name, role, avatar_color, password_hash) VALUES (?, ?, ?, ?)',
    [name, role, avatar_color, hash]
  );
  return getLastInsertId();
}

export async function setUserPassword(id, password) {
  const hash = await hashPassword(password);
  run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
}

export async function verifyUserPassword(userId, password) {
  const row = get('SELECT password_hash FROM users WHERE id = ?', [userId]);
  if (!row?.password_hash) return false;  // user tanpa password tidak bisa login
  return verifyPassword(password, row.password_hash);
}

export function updateUser(id, { name, role, avatar_color, is_active }) {
  run(
    `UPDATE users SET
      name         = COALESCE(?, name),
      role         = COALESCE(?, role),
      avatar_color = COALESCE(?, avatar_color),
      is_active    = COALESCE(?, is_active)
    WHERE id = ?`,
    [name ?? null, role ?? null, avatar_color ?? null, is_active ?? null, id]
  );
}

export function deleteUser(id) {
  run('DELETE FROM users WHERE id = ?', [id]);
}

export function getAvatarColor(name) {
  const colors = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444',
    '#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function getInitials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}
