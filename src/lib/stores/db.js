import { writable } from 'svelte/store';

// Status inisialisasi database
export const dbReady   = writable(false);
export const dbError   = writable(null);
export const dbLoading = writable(true);
