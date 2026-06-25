function Tool_pdf_split(container) {
  let pdfFile = null;
  let totalPages = 0;

  container.innerHTML = `
    <div class="drop-zone" id="splitDropZone">
      <div class="drop-zone-icon">✂️</div>
      <div class="drop-zone-text">选择要拆分的 PDF 文件</div>
    </div>
    <div id="splitFileInfo" style="margin-top:12px"></div>
    <div id="splitOptions" class="hidden">
      <div class="form-group">
        <label>拆分方式</label>
        <select id="splitMode">
          <option value="range">按页码范围</option>
          <option value="every">每 N 页拆一个</option>
          <option value="single">拆成单页 PDF</option>
        </select>
      </div>
      <div id="rangeInput">
        <div class="form-group">
          <label>页码范围（如: 1-3,5,7-9）</label>
          <input type="text" id="pageRanges" placeholder="1-3,5,7-9">
          <div class="form-hint" id="pageHint">当前 PDF 共 <span id="totalPagesText">0</span> 页</div>
        </div>
      </div>
      <div id="everyInput" class="hidden">
        <div class="form-group">
          <label>每多少页拆一个文件</label>
          <input type="number" id="splitEvery" value="1" min="1">
        </div>
      </div>
      <button class="btn btn-primary" id="splitBtn">拆分并下载</button>
    </div>
    <input type="file" id="splitFileInput" accept=".pdf" style="display:none">
    <div class="progress-bar hidden" id="splitProgress"><div class="progress-bar-fill"></div></div>
  `;

  const dropZone = container.querySelector('#splitDropZone');
  const fileInput = container.querySelector('#splitFileInput');
  const splitOptions = container.querySelector('#splitOptions');
  const splitMode = container.querySelector('#splitMode');
  const rangeInput = container.querySelector('#rangeInput');
  const everyInput = container.querySelector('#everyInput');
  const splitBtn = container.querySelector('#splitBtn');
  const totalPagesText = container.querySelector('#totalPagesText');
  const progress = container.querySelector('#splitProgress');

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f && (f.type === 'application/pdf' || f.name.endsWith('.pdf'))) {
      pdfFile = f;
      loadPdfInfo();
    }
  });

  fileInput.addEventListener('change', () => {
    pdfFile = fileInput.files[0];
    if (pdfFile) loadPdfInfo();
  });

  async function loadPdfInfo() {
    try {
      const buffer = await Utils.readFile(pdfFile);
      const pdf = await PDFLib.PDFDocument.load(buffer, { ignoreEncryption: true });
      totalPages = pdf.getPageCount();
      totalPagesText.textContent = totalPages;
      container.querySelector('#splitFileInfo').innerHTML = `
        <div class="file-item">
          <span>📄</span><span class="file-name">${pdfFile.name}</span>
          <span class="file-size">${Utils.formatSize(pdfFile.size)}</span>
          <span style="color:var(--text-muted);font-size:0.75rem">${totalPages} 页</span>
        </div>`;
      splitOptions.classList.remove('hidden');
      dropZone.classList.add('hidden');
      container.querySelector('#pageHint').querySelector('#totalPagesText').textContent = totalPages;
    } catch (err) {
      Utils.toast('读取 PDF 失败', 'error');
    }
  }

  splitMode.addEventListener('change', () => {
    rangeInput.classList.toggle('hidden', splitMode.value !== 'range');
    everyInput.classList.toggle('hidden', splitMode.value !== 'every');
  });

  function parseRanges(str, max) {
    const pages = new Set();
    str.split(',').forEach(part => {
      const range = part.split('-').map(n => parseInt(n.trim()));
      if (range.length === 2 && range[1] >= range[0]) {
        for (let i = Math.max(1, range[0]); i <= Math.min(max, range[1]); i++) pages.add(i);
      } else if (range.length === 1 && !isNaN(range[0])) {
        if (range[0] >= 1 && range[0] <= max) pages.add(range[0]);
      }
    });
    return Array.from(pages).sort((a, b) => a - b);
  }

  splitBtn.addEventListener('click', async () => {
    if (!pdfFile) return;
    splitBtn.disabled = true;
    progress.classList.remove('hidden');
    const bar = progress.querySelector('.progress-bar-fill');

    try {
      const buffer = await Utils.readFile(pdfFile);
      const srcPdf = await PDFLib.PDFDocument.load(buffer, { ignoreEncryption: true });
      totalPages = srcPdf.getPageCount();
      const baseName = Utils.getName(pdfFile.name);

      let splits = [];
      if (splitMode.value === 'single') {
        for (let i = 0; i < totalPages; i++) splits.push([i]);
      } else if (splitMode.value === 'every') {
        const n = Math.max(1, parseInt(container.querySelector('#splitEvery').value) || 1);
        for (let i = 0; i < totalPages; i += n) {
          splits.push(Array.from({ length: Math.min(n, totalPages - i) }, (_, j) => i + j));
        }
      } else {
        const rangeStr = container.querySelector('#pageRanges').value.trim();
        if (!rangeStr) { Utils.toast('请输入页码范围', 'warning'); splitBtn.disabled = false; return; }
        const pages = parseRanges(rangeStr, totalPages);
        if (pages.length === 0) { Utils.toast('页码范围无效', 'error'); splitBtn.disabled = false; return; }
        splits.push(pages.map(p => p - 1));
      }

      for (let i = 0; i < splits.length; i++) {
        const newPdf = await PDFLib.PDFDocument.create();
        const copied = await newPdf.copyPages(srcPdf, splits[i]);
        copied.forEach(p => newPdf.addPage(p));
        const bytes = await newPdf.save();
        Utils.downloadBuffer(bytes, `${baseName}_${i + 1}.pdf`);
        bar.style.width = `${((i + 1) / splits.length) * 100}%`;
      }

      Utils.toast(`已拆分为 ${splits.length} 个文件`, 'success');
    } catch (err) {
      Utils.toast('拆分失败：' + err.message, 'error');
    }

    splitBtn.disabled = false;
    setTimeout(() => progress.classList.add('hidden'), 1500);
  });
}
