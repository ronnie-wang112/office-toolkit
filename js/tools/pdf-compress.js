function Tool_pdf_compress(container) {
  let pdfFile = null;
  let totalPages = 0;
  let originalSize = 0;

  container.innerHTML = `
    <div class="drop-zone" id="compressPdfDrop">
      <div class="drop-zone-icon">🗜️</div>
      <div class="drop-zone-text">选择要压缩的 PDF 文件</div>
      <div class="drop-zone-hint">快速压缩保留文字 · 深度压缩大幅缩小并可按目标大小导出</div>
    </div>
    <div id="compressInfo" class="hidden">
      <div class="file-item" id="compressFileItem"></div>
      <div class="form-group" style="margin-top:12px">
        <label>压缩模式</label>
        <select id="compressMode">
          <option value="quick">快速压缩（保留文字，轻微缩小）</option>
          <option value="deep">深度压缩（渲染为图片，大幅缩小，丢失文字可搜索性）</option>
        </select>
      </div>
      <div id="deepOptions" class="hidden">
        <div class="form-row">
          <div class="form-group" style="max-width:150px">
            <label>导出目标大小</label>
            <input type="number" id="compressTargetMB" value="0" min="0" max="500" step="0.1" placeholder="自动">
            <div class="form-hint">MB，填 0 则手动设置质量</div>
          </div>
          <div class="form-group" id="manualQualityGrp" style="max-width:150px">
            <label>图片质量</label>
            <input type="number" id="compressQuality" value="0.6" min="0.1" max="1" step="0.05">
            <div class="form-hint">仅目标为 0 时生效</div>
          </div>
          <div class="form-group" style="max-width:150px">
            <label>渲染 DPI</label>
            <select id="compressDpi">
              <option value="1">72 DPI (极小)</option>
              <option value="1.5" selected>108 DPI (推荐)</option>
              <option value="2">144 DPI</option>
              <option value="2.5">180 DPI</option>
            </select>
          </div>
        </div>
      </div>
      <button class="btn btn-primary" id="compressBtn">开始压缩</button>
    </div>
    <input type="file" id="compressPdfInput" accept=".pdf" style="display:none">
    <div class="progress-bar hidden" id="compressProgress"><div class="progress-bar-fill"></div></div>
    <div class="progress-text hidden" id="compressProgressText"></div>
    <div id="compressResult" class="result-area hidden" style="margin-top:12px">
      <span class="result-icon">✅</span>
      <span class="result-text" id="compressResultText"></span>
      <button class="btn btn-primary btn-sm" id="compressDownload">下载压缩文件</button>
    </div>
  `;

  const dropZone = container.querySelector('#compressPdfDrop');
  const fileInput = container.querySelector('#compressPdfInput');
  const info = container.querySelector('#compressInfo');
  const compressMode = container.querySelector('#compressMode');
  const deepOptions = container.querySelector('#deepOptions');
  const compressBtn = container.querySelector('#compressBtn');
  const progress = container.querySelector('#compressProgress');
  const progressText = container.querySelector('#compressProgressText');
  const bar = progress.querySelector('.progress-bar-fill');
  const result = container.querySelector('#compressResult');
  const resultText = container.querySelector('#compressResultText');
  const downloadBtn = container.querySelector('#compressDownload');
  const targetMB = container.querySelector('#compressTargetMB');
  const manualQualityGrp = container.querySelector('#manualQualityGrp');

  let compressedBytes = null;

  compressMode.addEventListener('change', () => {
    deepOptions.classList.toggle('hidden', compressMode.value !== 'deep');
  });

  targetMB.addEventListener('input', () => {
    const val = parseFloat(targetMB.value) || 0;
    manualQualityGrp.style.opacity = val > 0 ? '0.4' : '1';
  });

  async function loadPdf(file) {
    pdfFile = file;
    originalSize = file.size;
    const buf = await Utils.readFile(file);
    try {
      const pdf = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
      totalPages = pdf.getPageCount();
    } catch (e) { totalPages = '?'; }
    container.querySelector('#compressFileItem').innerHTML = `
      <span>📄</span><span class="file-name">${file.name}</span>
      <span class="file-size">${Utils.formatSize(file.size)}</span>
      <span style="color:var(--text-muted);font-size:0.75rem">${totalPages} 页</span>`;
    info.classList.remove('hidden');
    dropZone.classList.add('hidden');

    // Suggest target based on current size
    targetMB.placeholder = (originalSize / 1024 / 1024 * 0.3).toFixed(1);
  }

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f && (f.type === 'application/pdf' || f.name.endsWith('.pdf'))) loadPdf(f);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) loadPdf(fileInput.files[0]);
  });

  // Binary search to find best quality for target size
  async function findQualityForTarget(buf, dpi) {
    const targetBytes = parseFloat(targetMB.value) * 1024 * 1024;
    if (targetBytes <= 0) return parseFloat(container.querySelector('#compressQuality').value) || 0.6;

    progressText.textContent = '正在分析最佳压缩参数...';
    bar.style.width = '5%';

    // Render first page to estimate per-page JPEG size vs quality
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
    const loadingTask = pdfjsLib.getDocument({ data: buf.slice(0) });
    const pdfjs = await loadingTask.promise;
    const totalP = pdfjs.numPages;

    const samplePage = Math.min(3, totalP);
    const scale = dpi;

    // Sample at quality levels
    const qualityLevels = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
    const samples = [];

    for (const q of qualityLevels) {
      bar.style.width = (5 + (qualityLevels.indexOf(q) / qualityLevels.length) * 15) + '%';
      const page = await pdfjs.getPage(samplePage);
      const vp = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width;
      canvas.height = vp.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;

      const blob = await Utils.canvasToBlob(canvas, 'image/jpeg', q);
      const imgBytes = (await blob.arrayBuffer()).byteLength;

      // Also get a quick PDF overhead estimate by making a tiny PDF
      const { PDFDocument } = PDFLib;
      const tmpPdf = await PDFDocument.create();
      const imgBuf = await Utils.canvasToBuffer(canvas, 'image/jpeg', q);
      const embedded = await tmpPdf.embedJpg(new Uint8Array(imgBuf));
      const tmpPage = tmpPdf.addPage([vp.width, vp.height]);
      tmpPage.drawImage(embedded, { x: 0, y: 0, width: vp.width, height: vp.height });
      const pdfBytes = (await tmpPdf.save({ useObjectStreams: true })).byteLength;
      const overhead = pdfBytes - imgBytes;

      // Estimate total: per_page_overhead + totalPages * per_page_jpeg
      const estimatedTotal = overhead + totalP * imgBytes;
      samples.push({ quality: q, estimatedTotal, overhead, perPageImg: imgBytes });
    }

    bar.style.width = '25%';

    // Find best quality: closest to target without exceeding, or closest if all exceed
    let best = samples[0];
    for (const s of samples) {
      if (s.estimatedTotal <= targetBytes && s.estimatedTotal > best.estimatedTotal) {
        best = s;
      }
    }
    // If all exceed, pick the one with smallest size
    if (best.estimatedTotal > targetBytes) {
      best = samples[samples.length - 1]; // lowest quality
    }

    return { quality: best.quality, estimatedSize: best.estimatedTotal };
  }

  compressBtn.addEventListener('click', async () => {
    if (!pdfFile) return;
    compressBtn.disabled = true;
    progress.classList.remove('hidden');
    progressText.classList.remove('hidden');
    result.classList.add('hidden');
    bar.style.width = '0%';

    try {
      const buf = await Utils.readFile(pdfFile);

      if (compressMode.value === 'quick') {
        progressText.textContent = '正在优化 PDF 结构...';
        bar.style.width = '10%';
        const pdf = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
        bar.style.width = '40%';

        pdf.setTitle('');
        pdf.setAuthor('');
        pdf.setSubject('');
        pdf.setKeywords([]);
        pdf.setProducer('');
        pdf.setCreator('');
        bar.style.width = '60%';

        compressedBytes = await pdf.save({ useObjectStreams: true });
        bar.style.width = '100%';
        progressText.textContent = '快速压缩完成！';
      } else {
        // Deep compression with target size support
        progressText.textContent = '正在加载 PDF...';
        bar.style.width = '3%';

        pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
        const loadingTask = pdfjsLib.getDocument({ data: buf.slice(0) });
        const pdfjs = await loadingTask.promise;
        totalPages = pdfjs.numPages;
        const dpi = parseFloat(container.querySelector('#compressDpi').value) || 1.5;
        const scale = dpi;

        // Determine quality
        let quality;
        const { quality: autoQ, estimatedSize } = await findQualityForTarget(buf, dpi);
        quality = autoQ;

        if (parseFloat(targetMB.value) > 0) {
          progressText.textContent = `目标 ${targetMB.value}MB，自动选择质量 ${quality.toFixed(2)}（预估 ${(estimatedSize / 1024 / 1024).toFixed(1)}MB）`;
        } else {
          progressText.textContent = `使用质量 ${quality.toFixed(2)}，正在渲染...`;
        }

        const { PDFDocument } = PDFLib;
        const newPdf = await PDFDocument.create();

        for (let i = 1; i <= totalPages; i++) {
          progressText.textContent = `正在渲染第 ${i}/${totalPages} 页 (质量: ${quality.toFixed(2)})...`;
          const page = await pdfjs.getPage(i);
          const vp = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = vp.width;
          canvas.height = vp.height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport: vp }).promise;

          const imgBuf = await Utils.canvasToBuffer(canvas, 'image/jpeg', quality);
          const embedded = await newPdf.embedJpg(new Uint8Array(imgBuf));
          const pdfPage = newPdf.addPage([vp.width, vp.height]);
          pdfPage.drawImage(embedded, { x: 0, y: 0, width: vp.width, height: vp.height });

          bar.style.width = (30 + (65 * i / totalPages)) + '%';
        }

        bar.style.width = '95%';
        progressText.textContent = '正在生成压缩 PDF...';
        compressedBytes = await newPdf.save({ useObjectStreams: true });
        bar.style.width = '100%';
        progressText.textContent = '深度压缩完成！';
      }

      const newSize = compressedBytes.byteLength;
      const reduction = ((1 - newSize / originalSize) * 100).toFixed(1);
      const sign = reduction > 0 ? '↓' : '↑';
      const targetStr = parseFloat(targetMB.value) > 0
        ? `（目标 ${targetMB.value}MB）`
        : '';
      resultText.innerHTML = `
        原大小: <strong>${Utils.formatSize(originalSize)}</strong>
        → 压缩后: <strong>${Utils.formatSize(newSize)}</strong>
        (${sign} ${Math.abs(reduction)}%) ${targetStr}
      `;
      result.classList.remove('hidden');
    } catch (err) {
      Utils.toast('压缩失败: ' + err.message, 'error');
      console.error(err);
    }

    compressBtn.disabled = false;
    setTimeout(() => { progress.classList.add('hidden'); progressText.classList.add('hidden'); }, 2000);
  });

  downloadBtn.addEventListener('click', () => {
    if (compressedBytes) {
      Utils.downloadBuffer(compressedBytes, Utils.getName(pdfFile.name) + '_压缩.pdf');
      Utils.toast('已下载压缩文件', 'success');
    }
  });
}
