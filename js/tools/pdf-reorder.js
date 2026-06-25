function Tool_pdf_reorder(container) {
  let pdfFile = null;
  let pageOrder = [];
  let pdfDoc = null;

  container.innerHTML = `
    <div class="drop-zone" id="reorderDropZone">
      <div class="drop-zone-icon">🔀</div>
      <div class="drop-zone-text">选择 PDF 文件进行页面排序</div>
    </div>
    <div id="reorderFileInfo" style="margin-top:12px"></div>
    <div id="reorderArea" class="hidden">
      <p style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:12px">拖拽调整页面顺序，然后导出</p>
      <div class="sort-list" id="sortList"></div>
      <div class="btn-group">
        <button class="btn btn-secondary" id="reverseOrder">反转顺序</button>
        <button class="btn btn-primary" id="reorderSave">导出排序后的 PDF</button>
      </div>
    </div>
    <input type="file" id="reorderFileInput" accept=".pdf" style="display:none">
    <div class="progress-bar hidden" id="reorderProgress"><div class="progress-bar-fill"></div></div>
  `;

  const dropZone = container.querySelector('#reorderDropZone');
  const fileInput = container.querySelector('#reorderFileInput');
  const reorderArea = container.querySelector('#reorderArea');
  const sortList = container.querySelector('#sortList');
  const progress = container.querySelector('#reorderProgress');

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f && (f.type === 'application/pdf' || f.name.endsWith('.pdf'))) { pdfFile = f; loadReorder(); }
  });
  fileInput.addEventListener('change', () => { pdfFile = fileInput.files[0]; if (pdfFile) loadReorder(); });

  async function loadReorder() {
    progress.classList.remove('hidden');
    progress.querySelector('.progress-bar-fill').style.width = '20%';
    try {
      const buf = await Utils.readFile(pdfFile);
      pdfDoc = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
      const count = pdfDoc.getPageCount();
      pageOrder = Array.from({ length: count }, (_, i) => i);
      container.querySelector('#reorderFileInfo').innerHTML = `
        <div class="file-item"><span>📄</span><span class="file-name">${pdfFile.name}</span>
        <span class="file-size">${Utils.formatSize(pdfFile.size)}</span><span style="color:var(--text-muted);font-size:0.75rem">${count} 页</span></div>`;

      pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
      const loadingTask = pdfjsLib.getDocument({ data: buf.slice(0) });
      const pdfjs = await loadingTask.promise;
      progress.querySelector('.progress-bar-fill').style.width = '50%';

      sortList.innerHTML = '';
      for (let i = 0; i < Math.min(count, 50); i++) {
        const item = document.createElement('div');
        item.className = 'sort-item';
        item.draggable = true;
        item.dataset.idx = i;  // original page index, never changes
        const canvas = document.createElement('canvas');
        item.appendChild(canvas);
        const label = document.createElement('div');
        label.className = 'page-num';
        label.textContent = i + 1;
        item.appendChild(label);
        sortList.appendChild(item);

        try {
          const page = await pdfjs.getPage(i + 1);
          const scale = 0.3;
          const vp = page.getViewport({ scale });
          canvas.width = vp.width;
          canvas.height = vp.height;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
        } catch (e) { /* skip */ }
      }

      if (count > 50) {
        const more = document.createElement('div');
        more.className = 'sort-item';
        more.style.display = 'flex';
        more.style.alignItems = 'center';
        more.style.justifyContent = 'center';
        more.style.minHeight = '150px';
        more.innerHTML = `<span style="color:var(--text-muted)">... 还有 ${count - 50} 页（导出时保留顺序）</span>`;
        sortList.appendChild(more);
      }

      progress.querySelector('.progress-bar-fill').style.width = '100%';
      progress.classList.add('hidden');
      reorderArea.classList.remove('hidden');
      dropZone.classList.add('hidden');
    } catch (err) {
      Utils.toast('加载 PDF 失败: ' + err.message, 'error');
      progress.classList.add('hidden');
    }
  }

  // ===== Drag and drop sorting (FIXED) =====
  // dragIdx stores the DISPLAY POSITION (index into pageOrder), NOT the original page index
  let dragIdx = null;

  sortList.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.sort-item');
    if (!item || !item.dataset.idx) return;
    const origIdx = parseInt(item.dataset.idx);
    // Convert original page index → display position in pageOrder
    dragIdx = pageOrder.indexOf(origIdx);
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  sortList.addEventListener('dragover', (e) => {
    e.preventDefault();
    const item = e.target.closest('.sort-item');
    if (item && item.dataset.idx) item.classList.add('drag-over');
  });

  sortList.addEventListener('dragleave', (e) => {
    const item = e.target.closest('.sort-item');
    if (item) item.classList.remove('drag-over');
  });

  sortList.addEventListener('drop', (e) => {
    e.preventDefault();
    const item = e.target.closest('.sort-item');
    if (!item || !item.dataset.idx || dragIdx === null) return;
    item.classList.remove('drag-over');

    const targetOrigIdx = parseInt(item.dataset.idx);
    // Convert original page index → display position in pageOrder
    const toIdx = pageOrder.indexOf(targetOrigIdx);

    if (dragIdx === toIdx) { dragIdx = null; return; }

    // Now dragIdx and toIdx are correct indices into pageOrder
    const [moved] = pageOrder.splice(dragIdx, 1);
    pageOrder.splice(toIdx, 0, moved);

    // Re-sync DOM and labels
    const allNodes = Array.from(sortList.querySelectorAll('.sort-item[data-idx]'));
    for (const idx of pageOrder) {
      const el = allNodes.find(el => parseInt(el.dataset.idx) === idx);
      if (el) sortList.appendChild(el);
    }
    sortList.querySelectorAll('.sort-item[data-idx]').forEach(el => {
      const idx = parseInt(el.dataset.idx);
      el.querySelector('.page-num').textContent = pageOrder.indexOf(idx) + 1;
    });

    dragIdx = null;
  });

  sortList.addEventListener('dragend', (e) => {
    const item = e.target.closest('.sort-item');
    if (item) item.classList.remove('dragging');
    sortList.querySelectorAll('.sort-item').forEach(el => el.classList.remove('drag-over'));
    dragIdx = null;
  });

  container.querySelector('#reverseOrder').addEventListener('click', () => {
    pageOrder.reverse();
    const allNodes = Array.from(sortList.querySelectorAll('.sort-item[data-idx]'));
    for (const idx of pageOrder) {
      const el = allNodes.find(el => parseInt(el.dataset.idx) === idx);
      if (el) sortList.appendChild(el);
    }
    sortList.querySelectorAll('.sort-item[data-idx]').forEach(el => {
      const idx = parseInt(el.dataset.idx);
      el.querySelector('.page-num').textContent = pageOrder.indexOf(idx) + 1;
    });
    Utils.toast('顺序已反转', 'info');
  });

  container.querySelector('#reorderSave').addEventListener('click', async () => {
    progress.classList.remove('hidden');
    const bar = progress.querySelector('.progress-bar-fill');
    bar.style.width = '10%';
    try {
      const buf = await Utils.readFile(pdfFile);
      const src = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
      bar.style.width = '30%';
      const dst = await PDFLib.PDFDocument.create();
      const copied = await dst.copyPages(src, pageOrder);
      copied.forEach(p => dst.addPage(p));
      bar.style.width = '80%';
      const bytes = await dst.save();
      bar.style.width = '100%';
      Utils.downloadBuffer(bytes, Utils.getName(pdfFile.name) + '_排序.pdf');
      Utils.toast('排序完成，已下载', 'success');
    } catch (err) { Utils.toast('保存失败', 'error'); }
    progress.classList.add('hidden');
  });
}
