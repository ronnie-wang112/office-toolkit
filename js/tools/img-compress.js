function Tool_img_compress(container) {
  let files = [];
  let quality = 0.7;
  let maxSize = 1920;

  container.innerHTML = `
    <div class="form-row">
      <div class="form-group" style="max-width:150px">
        <label>压缩质量</label>
        <input type="number" id="compressQuality" value="0.7" min="0.1" max="1" step="0.05">
        <div class="form-hint">0.1~1，越低越小</div>
      </div>
      <div class="form-group" style="max-width:150px">
        <label>最大宽度(px)</label>
        <input type="number" id="compressMaxSize" value="1920" min="100" max="8000" step="100">
      </div>
      <div class="form-group" style="max-width:150px">
        <label>输出格式</label>
        <select id="compressFmt">
          <option value="image/jpeg">JPEG</option>
          <option value="image/webp">WebP</option>
          <option value="image/png">PNG</option>
        </select>
      </div>
    </div>
    <div class="drop-zone" id="compressDrop">
      <div class="drop-zone-icon">🗜️</div>
      <div class="drop-zone-text">点击或拖拽图片（支持批量）</div>
    </div>
    <div class="file-list" id="compressList"></div>
    <div class="btn-group">
      <button class="btn btn-primary" id="compressBtn" disabled>压缩并下载</button>
      <button class="btn btn-secondary" id="compressAllBtn" disabled>批量打包下载</button>
    </div>
    <input type="file" id="compressInput" accept="image/*" multiple style="display:none">
    <div class="progress-bar hidden" id="compressProgress"><div class="progress-bar-fill"></div></div>
    <div class="preview-container hidden" id="compressPreview"></div>
  `;

  const dropZone = container.querySelector('#compressDrop');
  const fileInput = container.querySelector('#compressInput');
  const fileList = container.querySelector('#compressList');
  const compressBtn = container.querySelector('#compressBtn');
  const compressAllBtn = container.querySelector('#compressAllBtn');
  const qualityInput = container.querySelector('#compressQuality');
  const maxSizeInput = container.querySelector('#compressMaxSize');
  const fmtSelect = container.querySelector('#compressFmt');
  const progress = container.querySelector('#compressProgress');
  const preview = container.querySelector('#compressPreview');

  qualityInput.addEventListener('change', () => quality = parseFloat(qualityInput.value));
  maxSizeInput.addEventListener('change', () => maxSize = parseInt(maxSizeInput.value));

  function updateList() {
    fileList.innerHTML = files.map((f, i) => `
      <div class="file-item">
        <span>🖼️</span>
        <span class="file-name">${f.name}</span>
        <span class="file-size">${Utils.formatSize(f.size)}</span>
        <span style="color:var(--text-muted);font-size:0.75rem">${f.img ? f.img.width + '×' + f.img.height : ''}</span>
        <button class="file-remove" data-idx="${i}">×</button>
      </div>
    `).join('');
    const hasFiles = files.length > 0;
    compressBtn.disabled = !hasFiles;
    compressAllBtn.disabled = !hasFiles;
    fileList.querySelectorAll('.file-remove').forEach(b => {
      b.addEventListener('click', () => { files.splice(parseInt(b.dataset.idx), 1); updateList(); });
    });
  }

  async function addFileList(newFiles) {
    for (const f of newFiles) {
      if (!f.type.startsWith('image/')) continue;
      const img = await Utils.loadImageFromFile(f);
      files.push({ file: f, name: f.name, size: f.size, img });
    }
    updateList();
  }

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    addFileList(Array.from(e.dataTransfer.files));
  });
  fileInput.addEventListener('change', () => { addFileList(Array.from(fileInput.files)); fileInput.value = ''; });

  async function compressOne(item) {
    const fmt = fmtSelect.value;
    const img = item.img;
    const canvas = Utils.imageToCanvas(img, maxSize, maxSize);
    const blob = await Utils.canvasToBlob(canvas, fmt, quality);
    return { blob, name: Utils.getName(item.name) + '_压缩.' + (fmt === 'image/jpeg' ? 'jpg' : fmt.split('/')[1]), origSize: item.size };
  }

  compressBtn.addEventListener('click', async () => {
    compressBtn.disabled = true;
    progress.classList.remove('hidden');
    const bar = progress.querySelector('.progress-bar-fill');

    try {
      for (let i = 0; i < files.length; i++) {
        const result = await compressOne(files[i]);
        Utils.download(result.blob, result.name);
        bar.style.width = `${((i + 1) / files.length) * 100}%`;
      }
      Utils.toast(`已压缩 ${files.length} 张图片`, 'success');
    } catch (err) { Utils.toast('压缩失败', 'error'); }

    compressBtn.disabled = false;
    setTimeout(() => progress.classList.add('hidden'), 1500);
  });

  compressAllBtn.addEventListener('click', async () => {
    compressAllBtn.disabled = true;
    progress.classList.remove('hidden');
    const bar = progress.querySelector('.progress-bar-fill');

    try {
      const { PDFDocument } = PDFLib;
      const pdf = await PDFDocument.create();

      for (let i = 0; i < files.length; i++) {
        const result = await compressOne(files[i]);
        const buf = await result.blob.arrayBuffer();
        const embedded = await pdf.embedPng(new Uint8Array(buf));
        const page = pdf.addPage([embedded.width, embedded.height]);
        page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
        bar.style.width = `${((i + 1) / files.length) * 100}%`;
      }
      const bytes = await pdf.save();
      Utils.downloadBuffer(bytes, '压缩图片合集.pdf');
      Utils.toast('已打包为 PDF', 'success');
    } catch (err) { Utils.toast('打包失败', 'error'); }

    compressAllBtn.disabled = false;
    setTimeout(() => progress.classList.add('hidden'), 1500);
  });
}
