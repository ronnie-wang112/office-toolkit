const CACHE = 'keouke-toolkit-v10';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([
      '/', '/index.html', '/manifest.json', '/css/style.css',
      '/js/utils.js', '/js/router.js',
      '/lib/pdf-lib.min.js', '/lib/pdf.min.js', '/lib/pdf.worker.min.js',
      '/lib/mammoth.browser.min.js', '/lib/html2canvas.min.js',
      '/lib/jsQR.js', '/lib/qrcode.min.js', '/lib/marked.min.js',
      '/lib/browser-image-compression.js', '/lib/face-api.min.js',
      '/lib/tesseract.min.js', '/lib/tesseract.worker.min.js',
      '/lib/xlsx.full.min.js',
      '/lib/models/tiny_face_detector_model-shard1',
      '/lib/models/tiny_face_detector_model-weights_manifest.json',
      '/lib/models/face_landmark_68_model-shard1',
      '/lib/models/face_landmark_68_model-weights_manifest.json',
      '/js/tools/pdf-merge.js', '/js/tools/pdf-split.js',
      '/js/tools/pdf-extract.js', '/js/tools/pdf-reorder.js',
      '/js/tools/pdf-encrypt.js', '/js/tools/pdf-compress.js',
      '/js/tools/img2pdf.js', '/js/tools/word2pdf.js',
      '/js/tools/img-compress.js', '/js/tools/img-convert.js',
      '/js/tools/img-crop.js', '/js/tools/long-screenshot.js',
      '/js/tools/image-inpaint.js',
      '/js/tools/scan-king.js',
      '/js/tools/qrcode-gen.js', '/js/tools/qrcode-scan.js',
      '/js/tools/markdown.js',
      '/js/tools/id-photo.js', '/js/tools/table-extract.js',
    ]))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(c => c || fetch(e.request))
  );
});
