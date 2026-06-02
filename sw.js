const CACHE = 'dinner-v6';
const SHELL = [
  '.', 'index.html', 'manifest.webmanifest',
  'src/app.js', 'src/config.js', 'src/csv.js', 'src/model.js', 'src/generator.js',
  'src/shopping.js', 'src/store.js', 'src/sheet.js', 'src/render.js', 'src/icons.js',
  'fonts/inter-400.woff2', 'fonts/inter-500.woff2', 'fonts/inter-600.woff2', 'fonts/inter-700.woff2',
  'fonts/playfair-700.woff2', 'fonts/playfair-700italic.woff2',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
});
// Cache-first for the shell; network-first (cache fallback) for the Sheet CSV.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.hostname.includes('docs.google.com')) {
    e.respondWith(fetch(e.request).then((r) => {
      const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r;
    }).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
