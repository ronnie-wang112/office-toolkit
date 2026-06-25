function Tool_pdf_merge(container) {
  let files = [];

  container.innerHTML = `
    <div class="drop-zone" id="mergeDropZone">
      <div class="drop-zone-icon">📎</div>
      <div class="drop-zone-text">点击或拖拽 PDF 文件到此处</div>
      <div class="drop-zone-hint">支持多个 PDF 文件，按选择顺序合并</div>
    </div>
    <div class="file-list" id="mergeFileList"></div>
    <div class="btn-group">
      <button class="btn btn-primary" id="mergeBtn" disabled>合并并下载</button>
    </div>
    <input type="file" id="mergeFileInput" accept=".pdf" multiple style="display:none">
    <div class="progress-bar hidden" id="mergeProgress"><div class="progress-bar-fill"></div></div>
  `;

  const dropZone = container.querySelector('#mergeDropZone');
  const fileInput = container.querySelector('#mergeFileInput');
  const fileList = container.querySelector('#mergeFileList');
  const mergeBtn = container.querySelector('#mergeBtn');
  const progress = container.querySelector('#mergeProgress');

  function updateFileList() {
    fileList.innerHTML = files.map((f, i) => `
      <div class="file-item">
        <span>📄</span>
        <span class="file-name">${f.name}</span>
        <span class="file-size">${Utils.formatSize(f.size)}</span>
        <span style="color:var(--text-muted);font-size:0.75rem">#${i + 1}</span>
        <button class="file-remove" data-idx="${i}">×</button>
      </div>
    `).join('');
    mergeBtn.disabled = files.length < 2;
    fileList.querySelectorAll('.file-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        files.splice(parseInt(btn.dataset.idx), 1);
        updateFileList();
      });
    });
  }

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const newFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    files.push(...newFiles);
    updateFileList();
  });

  // Handle sort by drag within file list
  fileList.addEventListener('dragover', (e) => {
    e.preventDefault();
    const item = e.target.closest('.file-item');
    if (item) item.style.borderTop = '2px solid var(--primary)';
  });
  fileList.addEventListener('dragleave', (e) => {
    const item = e.target.closest('.file-item');
    if (item) item.style.borderTop = '';
  });
  fileList.addEventListener('drop', (e) => {
    e.preventDefault();
    const from = parseInt(e.dataTransfer.getData('text/plain'));
    const toEl = e.target.closest('.file-item');
    if (toEl) {
      const to = parseInt(toEl.querySelector('.file-remove').dataset.idx);
      const [moved] = files.splice(from, 1);
      files.splice(to, 0, moved);
      updateFileList();
    }
    document.querySelectorAll('.file-item').forEach(el => el.style.borderTop = '');
  });

  fileInput.addEventListener('change', () => {
    files.push(...Array.from(fileInput.files));
    updateFileList();
    fileInput.value = '';
  });

  // Update file items to be draggable
  const observer = new MutationObserver(() => {
    fileList.querySelectorAll('.file-item').forEach((item, i) => {
      item.draggable = true;
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', i.toString());
        item.classList.add('dragging');
      });
      item.addEventListener('dragend', () => item.classList.remove('dragging'));
    });
  });
  observer.observe(fileList, { childList: true });

  mergeBtn.addEventListener('click', async () => {
    mergeBtn.disabled = true;
    progress.classList.remove('hidden');
    const bar = progress.querySelector('.progress-bar-fill');
    bar.style.width = '10%';

    try {
      const { PDFDocument } = PDFLib;
      const mergedPdf = await PDFDocument.create();

      for (let i = 0; i < files.length; i++) {
        const buffer = await Utils.readFile(files[i]);
        const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(p => mergedPdf.addPage(p));
        bar.style.width = `${10 + (80 * (i + 1) / files.length)}%`;
      }

      const mergedBytes = await mergedPdf.save();
      bar.style.width = '100%';

      const name = files.length > 0 ? Utils.getName(files[0].name) : 'merged';
      Utils.downloadBuffer(mergedBytes, `${name}_合并.pdf`);
      Utils.toast('PDF 合并完成！', 'success');
    } catch (err) {
      Utils.toast('合并失败：' + err.message, 'error');
      console.error(err);
    }

    mergeBtn.disabled = false;
    setTimeout(() => progress.classList.add('hidden'), 1500);
  });
}
