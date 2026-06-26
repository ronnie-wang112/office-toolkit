// ===== 表格提取 — OpenCV 透视矫正 + 表格线检测 + Tesseract OCR + Excel 导出 =====
function Tool_table_extract(container) {
  let cvReady = false;
  let stream = null;
  let sourceCanvas = null;
  let correctedCanvas = null;
  let tableData = null; // { cells: [[string]] }

  container.innerHTML = `
    <div id="teLoading" style="text-align:center;padding:40px">
      <div class="progress-bar"><div class="progress-bar-fill" style="width:50%"></div></div>
      <div class="progress-text" id="teLoadText">正在加载视觉引擎...</div>
    </div>
    <div id="teUI" class="hidden">
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:280px">
          <div class="camera-view" id="teCamera">
            <video id="teVideo" autoplay playsinline style="width:100%"></video>
          </div>
          <div class="camera-controls">
            <button class="btn btn-secondary btn-sm" id="teSwitchCam">🔄 切换</button>
            <button class="capture-btn" id="teCapture"><div class="inner"></div></button>
            <button class="btn btn-secondary btn-sm" id="teUploadBtn">📤 上传</button>
          </div>
        </div>
        <div style="flex:1;min-width:280px">
          <h4 style="margin-bottom:6px;font-size:0.75rem;color:var(--text-muted);text-align:center">📄 矫正预览</h4>
          <canvas id="tePreview" style="width:100%;border-radius:8px;border:1px solid var(--border)"></canvas>
        </div>
      </div>

      <div style="margin-top:12px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <select id="teExportFmt" style="padding:4px 12px;border-radius:8px;border:1px solid var(--border)">
          <option value="xlsx">导出 Excel (.xlsx)</option>
          <option value="csv">导出 CSV (.csv)</option>
        </select>
        <button class="btn btn-primary" id="teExport">📥 导出</button>
        <button class="btn btn-secondary" id="teRetake">🔄 重新拍摄</button>
      </div>

      <div id="teStatus" style="text-align:center;margin-top:8px;font-size:0.85rem;color:var(--text-muted)"></div>

      <div id="teTableWrapper" class="hidden" style="margin-top:12px;overflow-x:auto;background:var(--bg-card);border-radius:8px;border:1px solid var(--border);padding:8px">
        <table id="teTable" style="width:100%;border-collapse:collapse;font-size:0.8rem"></table>
      </div>
      <div id="teEditHint" class="hidden" style="margin-top:8px;text-align:center;font-size:0.78rem;color:var(--text-muted)">
        💡 点击单元格可编辑内容，修改后重新导出
      </div>
    </div>
    <input type="file" id="teFileInput" accept="image/*" style="display:none">
  `;

  const $ = s => container.querySelector(s);
  const loading = $('#teLoading'), ui = $('#teUI'), loadText = $('#teLoadText');
  const video = $('#teVideo'), preview = $('#tePreview');
  const statusDiv = $('#teStatus'), tableEl = $('#teTable'), tableWrapper = $('#teTableWrapper');
  const editHint = $('#teEditHint');
  const exportFmt = $('#teExportFmt');
  let facingMode = 'environment';

  // ── OpenCV loader ──
  function loadOpenCV() {
    return new Promise((resolve, reject) => {
      if (typeof cv !== 'undefined' && cv.Mat) { cvReady = true; resolve(); return; }
      const s = document.createElement('script');
      s.src = 'lib/opencv.js';
      s.onload = () => {
        const check = () => {
          if (typeof cv !== 'undefined' && cv.Mat) { cvReady = true; resolve(); }
          else setTimeout(check, 100);
        };
        check();
        setTimeout(() => { if (!cvReady) reject(new Error('timeout')); }, 20000);
      };
      s.onerror = () => reject(new Error('load fail'));
      document.head.appendChild(s);
    });
  }

  // ── Camera ──
  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      video.srcObject = stream;
    } catch(e) {
      $('#teCamera').style.display = 'none';
      $('#teCapture').style.display = 'none';
    }
  }

  $('#teSwitchCam').onclick = () => {
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    if (stream) stream.getTracks().forEach(t => t.stop());
    startCamera();
  };

  $('#teCapture').onclick = () => {
    if (!video.videoWidth) return;
    const cv = document.createElement('canvas');
    cv.width = video.videoWidth; cv.height = video.videoHeight;
    cv.getContext('2d').drawImage(video, 0, 0);
    processImage(cv);
  };

  $('#teUploadBtn').onclick = () => $('#teFileInput').click();
  $('#teFileInput').onchange = () => {
    const f = $('#teFileInput').files[0];
    if (f) handleFile(f);
  };

  async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const img = await Utils.loadImageFromFile(file);
    const cv = Utils.imageToCanvas(img);
    processImage(cv);
  }

  // ── Image to OpenCV Mat (RGBA) ──
  function canvasToMat(canvas) {
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const mat = cv.matFromArray(canvas.height, canvas.width, cv.CV_8UC4, data);
    return mat;
  }

  function matToCanvas(mat) {
    const cv2 = document.createElement('canvas');
    cv2.width = mat.cols;
    cv2.height = mat.rows;
    cv.imshow(cv2, mat);
    return cv2;
  }

  // ── Perspective correction ──
  function correctPerspective(srcMat) {
    try {
      const gray = new cv.Mat();
      cv.cvtColor(srcMat, gray, cv.COLOR_RGBA2GRAY);

      // Blur + Canny
      const blurred = new cv.Mat();
      cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
      const edges = new cv.Mat();
      cv.Canny(blurred, edges, 50, 150);
      blurred.delete();

      // Find contours
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      edges.delete();

      // Find largest quadrilateral contour
      let bestContour = null;
      let bestArea = 0;
      const imgArea = gray.rows * gray.cols;

      for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const area = cv.contourArea(cnt);
        if (area < imgArea * 0.15 || area > imgArea * 0.95) continue;

        const peri = cv.arcLength(cnt, true);
        const approx = new cv.Mat();
        cv.approxPolyDP(cnt, approx, 0.04 * peri, true);

        if (approx.rows === 4 && area > bestArea) {
          bestArea = area;
          bestContour = approx.clone();
        }
        approx.delete();
      }

      if (!bestContour) {
        gray.delete(); contours.delete(); hierarchy.delete();
        return srcMat.clone();
      }

      // Order corners: top-left, top-right, bottom-right, bottom-left
      const pts = [];
      for (let i = 0; i < 4; i++) {
        pts.push({ x: bestContour.data32S[i * 2], y: bestContour.data32S[i * 2 + 1] });
      }
      bestContour.delete();
      gray.delete();
      contours.delete();
      hierarchy.delete();

      pts.sort((a, b) => a.x - b.x);
      const left = [pts[0], pts[1]].sort((a, b) => a.y - b.y);
      const right = [pts[2], pts[3]].sort((a, b) => a.y - b.y);
      const ordered = [left[0], right[0], right[1], left[1]];

      // Output size
      const w1 = Math.hypot(ordered[1].x - ordered[0].x, ordered[1].y - ordered[0].y);
      const w2 = Math.hypot(ordered[2].x - ordered[3].x, ordered[2].y - ordered[3].y);
      const h1 = Math.hypot(ordered[3].x - ordered[0].x, ordered[3].y - ordered[0].y);
      const h2 = Math.hypot(ordered[2].x - ordered[1].x, ordered[2].y - ordered[1].y);
      const outW = Math.round(Math.max(w1, w2));
      const outH = Math.round(Math.max(h1, h2));

      const srcPts = cv.matFromArray(4, 2, cv.CV_32F, [
        ordered[0].x, ordered[0].y,
        ordered[1].x, ordered[1].y,
        ordered[2].x, ordered[2].y,
        ordered[3].x, ordered[3].y,
      ]);
      const dstPts = cv.matFromArray(4, 2, cv.CV_32F, [0, 0, outW - 1, 0, outW - 1, outH - 1, 0, outH - 1]);

      const M = cv.getPerspectiveTransform(srcPts, dstPts);
      const result = new cv.Mat();
      cv.warpPerspective(srcMat, result, M, new cv.Size(outW, outH));

      srcPts.delete(); dstPts.delete(); M.delete();
      return result;

    } catch(e) {
      console.warn('Perspective correction error:', e);
      return srcMat.clone();
    }
  }

  // ── Table line detection ──
  function detectTableLines(mat) {
    try {
      const gray = new cv.Mat();
      cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);

      // Binary threshold (assume dark text on light background)
      const binary = new cv.Mat();
      cv.adaptiveThreshold(gray, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 31, 10);

      // Horizontal lines
      const hKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(Math.floor(mat.cols / 20), 1));
      const hLines = new cv.Mat();
      cv.morphologyEx(binary, hLines, cv.MORPH_OPEN, hKernel);
      hKernel.delete();

      // Vertical lines
      const vKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(1, Math.floor(mat.rows / 40)));
      const vLines = new cv.Mat();
      cv.morphologyEx(binary, vLines, cv.MORPH_OPEN, vKernel);
      vKernel.delete();

      // Combine lines
      const combined = new cv.Mat();
      cv.add(hLines, vLines, combined);
      hLines.delete(); vLines.delete();

      // Dilate to merge gaps
      const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
      const dilated = new cv.Mat();
      cv.dilate(combined, dilated, kernel, new cv.Point(-1, -1), 2);
      kernel.delete(); combined.delete();

      gray.delete(); binary.delete();
      return dilated;

    } catch(e) {
      console.warn('Line detection error:', e);
      return new cv.Mat();
    }
  }

  // ── Find cell boundaries ──
  function findCellBoundaries(lineMat) {
    const hProj = new Array(lineMat.rows).fill(0);
    const vProj = new Array(lineMat.cols).fill(0);

    for (let y = 0; y < lineMat.rows; y++) {
      let sum = 0;
      for (let x = 0; x < lineMat.cols; x++) {
        sum += lineMat.ucharPtr(y, x)[0];
      }
      hProj[y] = sum;
    }
    for (let x = 0; x < lineMat.cols; x++) {
      let sum = 0;
      for (let y = 0; y < lineMat.rows; y++) {
        sum += lineMat.ucharPtr(y, x)[0];
      }
      vProj[x] = sum;
    }

    const avgH = hProj.reduce((a, b) => a + b, 0) / hProj.length;
    const avgV = vProj.reduce((a, b) => a + b, 0) / vProj.length;

    function findLines(proj, avg, totalLen) {
      const lines = [0];
      let inLine = false;
      const minGap = Math.max(3, Math.round(totalLen * 0.01));
      let gapLen = 0;
      let lastFound = 0;

      for (let i = 1; i < proj.length; i++) {
        if (proj[i] > avg * 0.3) {
          if (!inLine && (i - lastFound) >= minGap) {
            lines.push(i);
            lastFound = i;
          }
          inLine = true;
          gapLen = 0;
        } else {
          if (inLine) gapLen++;
          if (gapLen > minGap * 0.5) inLine = false;
        }
      }
      lines.push(proj.length - 1);
      return lines.filter((v, i, a) => i === 0 || (v - a[i-1]) >= minGap);
    }

    const rowLines = findLines(hProj, avgH, lineMat.rows);
    const colLines = findLines(vProj, avgV, lineMat.cols);

    return { rowLines, colLines };
  }

  // ── OCR cell using Tesseract ──
  async function ocrCell(canvas) {
    try {
      if (typeof Tesseract === 'undefined') {
        return '';
      }

      const worker = await Tesseract.createWorker('chi_sim+eng', 1, {
        workerPath: 'lib/tesseract.worker.min.js',
        logger: m => {
          if (m.status === 'recognizing text') {
            // progress update
          }
        }
      });

      const { data: { text } } = await worker.recognize(canvas);
      await worker.terminate();
      return text.replace(/\s+/g, ' ').trim();
    } catch(e) {
      console.warn('OCR error:', e);
      return '';
    }
  }

  // ── Process image ──
  async function processImage(canvas) {
    if (!cvReady) {
      Utils.toast('视觉引擎还在加载，请稍候...', 'error');
      return;
    }

    sourceCanvas = canvas;
    statusDiv.textContent = '🔄 正在矫正透视...';

    try {
      const srcMat = canvasToMat(canvas);

      // Step 1: Perspective correction
      const corrected = correctPerspective(srcMat);
      srcMat.delete();

      correctedCanvas = matToCanvas(corrected);

      // Show preview
      preview.width = correctedCanvas.width;
      preview.height = correctedCanvas.height;
      const pctx = preview.getContext('2d');
      pctx.drawImage(correctedCanvas, 0, 0);

      // Step 2: Detect table lines
      statusDiv.textContent = '🔍 正在检测表格结构...';
      const lineMat = detectTableLines(corrected);

      const { rowLines, colLines } = findCellBoundaries(lineMat);
      lineMat.delete();

      if (rowLines.length < 3 || colLines.length < 3) {
        statusDiv.textContent = '⚠️ 未检测到明显的表格结构，尝试全图 OCR...';
        // Fallback: OCR the entire image as one cell
        const text = await ocrCell(correctedCanvas);
        tableData = { cells: [[text]] };
        renderTablePreview(tableData.cells);
        statusDiv.textContent = '✅ 已识别（单格模式）';
        corrected.delete();
        return;
      }

      // Step 3: Extract cells and OCR
      statusDiv.textContent = '📝 正在识别文字...';

      const cells = [];
      const cellCanvases = [];
      for (let r = 0; r < rowLines.length - 1; r++) {
        const row = [];
        const rowCans = [];
        for (let c = 0; c < colLines.length - 1; c++) {
          const x = colLines[c];
          const y = rowLines[r];
          const w = colLines[c + 1] - x;
          const h = rowLines[r + 1] - y;

          const cellCV = document.createElement('canvas');
          cellCV.width = w;
          cellCV.height = h;
          cellCV.getContext('2d').drawImage(correctedCanvas, x, y, w, h, 0, 0, w, h);
          row.push('...');
          rowCans.push(cellCV);
        }
        cells.push(row);
        cellCanvases.push(rowCans);
      }
      corrected.delete();

      // Render preview immediately
      renderTablePreview(cells);

      // OCR each cell
      statusDiv.textContent = '📝 正在识别文字 (0%)...';
      let total = 0, done = 0;
      for (let r = 0; r < cells.length; r++)
        for (let c = 0; c < cells[r].length; c++)
          total++;

      for (let r = 0; r < cells.length; r++) {
        for (let c = 0; c < cells[r].length; c++) {
          const text = await ocrCell(cellCanvases[r][c]);
          cells[r][c] = text || '';
          done++;
          statusDiv.textContent = `📝 正在识别文字 (${Math.round(done/total*100)}%)...`;

          // Update single cell in table
          const cellEl = tableEl.querySelector(`tr:nth-child(${r+1}) td:nth-child(${c+1}), tr:nth-child(${r+1}) th:nth-child(${c+1})`);
          if (cellEl) cellEl.textContent = text || '';
        }
      }

      tableData = { cells };
      statusDiv.textContent = `✅ 表格识别完成 (${rowLines.length-1}行 × ${colLines.length-1}列)`;

    } catch(e) {
      console.error('Processing error:', e);
      statusDiv.textContent = '❌ 处理出错: ' + e.message;
    }
  }

  // ── Render table preview ──
  function renderTablePreview(cells) {
    tableWrapper.classList.remove('hidden');
    editHint.classList.remove('hidden');
    let html = '';
    for (let r = 0; r < cells.length; r++) {
      html += '<tr>';
      for (let c = 0; c < cells[r].length; c++) {
        const isHeader = r === 0;
        const tag = isHeader ? 'th' : 'td';
        const val = Utils.escapeHtml(cells[r][c] || '');
        html += `<${tag} style="border:1px solid var(--border);padding:4px 8px;min-width:60px;max-width:200px;overflow:hidden;text-overflow:ellipsis;${isHeader ? 'background:var(--bg);font-weight:600' : ''}" contenteditable="true">${val}</${tag}>`;
      }
      html += '</tr>';
    }
    tableEl.innerHTML = html;
  }

  // ── Export ──
  $('#teExport').onclick = () => {
    const rows = tableEl.querySelectorAll('tr');
    const data = [];
    rows.forEach(tr => {
      const rowData = [];
      tr.querySelectorAll('th,td').forEach(cell => {
        rowData.push(cell.textContent.trim());
      });
      data.push(rowData);
    });

    if (data.length === 0) {
      Utils.toast('没有可导出的表格数据', 'error');
      return;
    }

    const fmt = exportFmt.value;

    if (fmt === 'csv' || typeof XLSX === 'undefined') {
      const csv = data.map(row =>
        row.map(c => '"' + c.replace(/"/g, '""') + '"').join(',')
      ).join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
      Utils.download(blob, '表格.csv');
      Utils.toast('已导出 CSV', 'success');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);

      // Auto column widths
      const colWidths = data[0].map((_, ci) => {
        let maxW = 10;
        data.forEach(row => {
          const len = (row[ci] || '').length;
          if (len > maxW) maxW = len;
        });
        return { wch: Math.min(maxW + 2, 50) };
      });
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, '表格');
      XLSX.writeFile(wb, '表格提取.xlsx');
      Utils.toast('已导出 Excel', 'success');
    } catch(e) {
      Utils.toast('导出失败: ' + e.message, 'error');
    }
  };

  // ── Detect button (re-run OCR) ──
  $('#teRetake').onclick = () => {
    sourceCanvas = null; correctedCanvas = null; tableData = null;
    preview.width = 0; preview.height = 0;
    tableWrapper.classList.add('hidden');
    editHint.classList.add('hidden');
    tableEl.innerHTML = '';
    statusDiv.textContent = '';
  };

  // ── Init ──
  (async () => {
    try {
      loadText.textContent = '正在加载 OpenCV 视觉引擎...';
      await loadOpenCV();
      loadText.textContent = '视觉引擎就绪，启动摄像头...';
      loading.classList.add('hidden');
      ui.classList.remove('hidden');
      await startCamera();
    } catch(e) {
      loadText.innerHTML = `<div style="color:var(--warning);padding:20px"><p>⚠️ 视觉引擎加载失败</p><p style="font-size:0.8rem;color:var(--text-muted)">可上传图片使用基础功能</p></div>`;
      setTimeout(() => { loading.classList.add('hidden'); ui.classList.remove('hidden'); startCamera(); }, 2000);
    }
  })();
}

function Tool_table_extract_deactivate() {}
