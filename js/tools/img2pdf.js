function Tool_img2pdf(container) {
  let images = [];
  let pageSize = 'a4';
  let orientation = 'portrait';

  container.innerHTML = `
    <div class="form-row">
      <div class="form-group" style="flex:0 0 auto">
        <label>页面大小</label>
        <select id="img2pdfSize">
          <option value="a4">A4</option>
          <option value="letter">Letter</option>
          <option value="original">原始尺寸</option>
        </select>
      </div>
      <div class="form-group" style="flex:0 0 auto">
        <label>方向</label>
        <select id="img2pdfOrient">
          <option value="portrait">纵向</option>
          <option value="landscape">横向</option>
          <option value="auto">自动（根据图片比例）</option>
        </select>
      </div>
      <div class="form-group" style="flex:0 0 auto">
        <label>边距 (px)</label>
        <input type="number" id="img2pdfMargin" value="20" min="0" max="100" style="width:80px">
      </div>
    </div>
    <div class="drop-zone" id="img2pdfDrop">
      <div class="drop-zone-icon">🖼️</div>
      <div class="drop-zone-text">点击或拖拽图片（支持多张）</div>
      <div class="drop-zone-hint">JPG, PNG, WebP 格式 · 图片保持原比例不拉伸</div>
    </div>
    <div class="sort-list" id="img2pdfSort"></div>
    <div class="btn-group">
      <button class="btn btn-primary" id="img2pdfBtn" disabled>转换为 PDF</button>
    </div>
    <input type="file" id="img2pdfInput" accept="image/*" multiple style="display:none">
    <div class="progress-bar hidden" id="img2pdfProgress"><div class="progress-bar-fill"></div></div>
  `;

  const dropZone = container.querySelector('#img2pdfDrop');
  const fileInput = container.querySelector('#img2pdfInput');
  const sortList = container.querySelector('#img2pdfSort');
  const convertBtn = container.querySelector('#img2pdfBtn');
  const progress = container.querySelector('#img2pdfProgress');
  const sizeSelect = container.querySelector('#img2pdfSize');
  const orientSelect = container.querySelector('#img2pdfOrient');
  const marginInput = container.querySelector('#img2pdfMargin');

  sizeSelect.addEventListener('change', () => pageSize = sizeSelect.value);
  orientSelect.addEventListener('change', () => orientation = orientSelect.value);

  function updateUI() {
    sortList.innerHTML = images.map((img, i) => `
      <div class="sort-item" data-idx="${i}" draggable="true">
        <img src="${img.dataUrl}" style="width:100%;display:block">
        <div class="page-num">${i + 1}</div>
      </div>
    `).join('');
    convertBtn.disabled = images.length === 0;

    sortList.querySelectorAll('.sort-item').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', item.dataset.idx);
        item.classList.add('dragging');
      });
      item.addEventListener('dragend', () => item.classList.remove('dragging'));
    });
    sortList.addEventListener('dragover', (e) => {
      e.preventDefault();
      const t = e.target.closest('.sort-item');
      if (t) t.classList.add('drag-over');
    });
    sortList.addEventListener('dragleave', (e) => {
      const t = e.target.closest('.sort-item');
      if (t) t.classList.remove('drag-over');
    });
    sortList.addEventListener('drop', (e) => {
      e.preventDefault();
      const t = e.target.closest('.sort-item');
      if (!t) return;
      t.classList.remove('drag-over');
      const from = parseInt(e.dataTransfer.getData('text/plain'));
      const to = parseInt(t.dataset.idx);
      if (from !== to) {
        const [moved] = images.splice(from, 1);
        images.splice(to, 0, moved);
        updateUI();
      }
    });
  }

  async function addFiles(files) {
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      const dataUrl = await Utils.readFileAsDataURL(f);
      images.push({ dataUrl, file: f });
    }
    updateUI();
  }

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    addFiles(Array.from(e.dataTransfer.files));
  });
  fileInput.addEventListener('change', () => {
    addFiles(Array.from(fileInput.files));
    fileInput.value = '';
  });

  convertBtn.addEventListener('click', async () => {
    convertBtn.disabled = true;
    progress.classList.remove('hidden');
    const bar = progress.querySelector('.progress-bar-fill');

    const margin = parseInt(marginInput.value) || 0;
    const sizes = { a4: [595, 842], letter: [612, 792] };
    const [baseW, baseH] = sizes[pageSize] || [595, 842];

    try {
      const { PDFDocument } = PDFLib;
      const pdf = await PDFDocument.create();

      for (let i = 0; i < images.length; i++) {
        const img = await Utils.loadImageFromFile(images[i].file);
        const imgW = img.width;
        const imgH = img.height;

        let pw, ph;
        if (pageSize === 'original') {
          pw = imgW;
          ph = imgH;
        } else {
          // Determine page orientation
          const isLandscape = orientation === 'landscape'
            || (orientation === 'auto' && imgW > imgH);
          [pw, ph] = isLandscape ? [baseH, baseW] : [baseW, baseH];
        }

        const page = pdf.addPage([pw, ph]);

        if (pageSize === 'original') {
          // Original size: draw at exactly image dimensions
          const pngBuf = await Utils.canvasToBuffer(Utils.imageToCanvas(img), 'image/png', 1.0);
          const embedded = await pdf.embedPng(new Uint8Array(pngBuf));
          page.drawImage(embedded, { x: 0, y: 0, width: imgW, height: imgH });
        } else {
          // Fit image within page, maintaining aspect ratio, with margins
          const availW = pw - margin * 2;
          const availH = ph - margin * 2;
          const scale = Math.min(availW / imgW, availH / imgH, 1.0);
          const drawW = Math.round(imgW * scale);
          const drawH = Math.round(imgH * scale);
          const x = (pw - drawW) / 2;
          const y = (ph - drawH) / 2;

          const canvas = Utils.imageToCanvas(img, drawW, drawH);
          const pngBuf = await Utils.canvasToBuffer(canvas, 'image/png', 1.0);
          const embedded = await pdf.embedPng(new Uint8Array(pngBuf));
          page.drawImage(embedded, { x, y, width: drawW, height: drawH });
        }

        bar.style.width = `${((i + 1) / images.length) * 100}%`;
      }

      const bytes = await pdf.save();
      bar.style.width = '100%';
      Utils.downloadBuffer(bytes, '图片转PDF.pdf');
      Utils.toast(`已转换 ${images.length} 张图片为 PDF（保持原比例）`, 'success');
    } catch (err) {
      Utils.toast('转换失败: ' + err.message, 'error');
    }

    convertBtn.disabled = false;
    setTimeout(() => progress.classList.add('hidden'), 1500);
  });
}

function Tool_batch_img2pdf(container) {
  container.innerHTML = `
    <h2>📚 批量图片转 PDF</h2>
    <p class="tool-desc">多张图片批量合并为 PDF，保持原比例不拉伸</p>
    <div id="batchBody"></div>
  `;
  Tool_img2pdf(container.querySelector('#batchBody'));
}
