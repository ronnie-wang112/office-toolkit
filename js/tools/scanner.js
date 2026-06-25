function Tool_scanner(container) {
  let stream = null;
  let capturedImage = null;
  
  let cvReady = false;

  container.innerHTML = `
    <div id="scannerLoading" style="text-align:center;padding:40px">
      <div class="progress-bar"><div class="progress-bar-fill" style="width:50%"></div></div>
      <div class="progress-text">正在加载 OpenCV 视觉引擎...</div>
    </div>
    <div id="scannerUI" class="hidden">
      <div class="camera-view" id="scannerCamera">
        <video id="scannerVideo" autoplay playsinline></video>
      </div>
      <div class="camera-controls">
        <button class="btn btn-secondary btn-sm" id="switchCamera">🔄 切换摄像头</button>
        <button class="capture-btn" id="scannerCapture" title="拍照">
          <div class="inner"></div>
        </button>
        <button class="btn btn-secondary btn-sm" id="scannerUploadBtn">📤 上传图片</button>
      </div>
    </div>

    <div id="scannerResult" class="hidden" style="margin-top:16px">
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px">
        <div style="flex:1;min-width:180px">
          <h4 style="margin-bottom:6px;color:var(--text-muted);font-size:0.75rem;text-align:center">📷 原始拍摄</h4>
          <div class="preview-container"><img id="scannerOriginal" style="width:100%"></div>
        </div>
        <div style="flex:1;min-width:180px">
          <h4 style="margin-bottom:6px;color:var(--text-muted);font-size:0.75rem;text-align:center">✨ 智能处理</h4>
          <div class="preview-container"><canvas id="scannerProcessed"></canvas></div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group" style="max-width:180px">
          <label>处理模式</label>
          <select id="scannerMode">
            <option value="auto">自动检测 + 矫正</option>
            <option value="enhance">仅增强（不裁切）</option>
            <option value="original">原始图片</option>
          </select>
        </div>
        <div class="form-group" style="max-width:150px">
          <label>增强强度</label>
          <input type="range" id="scannerEnhance" value="70" min="0" max="100">
        </div>
        <div class="form-group" style="max-width:150px">
          <label>导出格式</label>
          <select id="scannerFormat">
            <option value="pdf">PDF</option>
            <option value="png">PNG</option>
            <option value="jpg">JPEG</option>
          </select>
        </div>
      </div>

      <div class="form-group" style="max-width:250px">
        <label>页面尺寸</label>
        <select id="scannerPageSize">
          <option value="auto">自动（保持比例）</option>
          <option value="a4">A4</option>
          <option value="a4p">A4 纵向</option>
          <option value="letter">Letter</option>
        </select>
      </div>

      <div class="btn-group">
        <button class="btn btn-primary" id="scannerDownload">导出</button>
        <button class="btn btn-secondary" id="scannerRetake">重新拍摄</button>
      </div>
    </div>

    <div id="scannerFallback" style="margin-top:16px">
      <div class="drop-zone" id="scannerDropZone">
        <div class="drop-zone-icon">📤</div>
        <div class="drop-zone-text">或拖拽图片到此处进行扫描</div>
        <div class="drop-zone-hint">自动检测文档边缘、矫正透视、去除多余部分</div>
      </div>
      <input type="file" id="scannerFileInput" accept="image/*" style="display:none">
    </div>

    <div class="progress-bar hidden" id="scannerProgress"><div class="progress-bar-fill"></div></div>
    <div class="progress-text hidden" id="scannerProgressText"></div>
  `;

  const video = container.querySelector('#scannerVideo');
  const result = container.querySelector('#scannerResult');
  const processedCanvas = container.querySelector('#scannerProcessed');
  const originalImg = container.querySelector('#scannerOriginal');
  const scannerMode = container.querySelector('#scannerMode');
  const enhanceSlider = container.querySelector('#scannerEnhance');
  const fmtSelect = container.querySelector('#scannerFormat');
  const pageSizeSelect = container.querySelector('#scannerPageSize');
  const progress = container.querySelector('#scannerProgress');
  const progressText = container.querySelector('#scannerProgressText');
  const bar = progress.querySelector('.progress-bar-fill');
  const loading = container.querySelector('#scannerLoading');
  const ui = container.querySelector('#scannerUI');
  const fallback = container.querySelector('#scannerFallback');

  let facingMode = 'environment';
  let currentSourceCanvas = null;

  // ===== Load OpenCV =====
  function loadOpenCV() {
    return new Promise((resolve, reject) => {
      if (typeof cv !== 'undefined' && cv.Mat) {
        cvReady = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'lib/opencv.js';
      script.onload = () => {
        // OpenCV.js sets cv on window after WASM init
        const checkCv = setInterval(() => {
          if (typeof cv !== 'undefined' && cv.Mat) {
            clearInterval(checkCv);
            cvReady = true;
            resolve();
          }
        }, 100);
        // Timeout after 30s
        setTimeout(() => {
          clearInterval(checkCv);
          if (!cvReady) reject(new Error('OpenCV 加载超时'));
        }, 30000);
      };
      script.onerror = () => reject(new Error('OpenCV 脚本加载失败'));
      document.head.appendChild(script);
    });
  }

  // ===== Core Processing: Document Detection + Perspective Correction =====
  function detectAndCorrect(sourceCanvas) {
    if (!cvReady) return sourceCanvas;

    try {
      // Convert canvas to cv.Mat
      const src = cv.imread(sourceCanvas);
      const origW = src.cols;
      const origH = src.rows;

      // Resize for faster processing
      const maxDim = 1200;
      let scale = 1;
      let workMat;
      if (origW > maxDim || origH > maxDim) {
        scale = maxDim / Math.max(origW, origH);
        const newW = Math.round(origW * scale);
        const newH = Math.round(origH * scale);
        workMat = new cv.Mat();
        cv.resize(src, workMat, new cv.Size(newW, newH));
      } else {
        workMat = src.clone();
      }

      // Grayscale
      const gray = new cv.Mat();
      cv.cvtColor(workMat, gray, cv.COLOR_RGBA2GRAY);

      // Gaussian blur to reduce noise
      const blurred = new cv.Mat();
      cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

      // Canny edge detection
      const edges = new cv.Mat();
      cv.Canny(blurred, edges, 50, 150);

      // Dilate edges to connect gaps
      const dilated = new cv.Mat();
      const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
      cv.dilate(edges, dilated, kernel, new cv.Point(-1, -1), 1);

      // Find contours
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(dilated, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      // Find the largest quadrilateral contour
      let bestContour = null;
      let bestArea = 0;
      const minArea = (workMat.cols * workMat.rows) * 0.05; // At least 5% of image

      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = cv.contourArea(contour);
        if (area < minArea) continue;

        const peri = cv.arcLength(contour, true);
        const approx = new cv.Mat();
        cv.approxPolyDP(contour, approx, 0.02 * peri, true);

        if (approx.rows === 4 && area > bestArea) {
          bestArea = area;
          bestContour = approx.clone();
        }
        approx.delete();
      }

      let result;
      if (bestContour) {
        // Order corners: top-left, top-right, bottom-right, bottom-left
        const corners = [];
        for (let i = 0; i < 4; i++) {
          corners.push({
            x: bestContour.data32S[i * 2] / scale,
            y: bestContour.data32S[i * 2 + 1] / scale,
          });
        }

        // Sort by sum (top-left smallest, bottom-right largest)
        corners.sort((a, b) => (a.x + a.y) - (b.x + b.y));
        const tl = corners[0];
        const br = corners[3];
        // Sort remaining by x
        const mid = [corners[1], corners[2]].sort((a, b) => a.x - b.x);
        const tr = mid[1];
        const bl = mid[0];

        // Calculate output dimensions
        const widthTop = Math.hypot(tr.x - tl.x, tr.y - tl.y);
        const widthBottom = Math.hypot(br.x - bl.x, br.y - bl.y);
        const outW = Math.round(Math.max(widthTop, widthBottom));

        const heightLeft = Math.hypot(bl.x - tl.x, bl.y - tl.y);
        const heightRight = Math.hypot(br.x - tr.x, br.y - tr.y);
        const outH = Math.round(Math.max(heightLeft, heightRight));

        // Clamp reasonable output size
        const clampedW = Math.min(Math.max(outW, 200), 4000);
        const clampedH = Math.min(Math.max(outH, 200), 4000);

        // Determine page size
        let finalW = clampedW, finalH = clampedH;
        const pageSize = pageSizeSelect.value;
        if (pageSize === 'a4' || pageSize === 'a4p') {
          finalW = 2480; finalH = 3508; // A4 at 300dpi
        } else if (pageSize === 'letter') {
          finalW = 2550; finalH = 3300;
        }

        // Perspective transform
        const srcPts = cv.matFromArray(4, 2, cv.CV_32FC2, [
          tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y,
        ]);
        const dstPts = cv.matFromArray(4, 2, cv.CV_32FC2, [
          0, 0, finalW - 1, 0, finalW - 1, finalH - 1, 0, finalH - 1,
        ]);

        const M = cv.getPerspectiveTransform(srcPts, dstPts);
        const warped = new cv.Mat();
        cv.warpPerspective(src, warped, M, new cv.Size(finalW, finalH));

        // Create result canvas
        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = finalW;
        resultCanvas.height = finalH;
        cv.imshow(resultCanvas, warped);

        // Cleanup
        warped.delete(); M.delete(); srcPts.delete(); dstPts.delete();
        bestContour.delete();
        result = resultCanvas;
      } else {
        // No document detected, return original
        result = sourceCanvas;
      }

      // Cleanup
      src.delete(); workMat.delete(); gray.delete(); blurred.delete();
      edges.delete(); dilated.delete(); kernel.delete(); contours.delete(); hierarchy.delete();

      return result;
    } catch (err) {
      console.warn('OpenCV processing failed:', err);
      return sourceCanvas;
    }
  }

  // ===== Image Enhancement =====
  function enhanceImage(srcCanvas, strength) {
    const canvas = document.createElement('canvas');
    canvas.width = srcCanvas.width;
    canvas.height = srcCanvas.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(srcCanvas, 0, 0);

    if (strength <= 0) return canvas;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const s = strength / 100;

    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      let val;
      if (gray < 128) {
        val = Math.max(0, gray - (128 - gray) * s * 2);
      } else {
        val = Math.min(255, gray + (gray - 128) * s * 0.5);
      }
      // Mix to preserve slight color while enhancing luminance
      const mix = 0.7;
      data[i] = data[i] * (1 - mix) + val * mix;
      data[i + 1] = data[i + 1] * (1 - mix) + val * mix;
      data[i + 2] = data[i + 2] * (1 - mix) + val * mix;
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  // ===== Process Image =====
  function processImage(sourceCanvas) {
    currentSourceCanvas = sourceCanvas;
    const mode = scannerMode.value;
    const strength = parseInt(enhanceSlider.value);

    let processed;
    if (mode === 'auto') {
      // Show progress briefly
      progress.classList.remove('hidden');
      bar.style.width = '30%';
      progressText.textContent = '正在检测文档边缘...';

      setTimeout(() => {
        processed = detectAndCorrect(sourceCanvas);
        bar.style.width = '70%';
        progressText.textContent = '正在增强图像...';

        setTimeout(() => {
          processed = enhanceImage(processed, strength);
          bar.style.width = '100%';

          // Display
          processedCanvas.getContext('2d').clearRect(0, 0, processedCanvas.width, processedCanvas.height);
          processedCanvas.width = processed.width;
          processedCanvas.height = processed.height;
          processedCanvas.getContext('2d').drawImage(processed, 0, 0);
          originalImg.src = sourceCanvas.toDataURL();

          progress.classList.add('hidden');
          result.classList.remove('hidden');
        }, 50);
      }, 50);
    } else if (mode === 'enhance') {
      processed = enhanceImage(sourceCanvas, strength);
      processedCanvas.getContext('2d').clearRect(0, 0, processedCanvas.width, processedCanvas.height);
      processedCanvas.width = processed.width;
      processedCanvas.height = processed.height;
      processedCanvas.getContext('2d').drawImage(processed, 0, 0);
      originalImg.src = sourceCanvas.toDataURL();
      result.classList.remove('hidden');
    } else {
      // Original
      processedCanvas.getContext('2d').clearRect(0, 0, processedCanvas.width, processedCanvas.height);
      processedCanvas.width = sourceCanvas.width;
      processedCanvas.height = sourceCanvas.height;
      processedCanvas.getContext('2d').drawImage(sourceCanvas, 0, 0);
      originalImg.src = sourceCanvas.toDataURL();
      result.classList.remove('hidden');
    }
  }

  // ===== Camera =====
  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      video.srcObject = stream;
    } catch (err) {
      console.warn('Camera not available:', err);
      container.querySelector('#scannerCamera').style.display = 'none';
      container.querySelector('#scannerCapture').style.display = 'none';
    }
  }

  container.querySelector('#switchCamera').addEventListener('click', () => {
    facingMode = facingMode === 'environment' ? 'user' : 'environment';
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    startCamera();
  });

  container.querySelector('#scannerCapture').addEventListener('click', () => {
    if (!video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    processImage(canvas);
  });

  // Mode / enhance / page size changes re-process
  scannerMode.addEventListener('change', () => {
    if (currentSourceCanvas) processImage(currentSourceCanvas);
  });
  enhanceSlider.addEventListener('input', () => {
    if (currentSourceCanvas) processImage(currentSourceCanvas);
  });
  pageSizeSelect.addEventListener('change', () => {
    if (currentSourceCanvas) processImage(currentSourceCanvas);
  });

  // ===== Upload =====
  container.querySelector('#scannerUploadBtn').addEventListener('click', () => {
    container.querySelector('#scannerFileInput').click();
  });
  const dropZone = container.querySelector('#scannerDropZone');
  const fileInput = container.querySelector('#scannerFileInput');

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const img = await Utils.loadImageFromFile(file);
    const canvas = Utils.imageToCanvas(img);
    processImage(canvas);
  }

  // ===== Download =====
  container.querySelector('#scannerDownload').addEventListener('click', async () => {
    const fmt = fmtSelect.value;
    const pCanvas = processedCanvas;
    if (!pCanvas || pCanvas.width === 0) return;

    try {
      if (fmt === 'pdf') {
        const { PDFDocument } = PDFLib;
        const pdf = await PDFDocument.create();
        const pngBuf = await Utils.canvasToBuffer(pCanvas, 'image/png', 1.0);
        const embedded = await pdf.embedPng(new Uint8Array(pngBuf));
        const page = pdf.addPage([pCanvas.width, pCanvas.height]);
        page.drawImage(embedded, { x: 0, y: 0, width: pCanvas.width, height: pCanvas.height });
        const bytes = await pdf.save();
        Utils.downloadBuffer(bytes, '扫描文档.pdf');
        Utils.toast('已导出 PDF', 'success');
      } else {
        const mime = fmt === 'jpg' ? 'image/jpeg' : 'image/png';
        const blob = await Utils.canvasToBlob(pCanvas, mime, 0.95);
        Utils.download(blob, '扫描图片.' + fmt);
        Utils.toast('已导出图片', 'success');
      }
    } catch (err) { Utils.toast('导出失败', 'error'); }
  });

  // ===== Retake =====
  container.querySelector('#scannerRetake').addEventListener('click', () => {
    result.classList.add('hidden');
    currentSourceCanvas = null;
  });

  // ===== Init =====
  (async function init() {
    try {
      await loadOpenCV();
      loading.classList.add('hidden');
      ui.classList.remove('hidden');
      await startCamera();
    } catch (err) {
      loading.innerHTML = `
        <div style="color:var(--warning);padding:20px">
          <p>⚠️ 视觉引擎加载失败，将使用基础扫描模式</p>
          <p style="font-size:0.8rem;color:var(--text-muted)">（自动检测/矫正功能不可用，仍可拍照增强）</p>
        </div>`;
      cvReady = false;
      setTimeout(() => {
        loading.classList.add('hidden');
        ui.classList.remove('hidden');
        startCamera();
      }, 1500);
    }
  })();

  // ===== Cleanup =====
  window.Tool_scanner_deactivate = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
  };
}
