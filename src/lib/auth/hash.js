/**
 * hash.js — Password hashing menggunakan Web Crypto API (SHA-256)
 * Built-in browser API, tidak perlu library tambahan
 */

/**
 * Hash password menggunakan SHA-256
 * @param {string} password
 * @returns {Promise<string>} hex string
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data     = encoder.encode(password);
  const hashBuf  = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verifikasi password terhadap hash yang tersimpan
 * @param {string} password - password plain text
 * @param {string} storedHash - hash yang ada di database
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;
  const hash = await hashPassword(password);
  return hash === storedHash;
}
