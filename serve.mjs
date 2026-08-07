/**
 * serve.mjs — Custom static server untuk preview build/
 * Inject header COOP/COEP yang dibutuhkan sql.js WASM
 * Jalankan: node serve.mjs
 */
import http from 'http';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = path.join(__dirname, 'build');
const PORT      = 4173;

const MIME = {
  '.html':  'text/html; charset=utf-8',
  '.js':    'application/javascript',
  '.mjs':   'application/javascript',
  '.css':   'text/css',
  '.svg':   'image/svg+xml',
  '.png':   'image/png',
  '.ico':   'image/x-icon',
  '.wasm':  'application/wasm',
  '.json':  'application/json',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.woff':  'font/woff',
  '.ttf':   'font/ttf',
};

const server = http.createServer((req, res) => {
  // Header COOP/COEP wajib untuk SharedArrayBuffer / WASM
  res.setHeader('Cross-Origin-Opener-Policy',   'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy',  'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy',  'same-origin');
  res.setHeader('Permissions-Policy',            'camera=*');
  res.setHeader('X-Content-Type-Options',        'nosniff');

  let urlPath = req.url.split('?')[0]; // strip query string

  // Decode URL
  try { urlPath = decodeURIComponent(urlPath); } catch {}

  let filePath = path.join(BUILD_DIR, urlPath);

  // Cek file langsung
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return serveFile(res, filePath);
  }

  // Coba index.html di folder
  const indexPath = path.join(filePath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return serveFile(res, indexPath);
  }

  // SPA fallback → index.html
  const rootIndex = path.join(BUILD_DIR, 'index.html');
  if (fs.existsSync(rootIndex)) {
    return serveFile(res, rootIndex);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

function serveFile(res, filePath) {
  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] ?? 'application/octet-stream';

  // Cache untuk asset immutable
  const isImmutable = filePath.includes('/_app/immutable/') || filePath.endsWith('.wasm');
  if (isImmutable) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    res.setHeader('Cache-Control', 'no-cache');
  }

  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(filePath).pipe(res);
}

server.listen(PORT, () => {
  console.log('\n  ==========================================');
  console.log('   Inventory App — Preview Server');
  console.log('  ==========================================');
  console.log(`\n  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://0.0.0.0:${PORT}`);
  console.log('\n  Headers COOP/COEP aktif (sql.js WASM siap)');
  console.log('  Tekan Ctrl+C untuk menghentikan.\n');
});
