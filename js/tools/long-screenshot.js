// ===== 长截图拼接工具 =====
function Tool_long_screenshot(container) {
  let images = [];
  let overlapResults = [];
  let resultBlob = null;
  let manualOverlaps = [];
  let draggingIdx = -1;
  let dragStartY = 0;
  let dragStartOverlap = 0;

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
          <option value="manual">手动拖动调整</option>
          <option value="none">直接拼接（无重叠）</option>
        </select>
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
    <div id="lsManualArea" class="hidden" style="margin-top:16px"></div>
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
  const optsDiv = container.querySelector('#lsOptions');
  const actions = container.querySelector('#lsActions');
  const mode = container.querySelector('#lsMode');
  const stitchBtn = container.querySelector('#lsStitchBtn');
  const resetBtn = container.querySelector('#lsResetBtn');
  const progress = container.querySelector('#lsProgress');
  const progressText = container.querySelector('#lsProgressText');
  const resultArea = container.querySelector('#lsResultArea');
  const resultCanvas = container.querySelector('#lsResultCanvas');
  const overlapInfo = container.querySelector('#lsOverlapInfo');
  const manualArea = container.querySelector('#lsManualArea');

  dropZone.addEventListener('click', () => pickImages());
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) loadImages(Array.from(e.dataTransfer.files));
  });

  mode.addEventListener('change', () => {
    if (mode.value === 'manual' && images.length >= 2) renderManualUI();
    else manualArea.classList.add('hidden');
  });

  resetBtn.addEventListener('click', resetAll);
  stitchBtn.addEventListener('click', () => {
    if (mode.value === 'manual') doManualStitch();
    else doAutoStitch();
  });

  async function pickImages() {
    const files = await Utils.pickFiles('image/*', true);
    if (files && files.length >= 2) loadImages(Array.from(files));
    else if (files && files.length < 2) Utils.toast('请至少选择 2 张图片', 'error');
  }

  async function loadImages(files) {
    images = [];
    manualOverlaps = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise(r => { img.onload = r; });
      images.push({ img, name: file.name, w: img.naturalWidth, h: img.naturalHeight });
    }
    if (images.length < 2) { Utils.toast('请至少选择 2 张图片', 'error'); return; }

    // Init manual overlaps to 0
    manualOverlaps = new Array(images.length - 1).fill(0);

    dropZone.classList.add('hidden');
    imageList.classList.remove('hidden');
    optsDiv.classList.remove('hidden');
    actions.classList.remove('hidden');
    renderImageList();

    if (mode.value === 'manual') renderManualUI();
  }

  function renderImageList() {
    imageList.innerHTML = `
      <div style="font-weight:600;font-size:0.9rem;margin-bottom:8px">已选 ${images.length} 张图片</div>
      <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:8px">
        ${images.map((img, i) => `
          <div style="flex-shrink:0;text-align:center">
            <div style="width:100px;height:75px;overflow:hidden;border-radius:8px;border:1px solid var(--border);background:var(--bg)">
              <img src="${img.img.src}" style="width:100%;height:100%;object-fit:cover">
            </div>
            <div style="font-size:0.65rem;margin-top:2px;color:var(--text-muted)">${i+1} · ${img.w}×${img.h}</div>
          </div>
        `).join('')}
      </div>`;
  }

  // ===== Manual drag UI =====
  function renderManualUI() {
    const targetW = getTargetWidth();
    manualArea.classList.remove('hidden');
    manualArea.innerHTML = `
      <div style="font-weight:600;font-size:0.9rem;margin-bottom:8px">拖动每张图调整重叠高度</div>
      <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:10px">
        点击并上下拖动图片可调整与上一张图的重叠像素
      </div>
      <div id="lsDragCanvasWrap" style="position:relative;overflow:hidden;border:1px solid var(--border);border-radius:8px;background:#f0f0f0;touch-action:none"></div>
      <div style="display:flex;justify-content:space-around;margin-top:8px;font-size:0.75rem;color:var(--text-muted)">
        ${manualOverlaps.map((o, i) => `<span>图${i+1}→图${i+2}: <b id="lsOverlapVal${i}">${o}px</b></span>`).join('')}
      </div>
    `;

    setTimeout(() => renderManualPreview(), 100);
    setupManualDrag();
  }

  function renderManualPreview() {
    const wrap = document.getElementById('lsDragCanvasWrap');
    if (!wrap) return;

    const targetW = getTargetWidth();
    const scale = Math.min(1, 400 / targetW);
    const displayW = Math.round(targetW * scale);

    // Build scaled image data
    const scaled = images.map(img => ({
      w: displayW,
      h: Math.round(img.h * (displayW / img.w))
    }));

    let totalH = 0;
    for (let i = 0; i < images.length; i++) {
      totalH += scaled[i].h;
      if (i < images.length - 1) totalH -= Math.round(manualOverlaps[i] * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = displayW;
    canvas.height = totalH;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvas.style.cursor = 'ns-resize';
    const ctx = canvas.getContext('2d');

    let y = 0;
    for (let i = 0; i < images.length; i++) {
      const sh = scaled[i].h;
      ctx.drawImage(images[i].img, 0, y, displayW, sh);

      // Draw separator line
      if (i < images.length - 1) {
        const overlap = Math.round(manualOverlaps[i] * scale);
        const sepY = y + sh - overlap;
        ctx.strokeStyle = 'rgba(59,130,246,0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(0, sepY);
        ctx.lineTo(displayW, sepY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = '#3b82f6';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(`重叠 ${manualOverlaps[i]}px`, 6, sepY - 4);

        y += sh - overlap;
      } else {
        y += sh;
      }
    }

    wrap.innerHTML = '';
    wrap.appendChild(canvas);
    wrap._scale = scale;
    wrap._scaled = scaled;
  }

  function setupManualDrag() {
    const wrap = document.getElementById('lsDragCanvasWrap');
    if (!wrap) return;

    const getEventY = (e) => {
      if (e.touches) return e.touches[0].clientY;
      return e.clientY;
    };

    const onDown = (e) => {
      if (images.length < 2) return;
      const canvas = wrap.querySelector('canvas');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scale = wrap._scale;
      const scaled = wrap._scaled;

      const clickY = getEventY(e) - rect.top;
      // Find which image pair the click is on
      let accY = 0;
      for (let i = 0; i < images.length - 1; i++) {
        accY += scaled[i].h;
        const overlap = Math.round(manualOverlaps[i] * scale);
        const sepY = accY - overlap;
        // Check if click is near the separator (±15px)
        if (Math.abs(clickY - sepY) < 20) {
          draggingIdx = i;
          dragStartY = getEventY(e);
          dragStartOverlap = manualOverlaps[i];
          canvas.style.cursor = 'grabbing';
          e.preventDefault();
          return;
        }
        accY -= overlap;
      }
    };

    const onMove = (e) => {
      if (draggingIdx < 0) return;
      const dy = getEventY(e) - dragStartY;
      const scale = wrap._scale;
      const maxOverlap = Math.min(
        images[draggingIdx].h,
        images[draggingIdx + 1].h
      );
      const newOverlap = Math.max(0, Math.min(maxOverlap, dragStartOverlap - Math.round(dy / scale)));
      manualOverlaps[draggingIdx] = newOverlap;
      renderManualPreview();
      // Update value display
      const valEl = document.getElementById('lsOverlapVal' + draggingIdx);
      if (valEl) valEl.textContent = newOverlap + 'px';
    };

    const onUp = () => {
      if (draggingIdx >= 0) {
        const canvas = wrap.querySelector('canvas');
        if (canvas) canvas.style.cursor = 'ns-resize';
        draggingIdx = -1;
      }
    };

    wrap.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    wrap.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
  }

  // ===== Auto detect overlap =====
  function detectOverlap(canvasTop, canvasBottom) {
    const w = canvasTop.width;
    const ht = canvasTop.height;
    const hb = canvasBottom.height;
    const maxO = Math.round(Math.min(ht, hb) * 0.4);
    const minO = Math.max(5, Math.round(maxO * 0.05));

    if (maxO < minO) return { overlap: 0, confidence: 0 };

    const topCtx = canvasTop.getContext('2d');
    const botCtx = canvasBottom.getContext('2d');

    // Compare a narrow vertical strip (center 60%)
    const x0 = Math.round(w * 0.2);
    const x1 = Math.round(w * 0.8);
    const stripW = x1 - x0;

    // Sample every 4th pixel row and every 4th column
    let bestO = 0, bestDiff = Infinity;

    for (let o = minO; o <= maxO; o++) {
      const topY = ht - o;
      let diff = 0, count = 0;

      for (let dy = 0; dy < o; dy += 4) {
        const td = topCtx.getImageData(x0, topY + dy, stripW, 1).data;
        const bd = botCtx.getImageData(x0, dy, stripW, 1).data;
        for (let x = 0; x < stripW * 4; x += 16) {
          diff += Math.abs(td[x] - bd[x]) + Math.abs(td[x+1] - bd[x+1]) + Math.abs(td[x+2] - bd[x+2]);
          count++;
        }
      }
      if (count === 0) continue;
      const avg = diff / count;
      if (avg < bestDiff) { bestDiff = avg; bestO = o; }
    }

    const conf = Math.max(0, Math.min(100, Math.round((1 - bestDiff / 40) * 100)));
    if (bestDiff > 40) return { overlap: 0, confidence: 0 };
    return { overlap: bestO, confidence: conf };
  }

  async function doAutoStitch() {
    if (images.length < 2) return;

    const targetW = getTargetWidth();
    progress.classList.remove('hidden');
    progressText.classList.remove('hidden');

    // Step 1: Create scaled canvases
    const scaled = images.map(img => {
      const c = document.createElement('canvas');
      const h = Math.round(img.h * (targetW / img.w));
      c.width = targetW; c.height = h;
      c.getContext('2d').drawImage(img.img, 0, 0, targetW, h);
      return c;
    });

    // Step 2: Detect overlaps
    overlapResults = [];
    let totalH = scaled[0].height;

    for (let i = 0; i < scaled.length - 1; i++) {
      progressText.textContent = `分析第 ${i+1}/${scaled.length-1} 组重合区域...`;
      const pct = 30 + Math.round((i / (scaled.length - 1)) * 40);
      document.querySelector('#lsProgress .progress-bar-fill').style.width = pct + '%';

      // Give UI a chance to update
      await new Promise(r => setTimeout(r, 20));

      const result = detectOverlap(scaled[i], scaled[i+1]);
      overlapResults.push(result);
      totalH += scaled[i+1].height - result.overlap;
    }

    // Step 3: Render
    progressText.textContent = '正在渲染长图...';
    document.querySelector('#lsProgress .progress-bar-fill').style.width = '80%';
    await new Promise(r => setTimeout(r, 20));

    renderResult(targetW, totalH, scaled);
  }

  function doManualStitch() {
    if (images.length < 2) return;

    const targetW = getTargetWidth();
    const scaled = images.map(img => {
      const c = document.createElement('canvas');
      const h = Math.round(img.h * (targetW / img.w));
      c.width = targetW; c.height = h;
      c.getContext('2d').drawImage(img.img, 0, 0, targetW, h);
      return c;
    });

    overlapResults = manualOverlaps.map(o => ({ overlap: o, confidence: 100 }));
    let totalH = scaled[0].height;
    for (let i = 0; i < scaled.length - 1; i++) {
      totalH += scaled[i+1].height - manualOverlaps[i];
    }

    renderResult(targetW, totalH, scaled);
  }

  function renderResult(targetW, totalH, scaled) {
    progress.classList.add('hidden');
    progressText.classList.add('hidden');

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = totalH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, totalH);

    let y = 0;
    for (let i = 0; i < images.length; i++) {
      const h = scaled[i].height;
      ctx.drawImage(scaled[i], 0, y);
      if (i < images.length - 1) {
        y += h - overlapResults[i].overlap;
      } else {
        y += h;
      }
    }

    canvas.toBlob(blob => {
      resultBlob = blob;
      resultArea.classList.remove('hidden');
      resultCanvas.width = targetW;
      resultCanvas.height = totalH;
      resultCanvas.style.width = '100%';
      resultCanvas.style.height = 'auto';
      resultCanvas.style.maxWidth = '600px';
      resultCanvas.getContext('2d').drawImage(canvas, 0, 0);

      overlapInfo.innerHTML = overlapResults.map((r, i) => {
        return `图${i+1}→图${i+2}: ${r.overlap}px 重叠` +
          (r.confidence !== undefined && r.confidence < 100 ? ` (置信度 ${r.confidence}%)` : '');
      }).join('<br>');

      Utils.toast(`长图完成: ${targetW}×${totalH}px`, 'success');
    }, 'image/png');
  }

  function getTargetWidth() {
    const w = document.getElementById('lsWidth')?.value || 'auto';
    return w === 'auto' ? Math.max(...images.map(i => i.w)) : parseInt(w);
  }

  // Download & Copy
  container.querySelector('#lsDownload').addEventListener('click', () => {
    if (!resultBlob) return;
    Utils.download(resultBlob, '长截图_' + new Date().toISOString().slice(0,10) + '.png');
    Utils.toast('长图已下载', 'success');
  });

  container.querySelector('#lsCopy').addEventListener('click', async () => {
    if (!resultBlob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': resultBlob })]);
      Utils.toast('已复制到剪贴板', 'success');
    } catch(e) {
      const u = URL.createObjectURL(resultBlob);
      const a = document.createElement('a');
      a.href = u; a.download = '长截图.png'; a.click();
      URL.revokeObjectURL(u);
      Utils.toast('已触发保存', 'success');
    }
  });

  function resetAll() {
    images = [];
    overlapResults = [];
    manualOverlaps = [];
    resultBlob = null;
    draggingIdx = -1;
    dropZone.classList.remove('hidden');
    imageList.classList.add('hidden');
    optsDiv.classList.add('hidden');
    actions.classList.add('hidden');
    manualArea.classList.add('hidden');
    resultArea.classList.add('hidden');
    progress.classList.add('hidden');
    progressText.classList.add('hidden');
  }
}

function Tool_long_screenshot_deactivate() {}
