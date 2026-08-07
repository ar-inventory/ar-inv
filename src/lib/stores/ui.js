import { writable } from 'svelte/store';
import { getSession } from '$lib/auth/session.js';

// Theme
export const theme = writable('light');

// Current logged-in user (dari session)
export const currentUser = writable(null);

// Notifikasi
export const unreadCount   = writable(0);
export const notifications = writable([]);

// UI state
export const globalLoading = writable(false);

// Apply theme ke <html> element
export function applyTheme(t) {
  theme.set(t);
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', t === 'dark');
  }
}

// Load current user dari sessionStorage
export function loadCurrentUser() {
  const session = getSession();
  if (session) {
    currentUser.set({
      id:           session.user_id,
      name:         session.user_name,
      role:         session.role,
      avatar_color: session.avatar_color
    });
  } else {
    currentUser.set(null);
  }
  return session;
}
