function Tool_qrcode_scan(container) {
  let scanStream = null;
  let scanInterval = null;

  container.innerHTML = `
    <div class="camera-view" id="qrCamera" style="max-width:400px">
      <video id="qrVideo" autoplay playsinline></video>
      <canvas id="qrCanvas" style="display:block;position:absolute;top:0;left:0;width:100%;height:100%"></canvas>
    </div>
    <div class="camera-controls">
      <button class="btn btn-primary btn-sm" id="qrPauseResume">暂停扫描</button>
    </div>
    <div style="margin-top:16px">
      <div class="drop-zone" id="qrUpload">
        <div class="drop-zone-icon">📱</div>
        <div class="drop-zone-text">或上传含二维码的图片</div>
      </div>
      <input type="file" id="qrFileInput" accept="image/*" style="display:none">
    </div>
    <div id="qrResult" class="result-area hidden" style="margin-top:12px">
      <span class="result-icon">✅</span>
      <span class="result-text" id="qrResultText"></span>
      <div style="width:100%;margin-top:8px">
        <button class="btn btn-primary btn-sm" id="qrCopyResult">复制</button>
        <button class="btn btn-secondary btn-sm" id="qrOpenResult">打开链接</button>
      </div>
    </div>
  `;

  const video = container.querySelector('#qrVideo');
  const canvas = container.querySelector('#qrCanvas');
  const ctx = canvas.getContext('2d');
  const result = container.querySelector('#qrResult');
  const resultText = container.querySelector('#qrResultText');
  const pauseBtn = container.querySelector('#qrPauseResume');
  const uploadZone = container.querySelector('#qrUpload');
  const fileInput = container.querySelector('#qrFileInput');
  let paused = false;

  async function startScan() {
    try {
      scanStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      video.srcObject = scanStream;

      video.addEventListener('loadedmetadata', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        scanLoop();
      });
    } catch (err) {
      container.querySelector('#qrCamera').style.display = 'none';
      pauseBtn.style.display = 'none';
    }
  }

  function scanLoop() {
    scanInterval = setInterval(() => {
      if (paused) return;
      if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, canvas.width, canvas.height);
      if (code) {
        showResult(code.data);
      }
    }, 200);
  }

  function showResult(text) {
    result.classList.remove('hidden');
    resultText.textContent = text;
    navigator.clipboard.writeText(text).catch(() => {});
    if (scanInterval) clearInterval(scanInterval);
  }

  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? '继续扫描' : '暂停扫描';
  });

  // Upload image scan
  uploadZone.addEventListener('click', () => fileInput.click());
  uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault(); uploadZone.classList.remove('drag-over');
    scanFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) scanFile(fileInput.files[0]);
  });

  async function scanFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const img = await Utils.loadImageFromFile(file);
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const cx = c.getContext('2d');
    cx.drawImage(img, 0, 0);
    const imageData = cx.getImageData(0, 0, c.width, c.height);
    const code = jsQR(imageData.data, c.width, c.height);
    if (code) {
      showResult(code.data);
    } else {
      Utils.toast('未识别到二维码', 'warning');
    }
  }

  container.querySelector('#qrCopyResult').addEventListener('click', () => {
    navigator.clipboard.writeText(resultText.textContent).then(() => Utils.toast('已复制', 'success'));
  });

  container.querySelector('#qrOpenResult').addEventListener('click', () => {
    const text = resultText.textContent;
    if (text.startsWith('http://') || text.startsWith('https://')) {
      window.open(text, '_blank');
    } else {
      Utils.toast('不是有效链接', 'warning');
    }
  });

  startScan();

  window.Tool_qrcode_scan_deactivate = () => {
    if (scanInterval) clearInterval(scanInterval);
    if (scanStream) {
      scanStream.getTracks().forEach(t => t.stop());
      scanStream = null;
    }
  };
}
