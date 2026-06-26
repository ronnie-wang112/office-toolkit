// ===== 扫描王 — 实时边缘检测 + 透视矫正 + 图像增强 + 多页 PDF 导出 =====
function Tool_scan_king(container) {
  let cvReady = false;
  let stream = null;
  let pages = [];           // { canvas, corners, enhanced, original }
  let currentCorners = null; // detected corners for current frame
  let capturedFrame = null;
  let isEditing = false;
  let draggingCorner = -1;
  let facingMode = 'environment';
  let autoCaptureEnabled = true;
  let lastCaptureTime = 0;

  container.innerHTML = `
    <div id="skLoading" style="text-align:center;padding:40px">
      <div class="progress-bar"><div class="progress-bar-fill" style="width:30%"></div></div>
      <div class="progress-text" id="skLoadText">正在加载视觉引擎...</div>
    </div>

    <div id="skUI" class="hidden">
      <!-- Main layout: camera + panel -->
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <!-- Left: Camera / Preview -->
        <div style="flex:1.5;min-width:300px">
          <div class="camera-view" id="skCameraWrap" style="position:relative">
            <video id="skVideo" autoplay playsinline style="width:100%;display:block"></video>
            <canvas id="skOverlay" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none"></canvas>
          </div>
          <div id="skEditView" class="hidden" style="position:relative">
            <canvas id="skEditCanvas" style="width:100%;border-radius:8px;border:1px solid var(--border)"></canvas>
            <div style="margin-top:4px;font-size:0.7rem;color:var(--text-muted);text-align:center">🖐 拖动四角调整裁剪区域</div>
          </div>
          <div class="camera-controls">
            <button class="btn btn-secondary btn-sm" id="skSwitchCam">🔄 切换</button>
            <button class="capture-btn" id="skCapture"><div class="inner"></div></button>
            <button class="btn btn-secondary btn-sm" id="skUploadBtn">📤 上传</button>
            <button class="btn btn-sm btn-secondary" id="skAutoToggle" title="自动抓拍">🤖 自动</button>
          </div>
          <div style="display:flex;gap:8px;justify-content:center;margin-top:8px" id="skEditBtns" class="hidden">
            <button class="btn btn-primary btn-sm" id="skConfirm">✅ 确认</button>
            <button class="btn btn-secondary btn-sm" id="skRetake">🔄 重拍</button>
          </div>
        </div>

        <!-- Right: Page List + Controls -->
        <div style="flex:1;min-width:200px">
          <h4 style="margin:0 0 8px;font-size:0.85rem;display:flex;justify-content:space-between">
            📄 已扫描 <span id="skPageCount">0 页</span>
          </h4>

          <!-- Scan mode selector -->
          <div class="form-group" style="margin-bottom:8px">
            <select id="skScanMode" style="width:100%">
              <option value="auto">📄 自动（文档）</option>
              <option value="idcard">🪪 身份证</option>
              <option value="book">📖 书籍</option>
            </select>
          </div>

          <div id="skPagesList" style="max-height:360px;overflow-y:auto;display:flex;flex-direction:column;gap:6px">
            <div style="color:var(--text-muted);font-size:0.8rem;text-align:center;padding:20px">拍摄第一页开始</div>
          </div>

          <!-- Export -->
          <div style="margin-top:12px;display:flex;flex-direction:column;gap:6px" id="skExportPanel" class="hidden">
            <div class="form-row" style="gap:8px">
              <div class="form-group" style="flex:1">
                <label>导出格式</label>
                <select id="skExportFmt">
                  <option value="pdf_color">PDF（彩色）</option>
                  <option value="pdf_bw">PDF（黑白增强）</option>
                  <option value="pdf_gray">PDF（灰度）</option>
                  <option value="images">单张图片</option>
                </select>
              </div>
            </div>
            <button class="btn btn-primary" style="width:100%" id="skExport">📥 导出</button>
            <button class="btn btn-secondary btn-sm" style="width:100%" id="skClear">🗑 清空</button>
          </div>
        </div>
      </div>
    </div>

    <input type="file" id="skFileInput" accept="image/*" style="display:none">
  `;

  const $ = s => container.querySelector(s);
  const loading = $('#skLoading'), ui = $('#skUI'), loadText = $('#skLoadText');
  const video = $('#skVideo'), overlay = $('#skOverlay');
  const overlayCtx = overlay.getContext('2d');
  const editCanvas = $('#skEditCanvas');
  const editCtx = editCanvas.getContext('2d');
  const cameraWrap = $('#skCameraWrap');
  const editView = $('#skEditView');
  const editBtns = $('#skEditBtns');
  const pagesList = $('#skPagesList');
  const pageCount = $('#skPageCount');
  const exportPanel = $('#skExportPanel');
  const scanMode = $('#skScanMode');
  const autoToggle = $('#skAutoToggle');

  // ── OpenCV loader ──
  function loadOpenCV() {
    return new Promise((resolve, reject) => {
      if (typeof cv !== 'undefined' && cv.Mat) { cvReady = true; resolve(); return; }
      if (typeof cv !== 'undefined' && !cv.Mat) {
        const c = () => { if (cv.Mat) { cvReady = true; resolve(); } else setTimeout(c, 100); };
        c(); setTimeout(() => { if (!cvReady) reject(new Error('init timeout')); }, 30000);
        return;
      }
      if (document.querySelector('script[src="lib/opencv.js"]')) {
        const c = () => { if (typeof cv !== 'undefined' && cv.Mat) { cvReady = true; resolve(); } else setTimeout(c, 200); };
        c(); setTimeout(() => { if (!cvReady) reject(new Error('load timeout')); }, 30000);
        return;
      }
      const s = document.createElement('script');
      s.src = 'lib/opencv.js';
      s.onload = () => {
        const c = () => { if (typeof cv !== 'undefined' && cv.Mat) { cvReady = true; resolve(); } else setTimeout(c, 100); };
        c(); setTimeout(() => { if (!cvReady) reject(new Error('init timeout')); }, 30000);
      };
      s.onerror = () => reject(new Error('OpenCV file missing'));
      document.head.appendChild(s);
    });
  }

  // ── Camera ──
  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        overlay.width = video.videoWidth;
        overlay.height = video.videoHeight;
        startEdgeDetection();
      };
    } catch(e) {
      cameraWrap.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">📷 摄像头不可用<br><small>请使用上传功能</small></div>';
      $('#skCapture').style.display = 'none';
    }
  }

  // ── Real-time Edge Detection ──
  let edgeLoopId = null;
  function startEdgeDetection() {
    if (edgeLoopId) return;
    function loop() {
      if (!video.videoWidth || !cvReady || isEditing) { edgeLoopId = requestAnimationFrame(loop); return; }
      try {
        detectEdges();
      } catch(e) {}
      edgeLoopId = requestAnimationFrame(loop);
    }
    edgeLoopId = requestAnimationFrame(loop);
  }

  function detectEdges() {
    const cap = document.createElement('canvas');
    cap.width = video.videoWidth; cap.height = video.videoHeight;
    cap.getContext('2d').drawImage(video, 0, 0);

    const src = cv.imread(cap);
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    const meanBrightness = cv.mean(gray)[0];
    const lowT = Math.max(15, meanBrightness * 0.25);
    const highT = Math.min(240, meanBrightness * 0.75);

    const blurred = new cv.Mat();
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    const edges = new cv.Mat();
    cv.Canny(blurred, edges, lowT, highT);
    blurred.delete(); gray.delete();

    // Morphological close to bridge gaps from hands/fingers
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    const closed = new cv.Mat();
    cv.morphologyEx(edges, closed, cv.MORPH_CLOSE, kernel);
    kernel.delete(); edges.delete();

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(closed, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
    closed.delete(); hierarchy.delete();

    let bestCorners = null;
    let bestScore = 0;
    const imgArea = src.rows * src.cols;

    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i);
      const area = cv.contourArea(cnt);
      if (area < imgArea * 0.08 || area > imgArea * 0.97) continue;

      const peri = cv.arcLength(cnt, true);
      for (const eps of [0.02, 0.05]) {
        const approx = new cv.Mat();
        cv.approxPolyDP(cnt, approx, eps * peri, true);
        if (approx.rows !== 4) { approx.delete(); continue; }

        const hull = new cv.Mat();
        cv.convexHull(approx, hull);
        const hullArea = cv.contourArea(hull);
        const convexity = area / (hullArea + 1);
        hull.delete();
        if (convexity < 0.82) { approx.delete(); continue; }

        const pts = [];
        for (let j = 0; j < 4; j++) pts.push({ x: approx.data32S[j*2], y: approx.data32S[j*2+1] });
        const ds = [Math.hypot(pts[1].x-pts[0].x, pts[1].y-pts[0].y),
                    Math.hypot(pts[2].x-pts[1].x, pts[2].y-pts[1].y),
                    Math.hypot(pts[3].x-pts[2].x, pts[3].y-pts[2].y),
                    Math.hypot(pts[0].x-pts[3].x, pts[0].y-pts[3].y)];
        const maxD = Math.max(...ds), minD = Math.min(...ds);
        if (minD < 15 || maxD / (minD + 1) > 5) { approx.delete(); continue; }

        const score = convexity * area / imgArea;
        if (score > bestScore) {
          bestScore = score;
          if (bestCorners) bestCorners.delete();
          bestCorners = approx.clone();
        }
        approx.delete();
        if (bestCorners && bestScore > 0.5) break;
      }
      if (bestCorners && bestScore > 0.5) break;
    }
    contours.delete(); src.delete();

    overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
    if (bestCorners && bestScore > 0.25) {
      currentCorners = [];
      for (let i = 0; i < 4; i++) {
        currentCorners.push({ x: bestCorners.data32S[i*2], y: bestCorners.data32S[i*2+1] });
      }
      overlayCtx.strokeStyle = '#2563EB';
      overlayCtx.lineWidth = 3;
      overlayCtx.beginPath();
      overlayCtx.moveTo(currentCorners[0].x, currentCorners[0].y);
      for (let i = 1; i < 4; i++) overlayCtx.lineTo(currentCorners[i].x, currentCorners[i].y);
      overlayCtx.closePath();
      overlayCtx.stroke();
      overlayCtx.fillStyle = '#2563EB';
      currentCorners.forEach(c => {
        overlayCtx.beginPath(); overlayCtx.arc(c.x, c.y, 6, 0, Math.PI*2); overlayCtx.fill();
      });
      if (autoCaptureEnabled && bestScore > 0.55 && Date.now() - lastCaptureTime > 2000) {
        lastCaptureTime = Date.now();
        setTimeout(() => captureFrame(), 300);
      }
    } else {
      currentCorners = null;
    }
    if (bestCorners) bestCorners.delete();
  }

  function stopEdgeDetection() {
    if (edgeLoopId) { cancelAnimationFrame(edgeLoopId); edgeLoopId = null; }
  }

  // ── Capture ──
  function captureFrame() {
    if (!video.videoWidth) return;
    const cv2 = document.createElement('canvas');
    cv2.width = video.videoWidth; cv2.height = video.videoHeight;
    cv2.getContext('2d').drawImage(video, 0, 0);
    processCapture(cv2, currentCorners);
  }

  $('#skCapture').onclick = captureFrame;

  // ── Upload ──
  $('#skUploadBtn').onclick = () => $('#skFileInput').click();
  $('#skFileInput').onchange = () => {
    const f = $('#skFileInput').files[0];
    if (!f) return;
    const img = new Image();
    img.onload = () => {
      const cv2 = Utils.imageToCanvas(img);
      processCapture(cv2, null);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(f);
  };

  // ── Process Capture (detect corners if needed, then show edit view) ──
  function processCapture(canvas, corners) {
    isEditing = true;
    stopEdgeDetection();
    cameraWrap.classList.add('hidden');
    editView.classList.remove('hidden');
    editBtns.classList.remove('hidden');
    capturedFrame = canvas;

    if (!corners || !cvReady) {
      corners = detectDocumentCorners(canvas);
    }

    if (!corners || corners.length !== 4) {
      // Default: full image corners
      corners = [
        { x: 0, y: 0 },
        { x: canvas.width - 1, y: 0 },
        { x: canvas.width - 1, y: canvas.height - 1 },
        { x: 0, y: canvas.height - 1 }
      ];
    }

    // Order: top-left, top-right, bottom-right, bottom-left
    const center = corners.reduce((a,c) => ({ x: a.x+c.x, y: a.y+c.y }), { x:0, y:0 });
    center.x /= 4; center.y /= 4;
    corners.sort((a,b) => {
      const aA = Math.atan2(a.y-center.y, a.x-center.x);
      const bA = Math.atan2(b.y-center.y, b.x-center.x);
      return aA - bA;
    });
    // Ensure top-left first
    let minSum = Infinity, minIdx = 0;
    corners.forEach((c,i) => { if (c.x+c.y < minSum) { minSum = c.x+c.y; minIdx = i; } });
    currentCorners = [...corners.slice(minIdx), ...corners.slice(0, minIdx)];

    drawEditCanvas();
  }

  function detectDocumentCorners(canvas) {
    if (!cvReady) return null;
    try {
      const src = cv.imread(canvas);
      const gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

      const meanB = cv.mean(gray)[0];

      // Adaptive blur based on image size
      const blurSize = Math.max(5, Math.floor(Math.min(canvas.width, canvas.height) / 200) * 2 + 1);
      const blurred = new cv.Mat();
      cv.GaussianBlur(gray, blurred, new cv.Size(blurSize, blurSize), 0);

      // Adaptive Canny
      const lowT = Math.max(15, meanB * 0.25);
      const highT = Math.min(240, meanB * 0.75);
      const edges = new cv.Mat();
      cv.Canny(blurred, edges, lowT, highT);
      blurred.delete();
      gray.delete();

      // Morphological close to bridge gaps (e.g., fingers breaking edges)
      const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
      const closed = new cv.Mat();
      cv.morphologyEx(edges, closed, cv.MORPH_CLOSE, kernel);
      kernel.delete();
      edges.delete();

      // Dilate to strengthen edges
      const dilateKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
      const dilated = new cv.Mat();
      cv.dilate(closed, dilated, dilateKernel, new cv.Point(-1, -1), 1);
      dilateKernel.delete();
      closed.delete();

      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(dilated, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
      dilated.delete(); hierarchy.delete();

      let best = null; let bestScore = 0;
      const imgArea = src.rows * src.cols;

      for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const area = cv.contourArea(cnt);
        if (area < imgArea * 0.06 || area > imgArea * 0.97) continue;

        const peri = cv.arcLength(cnt, true);

        // Try multiple epsilon values for approxPolyDP
        for (const eps of [0.02, 0.04, 0.06]) {
          const approx = new cv.Mat();
          cv.approxPolyDP(cnt, approx, eps * peri, true);

          if (approx.rows === 4) {
            const pts = [];
            for (let j = 0; j < 4; j++) pts.push({ x: approx.data32S[j*2], y: approx.data32S[j*2+1] });

            // Check convexity
            const hull = new cv.Mat();
            cv.convexHull(approx, hull);
            const hullArea = cv.contourArea(hull);
            const convexity = area / (hullArea + 1);
            hull.delete();

            if (convexity < 0.8) { approx.delete(); continue; }

            // Check edge ratios
            const d01 = Math.hypot(pts[1].x-pts[0].x, pts[1].y-pts[0].y);
            const d12 = Math.hypot(pts[2].x-pts[1].x, pts[2].y-pts[1].y);
            const d23 = Math.hypot(pts[3].x-pts[2].x, pts[3].y-pts[2].y);
            const d30 = Math.hypot(pts[0].x-pts[3].x, pts[0].y-pts[3].y);
            const edges2 = [d01, d12, d23, d30];
            const maxE = Math.max(...edges2), minE = Math.min(...edges2);
            if (minE < 20 || maxE / (minE + 1) > 6) { approx.delete(); continue; }

            const score = convexity * area / imgArea;
            if (score > bestScore) {
              bestScore = score;
              if (best) best.delete();
              best = approx.clone();
            }
          }
          approx.delete();
          if (best && bestScore > 0.5) break; // Good enough
        }
        if (best && bestScore > 0.5) break;
      }
      contours.delete(); src.delete();

      if (best && bestScore > 0.15) {
        const corners = [];
        for (let i = 0; i < 4; i++) corners.push({ x: best.data32S[i*2], y: best.data32S[i*2+1] });
        best.delete();
        return corners;
      }
      if (best) best.delete();
    } catch(e) {}
    return null;
  }

  // ── Edit Canvas with Draggable Corners ──
  function drawEditCanvas() {
    if (!capturedFrame) return;
    // Scale to fit
    const maxW = 500;
    let w = capturedFrame.width, h = capturedFrame.height;
    const scale = w > maxW ? maxW / w : 1;
    w = Math.round(w * scale); h = Math.round(h * scale);

    editCanvas.width = w;
    editCanvas.height = h;
    editCtx.drawImage(capturedFrame, 0, 0, w, h);

    if (currentCorners && currentCorners.length === 4) {
      // Draw polygon edge
      editCtx.strokeStyle = '#2563EB';
      editCtx.lineWidth = 2;
      editCtx.beginPath();
      editCtx.moveTo(currentCorners[0].x*scale, currentCorners[0].y*scale);
      for (let i=1;i<4;i++) editCtx.lineTo(currentCorners[i].x*scale, currentCorners[i].y*scale);
      editCtx.closePath();
      editCtx.stroke();

      // Draw handles
      currentCorners.forEach((c,i) => {
        const cx = c.x * scale, cy = c.y * scale;
        editCtx.fillStyle = i === draggingCorner ? '#EF4444' : '#2563EB';
        editCtx.beginPath(); editCtx.arc(cx, cy, 8, 0, Math.PI*2); editCtx.fill();
        editCtx.fillStyle = '#FFF';
        editCtx.beginPath(); editCtx.arc(cx, cy, 4, 0, Math.PI*2); editCtx.fill();
      });
    }
  }

  editCanvas.addEventListener('mousedown', (e) => {
    if (!currentCorners || currentCorners.length !== 4) return;
    const rect = editCanvas.getBoundingClientRect();
    const scaleX = editCanvas.width / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleX;

    for (let i = 0; i < 4; i++) {
      const cx = currentCorners[i].x * (editCanvas.width / capturedFrame.width);
      const cy = currentCorners[i].y * (editCanvas.width / capturedFrame.width);
      if (Math.hypot(mx-cx, my-cy) < 15) { draggingCorner = i; break; }
    }
  });

  editCanvas.addEventListener('mousemove', (e) => {
    if (draggingCorner < 0) return;
    const rect = editCanvas.getBoundingClientRect();
    const scaleX = editCanvas.width / rect.width;
    const scale = capturedFrame.width / editCanvas.width;
    currentCorners[draggingCorner].x = Math.max(0, Math.min(capturedFrame.width, (e.clientX - rect.left) * scaleX * scale));
    currentCorners[draggingCorner].y = Math.max(0, Math.min(capturedFrame.height, (e.clientY - rect.top) * scaleX * scale));
    drawEditCanvas();
  });

  editCanvas.addEventListener('touchstart', (e) => {
    if (!currentCorners || currentCorners.length !== 4) return;
    e.preventDefault();
    const rect = editCanvas.getBoundingClientRect();
    const scaleX = editCanvas.width / rect.width;
    const mx = (e.touches[0].clientX - rect.left) * scaleX;
    const my = (e.touches[0].clientY - rect.top) * scaleX;
    for (let i = 0; i < 4; i++) {
      const cx = currentCorners[i].x * (editCanvas.width / capturedFrame.width);
      const cy = currentCorners[i].y * (editCanvas.width / capturedFrame.width);
      if (Math.hypot(mx-cx, my-cy) < 20) { draggingCorner = i; break; }
    }
  });

  editCanvas.addEventListener('touchmove', (e) => {
    if (draggingCorner < 0) return;
    e.preventDefault();
    const rect = editCanvas.getBoundingClientRect();
    const scaleX = editCanvas.width / rect.width;
    const scale = capturedFrame.width / editCanvas.width;
    currentCorners[draggingCorner].x = Math.max(0, Math.min(capturedFrame.width, (e.touches[0].clientX - rect.left) * scaleX * scale));
    currentCorners[draggingCorner].y = Math.max(0, Math.min(capturedFrame.height, (e.touches[0].clientY - rect.top) * scaleX * scale));
    drawEditCanvas();
  });

  document.addEventListener('mouseup', () => { draggingCorner = -1; });
  document.addEventListener('touchend', () => { draggingCorner = -1; });

  // ── Confirm: perspective correct + enhance + add to pages ──
  $('#skConfirm').onclick = () => {
    if (!capturedFrame || !currentCorners) return;
    const result = processPage(capturedFrame, currentCorners);
    addPage(result);
    resetForNext();
  };

  $('#skRetake').onclick = resetForNext;

  function resetForNext() {
    isEditing = false;
    capturedFrame = null;
    currentCorners = null;
    draggingCorner = -1;
    editView.classList.add('hidden');
    editBtns.classList.add('hidden');
    cameraWrap.classList.remove('hidden');
    startEdgeDetection();
  }

  // ── Extract document content (remove hands, margins, background) ──
  function extractContent(mat) {
    try {
      const gray = new cv.Mat();
      cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);

      // Use gradient magnitude to find content vs background
      const gradX = new cv.Mat();
      const gradY = new cv.Mat();
      cv.Sobel(gray, gradX, cv.CV_32F, 1, 0, 3);
      cv.Sobel(gray, gradY, cv.CV_32F, 0, 1, 3);

      const absGradX = new cv.Mat();
      const absGradY = new cv.Mat();
      cv.convertScaleAbs(gradX, absGradX);
      cv.convertScaleAbs(gradY, absGradY);

      const grad = new cv.Mat();
      cv.addWeighted(absGradX, 0.5, absGradY, 0.5, 0, grad);
      gradX.delete(); gradY.delete(); absGradX.delete(); absGradY.delete();

      // Binary threshold on gradient
      const binary = new cv.Mat();
      cv.threshold(grad, binary, 15, 255, cv.THRESH_BINARY);
      grad.delete();

      // Horizontal and vertical projections to find content bounds
      const hProj = new Array(mat.rows).fill(0);
      const vProj = new Array(mat.cols).fill(0);

      for (let y = 0; y < mat.rows; y++) {
        for (let x = 0; x < mat.cols; x++) {
          const val = binary.ucharPtr(y, x)[0];
          hProj[y] += val;
          vProj[x] += val;
        }
      }

      const hAvg = hProj.reduce((a,b)=>a+b,0) / mat.rows;
      const vAvg = vProj.reduce((a,b)=>a+b,0) / mat.cols;

      // Find content boundaries (where projection exceeds threshold)
      let top = 0, bottom = mat.rows - 1, left = 0, right = mat.cols - 1;

      for (let y = 0; y < mat.rows; y++) {
        if (hProj[y] > hAvg * 0.3) { top = y; break; }
      }
      for (let y = mat.rows - 1; y >= 0; y--) {
        if (hProj[y] > hAvg * 0.3) { bottom = y; break; }
      }
      for (let x = 0; x < mat.cols; x++) {
        if (vProj[x] > vAvg * 0.3) { left = x; break; }
      }
      for (let x = mat.cols - 1; x >= 0; x--) {
        if (vProj[x] > vAvg * 0.3) { right = x; break; }
      }

      binary.delete(); gray.delete();

      // Add small padding
      const pad = Math.round(Math.min(mat.rows, mat.cols) * 0.01);
      top = Math.max(0, top - pad);
      bottom = Math.min(mat.rows - 1, bottom + pad);
      left = Math.max(0, left - pad);
      right = Math.min(mat.cols - 1, right + pad);

      const contentW = right - left;
      const contentH = bottom - top;

      // Only crop if content area is significantly smaller
      if (contentW < mat.cols * 0.85 || contentH < mat.rows * 0.85) {
        return { rect: { x: left, y: top, w: contentW, h: contentH }, cropped: true };
      }

      return { rect: null, cropped: false };
    } catch(e) {
      return { rect: null, cropped: false };
    }
  }

  function processPage(canvas, corners) {
    if (!cvReady) {
      const result = document.createElement('canvas');
      const pts = corners;
      const minX = Math.max(0, Math.min(...pts.map(p=>p.x)));
      const minY = Math.max(0, Math.min(...pts.map(p=>p.y)));
      const maxX = Math.min(canvas.width, Math.max(...pts.map(p=>p.x)));
      const maxY = Math.min(canvas.height, Math.max(...pts.map(p=>p.y)));
      const w = maxX-minX, h = maxY-minY;
      result.width = w; result.height = h;
      result.getContext('2d').drawImage(canvas, minX, minY, w, h, 0, 0, w, h);
      return { original: result, enhanced: result, corners };
    }

    try {
      const src = cv.imread(canvas);

      // Step 1: Perspective correction to standard ratio
      const outW = 1400;
      const outH = Math.round(outW * 1.414);

      const srcPts = cv.matFromArray(4, 2, cv.CV_32F, [
        corners[0].x, corners[0].y,
        corners[1].x, corners[1].y,
        corners[2].x, corners[2].y,
        corners[3].x, corners[3].y,
      ]);
      const dstPts = cv.matFromArray(4, 2, cv.CV_32F, [0, 0, outW-1, 0, outW-1, outH-1, 0, outH-1]);
      const M = cv.getPerspectiveTransform(srcPts, dstPts);
      const warped = new cv.Mat();
      cv.warpPerspective(src, warped, M, new cv.Size(outW, outH));
      srcPts.delete(); dstPts.delete(); M.delete(); src.delete();

      // Step 2: Content extraction — remove hands, margins
      const extraction = extractContent(warped);
      let finalMat = warped;
      if (extraction.cropped) {
        const r = extraction.rect;
        const cropped = warped.roi(new cv.Rect(r.x, r.y, r.w, r.h));
        finalMat = cropped.clone();
        cropped.delete();
        warped.delete();
      }

      // Step 3: Enhance
      const gray = new cv.Mat();
      cv.cvtColor(finalMat, gray, cv.COLOR_RGBA2GRAY);

      const clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
      const enhanced = new cv.Mat();
      clahe.apply(gray, enhanced);
      clahe.delete();

      // Enhanced color
      const lab = new cv.Mat();
      cv.cvtColor(finalMat, lab, cv.COLOR_RGBA2RGB);
      const labChannels = new cv.MatVector();
      cv.split(lab, labChannels);
      const lChannel = labChannels.get(0);
      const clahe2 = new cv.CLAHE(2.0, new cv.Size(8, 8));
      const enhancedL = new cv.Mat();
      clahe2.apply(lChannel, enhancedL);
      clahe2.delete();
      enhancedL.copyTo(lChannel);
      const colorEnhanced = new cv.Mat();
      cv.merge(labChannels, colorEnhanced);
      lab.delete(); labChannels.delete(); lChannel.delete(); enhancedL.delete();

      // Output canvases
      const origCV = document.createElement('canvas');
      cv.imshow(origCV, finalMat);
      const enhCV = document.createElement('canvas');
      cv.imshow(enhCV, colorEnhanced);

      finalMat.delete(); gray.delete(); enhanced.delete(); colorEnhanced.delete();

      return { original: origCV, enhanced: enhCV, corners };
    } catch(e) {
      console.error('Processing error:', e);
      return { original: canvas, enhanced: canvas, corners };
    }
  }

  function addPage(result) {
    const page = {
      id: Date.now(),
      canvas: result.original,
      enhanced: result.enhanced,
      filter: 'color'
    };
    pages.push(page);
    renderPages();
    Utils.toast(`第 ${pages.length} 页已添加`, 'success');
  }

  // ── Render page thumbnails ──
  function renderPages() {
    pageCount.textContent = `${pages.length} 页`;
    if (pages.length === 0) {
      pagesList.innerHTML = '<div style="color:var(--text-muted);font-size:0.8rem;text-align:center;padding:20px">拍摄第一页开始</div>';
      exportPanel.classList.add('hidden');
      return;
    }
    exportPanel.classList.remove('hidden');

    let html = '';
    pages.forEach((p, i) => {
      const c = p.filter === 'bw' ? p.enhanced : (p.filter === 'enhanced' ? p.enhanced : p.canvas);
      const src = c.toDataURL('image/jpeg', 0.6);
      html += `
        <div class="sk-page-item" style="display:flex;gap:8px;align-items:center;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--bg-card)">
          <div style="font-size:0.8rem;font-weight:600;min-width:20px">${i+1}</div>
          <img src="${src}" style="width:60px;height:80px;object-fit:cover;border-radius:4px;border:1px solid var(--border)">
          <div style="flex:1;min-width:0">
            <div style="font-size:0.75rem;font-weight:500">P${i+1}</div>
            <select class="sk-filter-sel" data-idx="${i}" style="font-size:0.7rem;padding:2px 4px;margin-top:4px;width:100%">
              <option value="color" ${p.filter==='color'?'selected':''}>彩色</option>
              <option value="enhanced" ${p.filter==='enhanced'?'selected':''}>增强</option>
              <option value="bw" ${p.filter==='bw'?'selected':''}>黑白</option>
            </select>
          </div>
          <div style="display:flex;flex-direction:column;gap:2px">
            <button class="btn btn-sm sk-move-up" data-idx="${i}" style="padding:2px 6px;font-size:0.65rem" ${i===0?'disabled':''}>▲</button>
            <button class="btn btn-sm sk-delete" data-idx="${i}" style="padding:2px 6px;font-size:0.65rem;color:var(--danger)">✕</button>
            <button class="btn btn-sm sk-move-dn" data-idx="${i}" style="padding:2px 6px;font-size:0.65rem" ${i===pages.length-1?'disabled':''}>▼</button>
          </div>
        </div>`;
    });
    pagesList.innerHTML = html;

    // Bind events
    pagesList.querySelectorAll('.sk-filter-sel').forEach(sel => {
      sel.onchange = () => {
        const idx = parseInt(sel.dataset.idx);
        pages[idx].filter = sel.value;
      };
    });
    pagesList.querySelectorAll('.sk-delete').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.idx);
        pages.splice(idx, 1);
        renderPages();
      };
    });
    pagesList.querySelectorAll('.sk-move-up').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.idx);
        if (idx > 0) { [pages[idx], pages[idx-1]] = [pages[idx-1], pages[idx]]; renderPages(); }
      };
    });
    pagesList.querySelectorAll('.sk-move-dn').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.idx);
        if (idx < pages.length - 1) { [pages[idx], pages[idx+1]] = [pages[idx+1], pages[idx]]; renderPages(); }
      };
    });
  }

  // ── Export ──
  $('#skExport').onclick = async () => {
    if (pages.length === 0) { Utils.toast('没有页面可导出', 'error'); return; }
    const fmt = $('#skExportFmt').value;

    if (fmt === 'images') {
      pages.forEach((p, i) => {
        const c = getFilteredCanvas(p);
        c.toBlob(blob => Utils.download(blob, `扫描_${i+1}.png`), 'image/png');
      });
      Utils.toast(`已导出 ${pages.length} 张图片`, 'success');
      return;
    }

    try {
      const { PDFDocument } = PDFLib;
      const pdf = await PDFDocument.create();
      const A4_W = 595, A4_H = 842;

      for (const p of pages) {
        const c = getFilteredCanvas(p);
        const blob = await Utils.canvasToBlob(c, 'image/jpeg', 0.92);
        const buf = await blob.arrayBuffer();
        let embedded;
        if (fmt === 'pdf_bw') {
          // Convert to grayscale PNG for better compression
          const grayCanvas = toGrayCanvas(c);
          const grayBlob = await Utils.canvasToBlob(grayCanvas, 'image/png', 0.8);
          embedded = await pdf.embedPng(new Uint8Array(await grayBlob.arrayBuffer()));
        } else {
          embedded = await pdf.embedJpg(new Uint8Array(buf));
        }

        const ratio = c.width / c.height;
        let pw, ph;
        if (ratio > 1) { pw = A4_W; ph = A4_W / ratio; }
        else { ph = A4_H; pw = A4_H * ratio; }

        const page = pdf.addPage([A4_W, A4_H]);
        page.drawImage(embedded, {
          x: (A4_W - pw) / 2,
          y: (A4_H - ph) / 2,
          width: pw,
          height: ph,
        });
      }

      const bytes = await pdf.save();
      Utils.downloadBuffer(bytes, '扫描文档.pdf');
      Utils.toast(`已导出 PDF (${pages.length} 页)`, 'success');
    } catch(e) {
      Utils.toast('导出失败: ' + e.message, 'error');
    }
  };

  function getFilteredCanvas(p) {
    if (p.filter === 'bw') return toBWCanvas(p.enhanced || p.canvas);
    if (p.filter === 'enhanced') return p.enhanced || p.canvas;
    return p.canvas;
  }

  function toBWCanvas(c) {
    const result = document.createElement('canvas');
    result.width = c.width; result.height = c.height;
    const ctx = result.getContext('2d');
    ctx.drawImage(c, 0, 0);
    // Adaptive threshold approximation
    const data = ctx.getImageData(0, 0, c.width, c.height);
    const pixels = data.data;
    const blockSize = 31;
    const k = 0.15;

    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        // Local mean in block
        let sum = 0, count = 0;
        const halfB = Math.floor(blockSize/2);
        for (let dy = -halfB; dy <= halfB; dy++) {
          for (let dx = -halfB; dx <= halfB; dx++) {
            const nx = x+dx, ny = y+dy;
            if (nx>=0 && nx<c.width && ny>=0 && ny<c.height) {
              const i = (ny*c.width+nx)*4;
              sum += pixels[i]*0.299 + pixels[i+1]*0.587 + pixels[i+2]*0.114;
              count++;
            }
          }
        }
        const mean = sum/count;
        let stdDev = 0;
        for (let dy = -halfB; dy <= halfB; dy++) {
          for (let dx = -halfB; dx <= halfB; dx++) {
            const nx = x+dx, ny = y+dy;
            if (nx>=0 && nx<c.width && ny>=0 && ny<c.height) {
              const i = (ny*c.width+nx)*4;
              const val = pixels[i]*0.299 + pixels[i+1]*0.587 + pixels[i+2]*0.114;
              stdDev += (val-mean)*(val-mean);
            }
          }
        }
        stdDev = Math.sqrt(stdDev/count);
        const threshold = mean * (1 + k * (stdDev/128 - 1));

        const idx = (y*c.width+x)*4;
        const gray = pixels[idx]*0.299 + pixels[idx+1]*0.587 + pixels[idx+2]*0.114;
        const val = gray > threshold ? 255 : 0;
        pixels[idx] = pixels[idx+1] = pixels[idx+2] = val;
      }
    }
    ctx.putImageData(data, 0, 0);
    return result;
  }

  function toGrayCanvas(c) {
    const result = document.createElement('canvas');
    result.width = c.width; result.height = c.height;
    const ctx = result.getContext('2d');
    ctx.drawImage(c, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < data.data.length; i+=4) {
      const g = data.data[i]*0.299 + data.data[i+1]*0.587 + data.data[i+2]*0.114;
      data.data[i] = data.data[i+1] = data.data[i+2] = g;
    }
    ctx.putImageData(data, 0, 0);
    return result;
  }

  // ── Clear ──
  $('#skClear').onclick = () => {
    pages = [];
    renderPages();
  };

  // ── Switch camera ──
  $('#skSwitchCam').onclick = () => {
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    if (stream) stream.getTracks().forEach(t => t.stop());
    startCamera();
  };

  // ── Auto toggle ──
  $('#skAutoToggle').onclick = () => {
    autoCaptureEnabled = !autoCaptureEnabled;
    autoToggle.style.background = autoCaptureEnabled ? 'var(--primary)' : '';
    autoToggle.style.color = autoCaptureEnabled ? '#fff' : '';
    Utils.toast(autoCaptureEnabled ? '自动抓拍已开启' : '自动抓拍已关闭', 'info');
  };

  // ── Init ──
  (async () => {
    try {
      loadText.textContent = '正在加载 OpenCV 视觉引擎...';
      await loadOpenCV();
      if (autoCaptureEnabled) {
        autoToggle.style.background = 'var(--primary)';
        autoToggle.style.color = '#fff';
      }
      loading.classList.add('hidden');
      ui.classList.remove('hidden');
      await startCamera();
    } catch(e) {
      console.warn('OpenCV error:', e);
      loadText.innerHTML = `<div style="color:var(--warning);padding:20px"><p>⚠️ 视觉引擎加载失败</p><p style="font-size:0.8rem">${e.message||''}</p><p style="font-size:0.75rem">仍可使用基础扫描（上传图片）</p></div>`;
      cvReady = false;
      setTimeout(() => { loading.classList.add('hidden'); ui.classList.remove('hidden'); startCamera(); }, 2000);
    }
  })();
}

function Tool_scan_king_deactivate() {
  // Cleanup handled internally
}
