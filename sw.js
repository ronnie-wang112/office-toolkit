const CACHE_NAME = 'office-toolkit-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/utils.js',
  '/js/router.js',
  '/lib/opencv.js',
  '/lib/pdf-lib.min.js',
  '/lib/pdf.min.js',
  '/lib/pdf.worker.min.js',
  '/lib/mammoth.browser.min.js',
  '/lib/html2canvas.min.js',
  '/lib/jsQR.js',
  '/lib/qrcode.min.js',
  '/lib/marked.min.js',
  '/lib/browser-image-compression.js',
  '/js/tools/pdf-merge.js',
  '/js/tools/pdf-split.js',
  '/js/tools/pdf-extract.js',
  '/js/tools/pdf-reorder.js',
  '/js/tools/pdf-encrypt.js',
  '/js/tools/pdf-compress.js',
  '/js/tools/img2pdf.js',
  '/js/tools/word2pdf.js',
  '/js/tools/img-compress.js',
  '/js/tools/img-convert.js',
  '/js/tools/bg-remove.js',
  '/js/tools/img-crop.js',
  '/js/tools/scanner.js',
  '/js/tools/ocr.js',
  '/js/tools/qrcode-gen.js',
  '/js/tools/qrcode-scan.js',
  '/js/tools/markdown.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request);
      })
    );
  }
});
