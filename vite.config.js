import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Header COOP/COEP wajib untuk SharedArrayBuffer (sql.js WASM)
const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp'
};

export default defineConfig({
  plugins: [
    sveltekit(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Inventory App',
        short_name: 'Inventory',
        description: 'Aplikasi Inventory berbasis QR Code — scan, kelola, dan lacak aset',
        theme_color: '#6366f1',
        background_color: '#f0f2f7',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        lang: 'id',
        categories: ['business', 'productivity', 'utilities'],
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Scan QR Code',
            short_name: 'Scan',
            description: 'Buka scanner QR Code',
            url: '/scan/',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'Tambah Item',
            short_name: 'Tambah',
            description: 'Tambah item inventory baru',
            url: '/items/new/',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,wasm,woff2,woff,ttf,eot}'],
        // Jangan cache file sql.js yang besar di precache — pakai runtime cache
        globIgnores: ['**/sql.js/**'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Cache WASM file sql.js — CacheFirst karena tidak pernah berubah
            urlPattern: /\/sql\.js\/.*\.wasm$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'sqljs-wasm-v1',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            // Cache sql-wasm.js
            urlPattern: /\/sql\.js\/.*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'sqljs-js-v1',
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ]
      }
    })
  ],
  optimizeDeps: {
    exclude: ['sql.js']
  },
  server: {
    headers: isolationHeaders
  },
  preview: {
    headers: isolationHeaders
  }
});
