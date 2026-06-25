function Tool_word2pdf(container) {
  let docxFile = null;

  container.innerHTML = `
    <div class="drop-zone" id="w2pDrop">
      <div class="drop-zone-icon">📝</div>
      <div class="drop-zone-text">选择 .docx 文件</div>
      <div class="drop-zone-hint">将 Word 文档转换为 PDF（保真度约 70-85%）</div>
    </div>
    <div id="w2pInfo" class="hidden">
      <div class="file-item" id="w2pFileItem"></div>
      <div class="preview-container" style="max-height:500px;overflow:auto">
        <div id="w2pPreview" style="padding:40px;background:#fff;font-family:'SimSun','Songti SC',serif;font-size:14px;line-height:1.8;color:#333"></div>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" id="w2pConvert">转换为 PDF</button>
        <button class="btn btn-secondary" id="w2pReselect">重新选择</button>
      </div>
    </div>
    <input type="file" id="w2pInput" accept=".docx" style="display:none">
    <div class="progress-bar hidden" id="w2pProgress"><div class="progress-bar-fill"></div></div>
    <div class="progress-text hidden" id="w2pProgressText"></div>
  `;

  const dropZone = container.querySelector('#w2pDrop');
  const fileInput = container.querySelector('#w2pInput');
  const info = container.querySelector('#w2pInfo');
  const preview = container.querySelector('#w2pPreview');
  const progress = container.querySelector('#w2pProgress');
  const progressText = container.querySelector('#w2pProgressText');
  const bar = progress.querySelector('.progress-bar-fill');
  let htmlResult = '';

  async function loadDocx(file) {
    docxFile = file;
    progress.classList.remove('hidden');
    progressText.classList.remove('hidden');
    bar.style.width = '10%';
    progressText.textContent = '正在解析文档...';

    try {
      const buffer = await Utils.readFile(file);
      bar.style.width = '30%';
      const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
      bar.style.width = '70%';
      htmlResult = result.value;
      preview.innerHTML = htmlResult;
      info.classList.remove('hidden');
      dropZone.classList.add('hidden');
      container.querySelector('#w2pFileItem').innerHTML = `
        <span>📝</span><span class="file-name">${file.name}</span>
        <span class="file-size">${Utils.formatSize(file.size)}</span>`;
      bar.style.width = '100%';
    } catch (err) {
      Utils.toast('解析失败: ' + err.message, 'error');
    }
    setTimeout(() => { progress.classList.add('hidden'); progressText.classList.add('hidden'); }, 1000);
  }

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.docx')) loadDocx(f);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) loadDocx(fileInput.files[0]);
  });

  container.querySelector('#w2pReselect').addEventListener('click', () => {
    info.classList.add('hidden');
    dropZone.classList.remove('hidden');
    docxFile = null;
    htmlResult = '';
  });

  container.querySelector('#w2pConvert').addEventListener('click', async () => {
    if (!htmlResult) return;
    progress.classList.remove('hidden');
    progressText.classList.remove('hidden');
    bar.style.width = '5%';
    progressText.textContent = '正在转换为 PDF...';

    try {
      const { PDFDocument } = PDFLib;
      const pdf = await PDFDocument.create();
      const pageW = 595;
      const pageH = 842;
      const margin = 50;
      const contentW = pageW - margin * 2;
      const renderWidth = contentW * 2; // High DPI
      const scale = renderWidth / contentW;

      // Render entire HTML to canvas using html2canvas
      const clone = preview.cloneNode(true);
      clone.style.width = contentW + 'px';
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.fontSize = '14px';
      clone.style.lineHeight = '1.8';
      document.body.appendChild(clone);

      bar.style.width = '30%';
      const canvas = await html2canvas(clone, {
        scale: scale,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: contentW,
      });
      document.body.removeChild(clone);

      bar.style.width = '60%';

      // Slice canvas into pages
      const totalHeight = canvas.height;
      const pageRenderH = (pageH - margin * 2) * scale;
      const totalPages = Math.ceil(totalHeight / pageRenderH);

      for (let i = 0; i < totalPages; i++) {
        const y = i * pageRenderH;
        const h = Math.min(pageRenderH, totalHeight - y);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = h;
        const pctx = pageCanvas.getContext('2d');
        pctx.fillStyle = '#ffffff';
        pctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        pctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);

        const imgBuf = await Utils.canvasToBuffer(pageCanvas, 'image/png', 1.0);
        const embedded = await pdf.embedPng(new Uint8Array(imgBuf));
        const page = pdf.addPage([pageW, pageH]);
        page.drawImage(embedded, {
          x: margin, y: margin,
          width: contentW,
          height: h / scale,
        });
        bar.style.width = (60 + (35 * (i + 1) / totalPages)) + '%';
      }

      const bytes = await pdf.save();
      bar.style.width = '100%';
      progressText.textContent = '转换完成！';
      Utils.downloadBuffer(bytes, Utils.getName(docxFile.name) + '.pdf');
      Utils.toast('Word 转 PDF 完成', 'success');
    } catch (err) {
      Utils.toast('转换失败: ' + err.message, 'error');
      console.error(err);
    }
    setTimeout(() => { progress.classList.add('hidden'); progressText.classList.add('hidden'); }, 1500);
  });
}
