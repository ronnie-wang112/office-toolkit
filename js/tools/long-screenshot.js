// ===== 长截图工具 — 多图纵向拼接 =====
function Tool_long_screenshot(container) {
  let images = [];
  let overlapResults = [];
  let totalHeight = 0;
  let canvasWidth = 0;

  container.innerHTML = `
    <div class="drop-zone" id="lsDrop">
      <div class="drop-zone-icon">📐</div>
      <div class="drop-zone-text">选择要拼接的图片（2 张以上）</div>
      <div class="drop-zone-hint">按顺序选择，支持自动检测重合区域</div>
    </div>
    <div id="lsImageList" class="hidden" style="margin-top:12px"></div>
    <div class="form-row hidden" id="lsOptions">
      <div class="form-group" style="flex:1;min-width:160px">
        <label>拼接模式</label>
        <select id="lsMode">
          <option value="auto">自动检测重合</option>
          <option value="manual">手动设置重叠像素</option>
          <option value="none">直接拼接（无重叠）</option>
        </select>
      </div>
      <div class="form-group hidden" id="lsManualGrp" style="flex:1;min-width:160px">
        <label>重叠像素</label>
        <input type="number" id="lsOverlapPx" value="100" min="0" max="500" step="10">
      </div>
      <div class="form-group" style="flex:1;min-width:160px">
        <label>输出宽度</label>
        <select id="lsWidth">
          <option value="auto">自动（最宽图片）</option>
          <option value="1080">1080px</option>
          <option value="750">750px</option>
          <option value="600">600px</option>
        </select>
      </div>
    </div>
    <div class="btn-group hidden" id="lsActions">
      <button class="btn btn-primary" id="lsStitchBtn">开始拼接</button>
      <button class="btn btn-secondary" id="lsResetBtn">重新选择</button>
    </div>
    <div class="progress-bar hidden" id="lsProgress"><div class="progress-bar-fill"></div></div>
    <div class="progress-text hidden" id="lsProgressText"></div>
    <div class="result-area hidden" id="lsResultArea">
      <div class="preview-container" style="max-height:500px;overflow-y:auto">
        <canvas id="lsResultCanvas"></canvas>
      </div>
      <div id="lsOverlapInfo" style="font-size:0.8rem;color:var(--text-muted);margin-top:8px;"></div>
      <div class="btn-group">
        <button class="btn btn-primary" id="lsDownload">下载长图</button>
        <button class="btn btn-secondary" id="lsCopy">复制到剪贴板</button>
      </div>
    </div>
  `;

  const dropZone = container.querySelector('#lsDrop');
  const imageList = container.querySelector('#lsImageList');
  const options = container.querySelector('#lsOptions');
  const actions = container.querySelector('#lsActions');
  const mode = container.querySelector('#lsMode');
  const manualGrp = container.querySelector('#lsManualGrp');
  const stitchBtn = container.querySelector('#lsStitchBtn');
  const resetBtn = container.querySelector('#lsResetBtn');
  const progress = container.querySelector('#lsProgress');
  const progressText = container.querySelector('#lsProgressText');
  const resultArea = container.querySelector('#lsResultArea');
  const resultCanvas = container.querySelector('#lsResultCanvas');
  const overlapInfo = container.querySelector('#lsOverlapInfo');
  const downloadBtn = container.querySelector('#lsDownload');
  const copyBtn = container.querySelector('#lsCopy');

  // Drop handler
  dropZone.addEventListener('click', () => selectImages());
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) loadImages(Array.from(e.dataTransfer.files));
  });

  mode.addEventListener('change', () => {
    manualGrp.classList.toggle('hidden', mode.value !== 'manual');
  });

  resetBtn.addEventListener('click', () => resetAll());
  stitchBtn.addEventListener('click', () => doStitch());

  downloadBtn.addEventListener('click', () => {
    resultCanvas.toBlob(blob => {
      Utils.download(blob, '长截图_' + new Date().toISOString().slice(0,10) + '.png');
      Utils.toast('长图已下载', 'success');
    }, 'image/png');
  });

  copyBtn.addEventListener('click', async () => {
    try {
      resultCanvas.toBlob(async blob => {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        Utils.toast('已复制到剪贴板', 'success');
      }, 'image/png');
    } catch(e) {
      // Fallback for mobile: use download
      resultCanvas.toBlob(blob => {
        Utils.download(blob, '长截图.png');
        Utils.toast('已触发下载保存', 'success');
      }, 'image/png');
    }
  });

  async function selectImages() {
    const files = await Utils.pickFiles('image/*', true);
    if (files && files.length >= 2) loadImages(Array.from(files));
    else if (files && files.length < 2) Utils.toast('请至少选择 2 张图片', 'error');
  }

  async function loadImages(files) {
    images = [];
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    if (validFiles.length < 2) {
      Utils.toast('请至少选择 2 张图片', 'error');
      return;
    }

    for (const file of validFiles) {
      const img = await Utils.loadImageFromFile(file);
      images.push({ file, img, name: file.name, w: img.width, h: img.height });
    }

    renderImageList();
  }

  function renderImageList() {
    dropZone.classList.add('hidden');
    imageList.classList.remove('hidden');
    options.classList.remove('hidden');
    actions.classList.remove('hidden');

    imageList.innerHTML = `
      <div style="font-weight:600;font-size:0.9rem;margin-bottom:8px;display:flex;align-items:center;gap:6px">
        已选 ${images.length} 张图片
        <span style="font-size:0.75rem;color:var(--text-muted)">（从上到下排列）</span>
      </div>
      <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:8px">
        ${images.map((img, i) => `
          <div style="flex-shrink:0;text-align:center;position:relative">
            <div style="width:120px;height:90px;overflow:hidden;border-radius:8px;border:1px solid var(--border);background:var(--bg)">
              <img src="${img.img.src}" style="width:100%;height:100%;object-fit:cover">
            </div>
            <div style="font-size:0.7rem;margin-top:3px;color:var(--text-secondary)">${i+1}. ${img.name.slice(0,12)}</div>
            <div style="font-size:0.65rem;color:var(--text-muted)">${img.w}×${img.h}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function resetAll() {
    images = [];
    overlapResults = [];
    totalHeight = 0;
    canvasWidth = 0;
    dropZone.classList.remove('hidden');
    imageList.classList.add('hidden');
    options.classList.add('hidden');
    actions.classList.add('hidden');
    resultArea.classList.add('hidden');
  }

  // ---- Core: Auto overlap detection ----
  function detectOverlap(imgTop, imgBottom, maxOverlap = 0.4) {
    // Scale down for performance
    const scaleW = 300 / imgTop.w;
    const w = 300;
    const topH = Math.round(imgTop.h * scaleW);
    const botH = Math.round(imgBottom.h * scaleW);

    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = w;
    const ctx = tmpCanvas.getContext('2d');

    // Draw top image scaled
    ctx.drawImage(imgTop, 0, 0, w, topH);
    const topData = ctx.getImageData(0, 0, w, topH).data;

    // Draw bottom image scaled
    ctx.clearRect(0, 0, w, botH + topH);
    ctx.drawImage(imgBottom, 0, 0, w, botH);
    const botData = ctx.getImageData(0, 0, w, botH).data;

    const maxShift = Math.round(Math.min(topH, botH) * maxOverlap);
    const minShift = Math.max(5, Math.round(maxShift * 0.05));
    
    let bestOffset = 0;
    let bestDiff = Infinity;

    // For each possible overlap, compare bottom strip of top with top strip of bottom
    const stripH = Math.min(20, Math.round(maxShift * 0.15));
    
    for (let offset = minShift; offset <= maxShift; offset += 2) {
      let diff = 0;
      let count = 0;
      
      // Compare top[topH-stripH .. topH] with bottom[offset-stripH .. offset]
      for (let y = 0; y < stripH; y += 2) {
        const topY = topH - stripH + y;
        const botY = offset - stripH + y;
        for (let x = 0; x < w; x += 3) {
          const ti = (topY * w + x) * 4;
          const bi = (botY * w + x) * 4;
          diff += Math.abs(topData[ti] - botData[bi]) +
                  Math.abs(topData[ti+1] - botData[bi+1]) +
                  Math.abs(topData[ti+2] - botData[bi+2]);
          count++;
        }
      }
      
      const avgDiff = diff / count;
      if (avgDiff < bestDiff) {
        bestDiff = avgDiff;
        bestOffset = offset;
      }
    }

    // Convert back to original scale
    const originalOverlap = Math.round(bestOffset / scaleW);
    
    // Quality check: if the best match is too poor, don't overlap
    const threshold = 35; // max acceptable average pixel difference
    if (bestDiff > threshold) {
      return { overlap: 0, confidence: 0, autoDetected: false };
    }

    const confidence = Math.max(0, Math.min(100, Math.round((1 - bestDiff / threshold) * 100)));
    return { overlap: originalOverlap, confidence, autoDetected: true };
  }

  async function doStitch() {
    if (images.length < 2) return;

    const stitchMode = mode.value;
    const manualOverlap = parseInt(document.getElementById('lsOverlapPx')?.value) || 100;
    const widthMode = document.getElementById('lsWidth')?.value || 'auto';

    progress.classList.remove('hidden');
    progressText.classList.remove('hidden');
    progressText.textContent = '正在分析图片重合区域...';
    document.querySelector('#lsProgress .progress-bar-fill').style.width = '30%';

    await sleep(50); // allow UI update

    // Step 1: Resize all images to same width
    const widths = images.map(i => i.w);
    const targetW = widthMode === 'auto' ? Math.max(...widths) : parseInt(widthMode);

    // Step 2: Detect overlaps
    overlapResults = [];
    totalHeight = images[0].h;

    for (let i = 0; i < images.length - 1; i++) {
      progressText.textContent = `分析第 ${i+1}/${images.length-1} 组重合区域...`;
      document.querySelector('#lsProgress .progress-bar-fill').style.width = (30 + (i/(images.length-1))*40) + '%';
      await sleep(10);

      const img1 = images[i].img;
      const img2 = images[i+1].img;

      // Scale images to target width for comparison
      const scale1 = targetW / img1.width;
      const scale2 = targetW / img2.width;
      const scaledH1 = Math.round(img1.height * scale1);
      const scaledH2 = Math.round(img2.height * scale2);

      // Create scaled canvases for comparison
      const c1 = document.createElement('canvas');
      c1.width = targetW; c1.height = scaledH1;
      c1.getContext('2d').drawImage(img1, 0, 0, targetW, scaledH1);

      const c2 = document.createElement('canvas');
      c2.width = targetW; c2.height = scaledH2;
      c2.getContext('2d').drawImage(img2, 0, 0, targetW, scaledH2);

      let result;
      if (stitchMode === 'auto') {
        result = detectOverlap(c1, c2);
      } else if (stitchMode === 'manual') {
        result = { overlap: manualOverlap, confidence: 100, autoDetected: false };
      } else {
        result = { overlap: 0, confidence: 100, autoDetected: false };
      }

      overlapResults.push(result);
      totalHeight += scaledH2 - result.overlap;
    }

    // Step 3: Render stitched canvas
    progressText.textContent = '正在渲染长图...';
    document.querySelector('#lsProgress .progress-bar-fill').style.width = '80%';
    await sleep(50);

    canvasWidth = targetW;
    const mainCanvas = document.createElement('canvas');
    mainCanvas.width = targetW;
    mainCanvas.height = totalHeight;
    const ctx = mainCanvas.getContext('2d');

    // Fill background white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, totalHeight);

    let y = 0;
    for (let i = 0; i < images.length; i++) {
      const img = images[i].img;
      const scale = targetW / img.width;
      const h = Math.round(img.height * scale);
      
      ctx.drawImage(img, 0, y, targetW, h);

      if (i < images.length - 1) {
        const overlap = overlapResults[i].overlap;
        y += h - overlap;
      } else {
        y += h;
      }
    }

    // Step 4: Show result
    progress.classList.add('hidden');
    progressText.classList.add('hidden');
    resultArea.classList.remove('hidden');
    resultCanvas.width = targetW;
    resultCanvas.height = totalHeight;
    resultCanvas.style.width = '100%';
    resultCanvas.style.height = 'auto';
    resultCanvas.style.maxWidth = '600px';
    resultCanvas.getContext('2d').drawImage(mainCanvas, 0, 0);

    // Show overlap info
    const infoLines = overlapResults.map((r, i) => {
      if (r.autoDetected) {
        return `图${i+1}→图${i+2}: 检测到 ${r.overlap}px 重合 (置信度 ${r.confidence}%)`;
      } else if (r.overlap > 0) {
        return `图${i+1}→图${i+2}: 手动设置 ${r.overlap}px 重合`;
      } else {
        return `图${i+1}→图${i+2}: 直接拼接`;
      }
    }).join('<br>');
    overlapInfo.innerHTML = infoLines;
    Utils.toast(`长图生成完成: ${targetW}×${totalHeight}px`, 'success');
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

function Tool_long_screenshot_deactivate() {}
