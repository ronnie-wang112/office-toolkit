// ===== 证件照制作 — face-api.js 人脸检测 + 智能裁剪 + 换底色 + PDF/DOCX 导出 =====
function Tool_id_photo(container) {
  let modelsReady = false;
  let stream = null;
  let sourceCanvas = null;
  let resultCanvas = null;

  const SIZE_PRESETS = {
    '1cun':   { name: '1寸 (25×35mm)', w: 295, h: 413 },
    '2cun':   { name: '2寸 (35×49mm)', w: 413, h: 579 },
    'small1': { name: '小1寸 (22×32mm)', w: 260, h: 378 },
    'small2': { name: '小2寸 (33×48mm)', w: 390, h: 567 },
    'passport':{ name: '护照 (33×48mm)', w: 390, h: 567 },
    'visa_us': { name: '美签 (51×51mm)', w: 600, h: 600 },
    'id_cn':  { name: '身份证 (26×32mm)', w: 307, h: 378 },
  };

  container.innerHTML = `
    <div id="idLoading" style="text-align:center;padding:40px">
      <div class="progress-bar"><div class="progress-bar-fill" style="width:50%"></div></div>
      <div class="progress-text" id="idLoadText">正在加载 AI 人脸模型...</div>
    </div>
    <div id="idUI" class="hidden">
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:280px">
          <div class="camera-view" id="idCamera">
            <video id="idVideo" autoplay playsinline style="width:100%"></video>
          </div>
          <div class="camera-controls">
            <button class="btn btn-secondary btn-sm" id="idSwitchCam">🔄 切换</button>
            <button class="capture-btn" id="idCapture"><div class="inner"></div></button>
            <button class="btn btn-secondary btn-sm" id="idUploadBtn">📤 上传</button>
          </div>
        </div>
        <div style="flex:1;min-width:280px">
          <h4 style="margin-bottom:6px;font-size:0.75rem;color:var(--text-muted);text-align:center">📸 预览 / 结果</h4>
          <canvas id="idPreview" style="width:100%;border-radius:8px;border:1px solid var(--border)"></canvas>
          <div style="text-align:center;margin-top:4px;font-size:0.75rem;color:var(--text-muted)" id="idFaceStatus"></div>
        </div>
      </div>

      <div class="form-row" style="margin-top:12px">
        <div class="form-group" style="max-width:180px">
          <label>底色</label>
          <select id="idBgColor">
            <option value="#FFFFFF">白色</option>
            <option value="#438EDB">蓝色</option>
            <option value="#FF0000">红色</option>
            <option value="#4CAF50">绿色</option>
            <option value="#808080">灰色</option>
          </select>
        </div>
        <div class="form-group" style="max-width:200px">
          <label>尺寸规格</label>
          <select id="idSize">${Object.entries(SIZE_PRESETS).map(([k,v]) => `<option value="${k}">${v.name}</option>`).join('')}</select>
        </div>
        <div class="form-group" style="max-width:160px">
          <label>导出格式</label>
          <select id="idFormat">
            <option value="pdf">PDF</option>
            <option value="docx">DOCX (Word)</option>
            <option value="png">PNG 图片</option>
          </select>
        </div>
      </div>

      <div style="margin-top:10px;display:flex;gap:10px;justify-content:center">
        <button class="btn btn-primary" id="idExport">📥 导出证件照</button>
        <button class="btn btn-secondary" id="idRetake">🔄 重新拍摄</button>
      </div>
    </div>
    <input type="file" id="idFileInput" accept="image/*" style="display:none">
  `;

  const $ = s => container.querySelector(s);
  const loading = $('#idLoading'), ui = $('#idUI'), loadText = $('#idLoadText');
  const video = $('#idVideo'), preview = $('#idPreview');
  const bgColorSel = $('#idBgColor'), sizeSel = $('#idSize'), fmtSel = $('#idFormat');
  const faceStatus = $('#idFaceStatus');
  let facingMode = 'user';
  let detectedFace = null;

  // ── Load face-api.js models ──
  async function loadModels() {
    const modelPath = 'lib/models';
    loadText.textContent = '正在加载人脸检测模型...';
    await faceapi.nets.tinyFaceDetector.loadFromUri(modelPath);
    loadText.textContent = '正在加载人脸特征模型...';
    await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
    modelsReady = true;
  }

  // ── Camera ──
  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 1280 } }
      });
      video.srcObject = stream;
    } catch(e) {
      $('#idCamera').style.display = 'none';
      $('#idCapture').style.display = 'none';
    }
  }

  $('#idSwitchCam').onclick = () => {
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    if (stream) { stream.getTracks().forEach(t => t.stop()); }
    startCamera();
  };

  // ── Capture ──
  $('#idCapture').onclick = () => {
    if (!video.videoWidth) return;
    const cv = document.createElement('canvas');
    cv.width = video.videoWidth; cv.height = video.videoHeight;
    cv.getContext('2d').drawImage(video, 0, 0);
    processPhoto(cv);
  };

  // ── Upload ──
  $('#idUploadBtn').onclick = () => $('#idFileInput').click();
  $('#idFileInput').onchange = () => {
    const f = $('#idFileInput').files[0];
    if (!f) return;
    const img = new Image();
    img.onload = () => {
      const cv = Utils.imageToCanvas(img);
      processPhoto(cv);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(f);
  };

  // ── Detect face using face-api.js ──
  async function detectFace(canvas) {
    if (!modelsReady) return null;
    try {
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
      const result = await faceapi.detectSingleFace(canvas, options).withFaceLandmarks();
      return result;
    } catch(e) {
      console.warn('Face detection error:', e);
      return null;
    }
  }

  // ── Process photo ──
  async function processPhoto(canvas) {
    sourceCanvas = canvas;
    faceStatus.textContent = '🔍 检测人脸中...';

    // Show original in preview while detecting
    preview.width = canvas.width;
    preview.height = canvas.height;
    const pctx = preview.getContext('2d');
    pctx.drawImage(canvas, 0, 0);

    // Detect face
    detectedFace = await detectFace(canvas);

    const preset = SIZE_PRESETS[sizeSel.value];
    const bgColor = bgColorSel.value;
    const outW = preset.w, outH = preset.h;

    if (detectedFace && detectedFace.detection) {
      const box = detectedFace.detection.box;
      const landmarks = detectedFace.landmarks;
      faceStatus.textContent = `✅ 已检测到人脸 (置信度: ${(detectedFace.detection.score * 100).toFixed(0)}%)`;

      // Build crop region: expand from face box to include head+shoulders
      const expandX = 1.5;
      const expandYTop = 2.2;
      const expandYBot = 0.8;

      const faceCX = box.x + box.width / 2;
      const faceCY = box.y + box.height / 2;
      const cropW = Math.round(box.width * expandX);
      const cropH = Math.round(box.height * (expandYTop + expandYBot));

      let cropX = Math.round(faceCX - cropW / 2);
      let cropY = Math.round(faceCY - box.height * expandYTop);

      // Clamp
      cropX = Math.max(0, Math.min(canvas.width - cropW, cropX));
      cropY = Math.max(0, Math.min(canvas.height - cropH, cropY));

      // Draw result on canvas
      const resultCV = document.createElement('canvas');
      resultCV.width = outW;
      resultCV.height = outH;
      const rctx = resultCV.getContext('2d');

      // Background color
      rctx.fillStyle = bgColor;
      rctx.fillRect(0, 0, outW, outH);

      // Draw cropped person with simple edge feathering
      // Use landmarks to create a rough body mask
      if (landmarks) {
        const jawline = landmarks.getJawOutline();
        // Build mask from face outline
        const offCV = document.createElement('canvas');
        offCV.width = outW;
        offCV.height = outH;
        const octx = offCV.getContext('2d');
        octx.drawImage(canvas,
          cropX, cropY, cropW, cropH,
          0, 0, outW, outH
        );

        // Create mask
        const maskCV = document.createElement('canvas');
        maskCV.width = outW;
        maskCV.height = outH;
        const mctx = maskCV.getContext('2d');

        // Map face landmarks to output coordinates
        const scaleX = outW / cropW;
        const scaleY = outH / cropH;

        // Build a body shape using landmarks
        mctx.fillStyle = '#FFFFFF';
        mctx.beginPath();

        // Head ellipse based on jaw + forehead
        const headTop = (landmarks.positions[10].y - cropY) * scaleY;
        const headBot = (jawline[8].y - cropY) * scaleY;
        const headLeft = (landmarks.positions[0].x - cropX) * scaleX;
        const headRight = (landmarks.positions[16].x - cropX) * scaleX;
        const headCX = (headLeft + headRight) / 2;
        const headCY = (headTop + headBot) / 2;
        const headRX = (headRight - headLeft) * 0.65;
        const headRY = (headBot - headTop) * 0.7;
        mctx.ellipse(headCX, headCY, headRX, headRY, 0, 0, Math.PI * 2);
        mctx.fill();

        // Shoulders: rectangle below head
        const shoulderTop = headBot + headRY * 0.3;
        const shoulderBot = outH;
        const shoulderLeft = Math.max(0, headCX - headRX * 1.8);
        const shoulderRight = Math.min(outW, headCX + headRX * 1.8);
        mctx.fillRect(shoulderLeft, shoulderTop, shoulderRight - shoulderLeft, shoulderBot - shoulderTop);

        // Feather the mask edge
        const blurCV = document.createElement('canvas');
        blurCV.width = outW;
        blurCV.height = outH;
        const bctx = blurCV.getContext('2d');
        bctx.filter = 'blur(8px)';
        bctx.drawImage(maskCV, 0, 0);
        bctx.filter = 'none';

        // Composite: background + person on top with feathered mask
        // Step 1: Fill resultCV with background color
        rctx.fillStyle = bgColor;
        rctx.fillRect(0, 0, outW, outH);
        // Step 2: Draw person clipped to mask on top
        // First, create a temp canvas with the person + mask applied
        const personCV = document.createElement('canvas');
        personCV.width = outW; personCV.height = outH;
        const pctx2 = personCV.getContext('2d');
        pctx2.drawImage(offCV, 0, 0);
        pctx2.globalCompositeOperation = 'destination-in';
        pctx2.drawImage(blurCV, 0, 0);
        // Step 3: Draw the masked person onto the background
        rctx.drawImage(personCV, 0, 0);

        resultCanvas = resultCV;
        preview.width = outW;
        preview.height = outH;
        pctx.drawImage(resultCV, 0, 0);

      } else {
        // No landmarks, just do center crop
        rctx.drawImage(canvas,
          cropX, cropY, cropW, cropH,
          0, 0, outW, outH
        );
        resultCanvas = resultCV;
        preview.width = outW;
        preview.height = outH;
        pctx.drawImage(resultCV, 0, 0);
      }
    } else {
      faceStatus.textContent = '⚠️ 未检测到人脸，使用居中裁剪';
      // Center crop without face detection
      const resultCV = document.createElement('canvas');
      resultCV.width = outW;
      resultCV.height = outH;
      const rctx = resultCV.getContext('2d');

      rctx.fillStyle = bgColor;
      rctx.fillRect(0, 0, outW, outH);

      const srcRatio = canvas.width / canvas.height;
      const outRatio = outW / outH;
      let sW, sH, sX, sY;
      if (srcRatio > outRatio) {
        sH = canvas.height;
        sW = sH * outRatio;
        sX = (canvas.width - sW) / 2;
        sY = 0;
      } else {
        sW = canvas.width;
        sH = sW / outRatio;
        sX = 0;
        sY = (canvas.height - sH) / 2;
      }

      rctx.drawImage(canvas, sX, sY, sW, sH, 0, 0, outW, outH);
      resultCanvas = resultCV;
      preview.width = outW;
      preview.height = outH;
      pctx.drawImage(resultCV, 0, 0);
    }

    // Re-apply on settings change
    bgColorSel.onchange = sizeSel.onchange = () => { if (sourceCanvas) processPhoto(sourceCanvas); };
  }

  // ── Export ──
  $('#idExport').onclick = async () => {
    if (!resultCanvas) { Utils.toast('请先拍摄或上传照片', 'error'); return; }
    const fmt = fmtSel.value;

    try {
      if (fmt === 'pdf') {
        const { PDFDocument } = PDFLib;
        const pdf = await PDFDocument.create();
        const blob = await Utils.canvasToBlob(resultCanvas, 'image/png', 1.0);
        const buf = await blob.arrayBuffer();
        const embedded = await pdf.embedPng(new Uint8Array(buf));
        const dpi = 300;
        const wPt = (resultCanvas.width / dpi) * 72;
        const hPt = (resultCanvas.height / dpi) * 72;
        const page = pdf.addPage([wPt, hPt]);
        page.drawImage(embedded, { x: 0, y: 0, width: wPt, height: hPt });
        const bytes = await pdf.save();
        Utils.downloadBuffer(bytes, '证件照.pdf');
        Utils.toast('已导出 PDF', 'success');
      } else if (fmt === 'docx') {
        const dataUrl = resultCanvas.toDataURL('image/png');
        const htmlDoc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><style>body{margin:0;text-align:center}img{max-width:100%}</style></head>
<body><img src="${dataUrl}"></body></html>`;
        const blob = new Blob(['\ufeff' + htmlDoc], { type: 'application/msword' });
        Utils.download(blob, '证件照.doc');
        Utils.toast('已导出 DOC (可用 Word 打开)', 'success');
      } else {
        const blob = await Utils.canvasToBlob(resultCanvas, 'image/png', 1.0);
        Utils.download(blob, '证件照.png');
        Utils.toast('已导出 PNG', 'success');
      }
    } catch(e) {
      Utils.toast('导出失败: ' + e.message, 'error');
    }
  };

  $('#idRetake').onclick = () => {
    sourceCanvas = null; resultCanvas = null; detectedFace = null;
    preview.width = 0; preview.height = 0;
    faceStatus.textContent = '';
    const pctx = preview.getContext('2d');
    pctx.clearRect(0, 0, preview.width, preview.height);
  };

  // ── Init ──
  (async () => {
    try {
      await loadModels();
      loading.classList.add('hidden');
      ui.classList.remove('hidden');
      await startCamera();
    } catch(e) {
      console.error('Model load error:', e);
      loadText.textContent = '⚠️ AI 模型加载失败，可使用基础裁剪功能';
      setTimeout(() => {
        loading.classList.add('hidden');
        ui.classList.remove('hidden');
        modelsReady = false;
        startCamera();
      }, 2000);
    }
  })();
}

function Tool_id_photo_deactivate() {}
