import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',   // SPA mode — semua route pakai index.html
      precompress: false,
      strict: false
    })
  }
};

export default config;
