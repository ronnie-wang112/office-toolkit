function Tool_pdf_extract(container) {
  let pdfFile = null;
  let totalPages = 0;

  container.innerHTML = `
    <div class="drop-zone" id="extractDropZone">
      <div class="drop-zone-icon">📋</div>
      <div class="drop-zone-text">选择 PDF 文件</div>
    </div>
    <div id="extractFileInfo" style="margin-top:12px"></div>
    <div id="extractOptions" class="hidden">
      <div class="form-group">
        <label>要提取的页码范围</label>
        <input type="text" id="extractRanges" placeholder="1-3,5,7-9">
        <div class="form-hint">共 <span id="extractTotalPages">0</span> 页 · 示例：1-3,5,7-9</div>
      </div>
      <button class="btn btn-primary" id="extractBtn">提取并下载</button>
    </div>
    <input type="file" id="extractFileInput" accept=".pdf" style="display:none">
    <div class="progress-bar hidden" id="extractProgress"><div class="progress-bar-fill"></div></div>
  `;

  const dropZone = container.querySelector('#extractDropZone');
  const fileInput = container.querySelector('#extractFileInput');
  const extractBtn = container.querySelector('#extractBtn');
  const extractOptions = container.querySelector('#extractOptions');
  const totalPagesEl = container.querySelector('#extractTotalPages');
  const progress = container.querySelector('#extractProgress');

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f && (f.type === 'application/pdf' || f.name.endsWith('.pdf'))) { pdfFile = f; loadInfo(); }
  });
  fileInput.addEventListener('change', () => { pdfFile = fileInput.files[0]; if (pdfFile) loadInfo(); });

  async function loadInfo() {
    try {
      const buf = await Utils.readFile(pdfFile);
      const pdf = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
      totalPages = pdf.getPageCount();
      totalPagesEl.textContent = totalPages;
      container.querySelector('#extractFileInfo').innerHTML = `
        <div class="file-item"><span>📄</span><span class="file-name">${pdfFile.name}</span>
        <span class="file-size">${Utils.formatSize(pdfFile.size)}</span><span style="color:var(--text-muted);font-size:0.75rem">${totalPages} 页</span></div>`;
      extractOptions.classList.remove('hidden');
      dropZone.classList.add('hidden');
    } catch (err) { Utils.toast('读取 PDF 失败', 'error'); }
  }

  extractBtn.addEventListener('click', async () => {
    const rangeStr = container.querySelector('#extractRanges').value.trim();
    if (!rangeStr) { Utils.toast('请输入页码范围', 'warning'); return; }
    const pages = rangeStr.split(',').reduce((set, part) => {
      const r = part.split('-').map(n => parseInt(n.trim()));
      if (r.length === 2 && r[1] >= r[0]) {
        for (let i = Math.max(1, r[0]); i <= Math.min(totalPages, r[1]); i++) set.add(i - 1);
      } else if (!isNaN(r[0]) && r[0] >= 1 && r[0] <= totalPages) set.add(r[0] - 1);
      return set;
    }, new Set());
    const pageIdx = Array.from(pages).sort((a, b) => a - b);
    if (pageIdx.length === 0) { Utils.toast('页码范围无效', 'error'); return; }

    extractBtn.disabled = true;
    progress.classList.remove('hidden');
    const bar = progress.querySelector('.progress-bar-fill');

    try {
      const buf = await Utils.readFile(pdfFile);
      const srcPdf = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
      bar.style.width = '30%';
      const newPdf = await PDFLib.PDFDocument.create();
      const copied = await newPdf.copyPages(srcPdf, pageIdx);
      copied.forEach(p => newPdf.addPage(p));
      bar.style.width = '80%';
      const bytes = await newPdf.save();
      bar.style.width = '100%';
      Utils.downloadBuffer(bytes, Utils.getName(pdfFile.name) + '_提取.pdf');
      Utils.toast(`已提取 ${pageIdx.length} 页`, 'success');
    } catch (err) { Utils.toast('提取失败', 'error'); }
    extractBtn.disabled = false;
    setTimeout(() => progress.classList.add('hidden'), 1500);
  });
}
