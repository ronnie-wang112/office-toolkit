// ===== Office Toolkit - Shared Utilities =====
const Utils = {
  // Format file size
  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  },

  // Get file extension
  getExt(filename) {
    return filename.split('.').pop().toLowerCase();
  },

  // Get file name without extension
  getName(filename) {
    const i = filename.lastIndexOf('.');
    return i > 0 ? filename.substring(0, i) : filename;
  },

  // Trigger file download
  download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  downloadBuffer(buffer, filename, mime = 'application/pdf') {
    const blob = new Blob([buffer], { type: mime });
    this.download(blob, filename);
  },

  // Read file as ArrayBuffer
  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  // Read file as data URL
  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // Create file input
  pickFiles(accept, multiple = false) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.multiple = multiple;
      input.onchange = () => resolve(multiple ? Array.from(input.files) : input.files[0]);
      input.click();
    });
  },

  // Read image from file and return as Image element
  loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // Image to canvas
  imageToCanvas(img, maxW, maxH) {
    let w = img.width, h = img.height;
    if (maxW && maxH) {
      const ratio = Math.min(maxW / w, maxH / h, 1);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    return canvas;
  },

  // Canvas to Blob
  canvasToBlob(canvas, type = 'image/jpeg', quality = 0.9) {
    return new Promise((resolve) => {
      canvas.toBlob(resolve, type, quality);
    });
  },

  // Canvas to ArrayBuffer
  async canvasToBuffer(canvas, type = 'image/jpeg', quality = 0.9) {
    const blob = await this.canvasToBlob(canvas, type, quality);
    return blob.arrayBuffer();
  },

  // Toast notification
  toast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // Debounce
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  // Escape HTML
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // Set theme
  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('office-toolkit-theme', theme);
  },

  // Get saved theme
  getTheme() {
    return localStorage.getItem('office-toolkit-theme') || 'light';
  }
};
