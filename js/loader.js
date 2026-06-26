// ===== KEOUKE Office Tools - Dynamic Library Loader =====
// Loads heavy JS/CSS only when a tool needs them. Caches after first load.

const LibLoader = {
  _loaded: {},
  _promises: {},

  // Map each tool to its required library files
  _toolDeps: {
    // PDF tools
    'pdf-merge':      ['lib/pdf-lib.min.js'],
    'pdf-split':      ['lib/pdf-lib.min.js', 'lib/pdf.min.js'],
    'pdf-extract':    ['lib/pdf-lib.min.js', 'lib/pdf.min.js'],
    'pdf-reorder':    ['lib/pdf-lib.min.js', 'lib/pdf.min.js'],
    'pdf-encrypt':    ['lib/pdf-lib.min.js'],
    'pdf-compress':   ['lib/pdf-lib.min.js', 'lib/pdf.min.js'],
    'img2pdf':        ['lib/pdf-lib.min.js'],
    'word2pdf':       ['lib/mammoth.browser.min.js', 'lib/html2canvas.min.js', 'lib/pdf-lib.min.js'],

    // Image tools
    'img-compress':   ['lib/browser-image-compression.js'],

    // Scan tools
    'scan-king':      ['lib/opencv.js'],
    'table-extract':  ['lib/opencv.js', 'lib/tesseract.min.js', 'lib/tesseract.worker.min.js', 'lib/xlsx.full.min.js'],

    // Utility tools
    'qrcode-gen':     ['lib/qrcode.min.js'],
    'qrcode-scan':    ['lib/jsQR.js'],
    'markdown':       ['lib/marked.min.js'],
  },

  // Additional post-load setup for some libs
  _postSetup: {
    'lib/pdf.min.js': () => {
      if (typeof pdfjsLib !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
      }
    },
  },

  // Load a single script
  _loadScript(src) {
    return new Promise((resolve, reject) => {
      if (this._loaded[src]) return resolve();
      if (this._promises[src]) return this._promises[src].then(resolve);

      // Check if already in DOM
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        this._loaded[src] = true;
        // Run post-setup if needed
        if (this._postSetup[src]) this._postSetup[src]();
        return resolve();
      }

      this._promises[src] = new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => {
          this._loaded[src] = true;
          if (this._postSetup[src]) this._postSetup[src]();
          res();
        };
        s.onerror = () => rej(new Error(`Failed to load: ${src}`));
        document.head.appendChild(s);
      });

      this._promises[src].then(resolve).catch(reject);
    });
  },

  // Load all dependencies for a tool
  async loadFor(toolId) {
    const deps = this._toolDeps[toolId];
    if (!deps || deps.length === 0) return;

    // Load in sequence to respect dependencies
    const pdfWorker = deps.includes('lib/pdf.min.js') ? 'lib/pdf.worker.min.js' : null;
    const allDeps = [...deps];
    if (pdfWorker && !allDeps.includes(pdfWorker)) {
      allDeps.push(pdfWorker);
    }

    for (const dep of allDeps) {
      await this._loadScript(dep);
    }
  },

  // Check if a tool's deps are already loaded
  isLoaded(toolId) {
    const deps = this._toolDeps[toolId];
    if (!deps || deps.length === 0) return true;
    return deps.every(d => this._loaded[d]);
  }
};
