/**
 * session.js — Manajemen session login
 * Session disimpan di sessionStorage — otomatis hilang saat tab/browser ditutup
 */

const SESSION_KEY = 'inv_session';

/**
 * @typedef {Object} Session
 * @property {number}  user_id
 * @property {string}  user_name
 * @property {string}  role        - admin | technician | staff | viewer
 * @property {string}  avatar_color
 * @property {string}  logged_in_at - ISO string
 */

/**
 * Simpan session setelah login berhasil
 * @param {Session} session
 */
export function setSession(session) {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    ...session,
    logged_in_at: new Date().toISOString()
  }));
}

/**
 * Ambil session aktif
 * @returns {Session|null}
 */
export function getSession() {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Hapus session (logout)
 */
export function clearSession() {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEY);
}

/**
 * Cek apakah user sudah login
 * @returns {boolean}
 */
export function isLoggedIn() {
  return getSession() !== null;
}

/**
 * Ambil role user aktif
 * @returns {string|null}
 */
export function getCurrentRole() {
  return getSession()?.role ?? null;
}
