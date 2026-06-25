// ===== 长截图拼接工具 v2 =====
function Tool_long_screenshot(container) {
  let images = [];
  let overlapResults = [];
  let resultBlob = null;
  let manualOverlaps = [];
  let dragState = null;

  container.innerHTML = `
    <div class="drop-zone" id="lsDrop">
      <div class="drop-zone-icon">📐</div>
      <div class="drop-zone-text">选择要拼接的图片（2 张以上）</div>
      <div class="drop-zone-hint">按从上到下顺序选择，可自动检测画面重叠区域</div>
    </div>
    <div id="lsImageList" class="hidden" style="margin-top:12px"></div>
    <div class="form-row hidden" id="lsOptions">
      <div class="form-group" style="flex:1;min-width:160px">
        <label>拼接模式</label>
        <select id="lsMode">
          <option value="auto">自动检测画面重叠</option>
          <option value="manual">手动拖动调整重叠</option>
          <option value="none">直接拼接（无重叠）</option>
        </select>
      </div>
      <div class="form-group" style="flex:1;min-width:160px">
        <label>输出宽度</label>
        <select id="lsWidth">
          <option value="auto">自动（最宽图片）</option>
          <option value="1080">1080px</option>
          <option value="750">750px</option>
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

  const $ = s => container.querySelector(s);
  const dropZone = $('#lsDrop');
  const imageList = $('#lsImageList');
  const optsDiv = $('#lsOptions');
  const actions = $('#lsActions');
  const modeSel = $('#lsMode');
  const progress = $('#lsProgress');
  const progressText = $('#lsProgressText');
  const resultArea = $('#lsResultArea');
  const resultCanvas = $('#lsResultCanvas');
  const overlapInfo = $('#lsOverlapInfo');
  const manualArea = $('#lsManualArea');

  // ---- File selection ----
  dropZone.onclick = () => pickFiles();
  dropZone.ondragover = e => { e.preventDefault(); dropZone.classList.add('drag-over'); };
  dropZone.ondragleave = () => dropZone.classList.remove('drag-over');
  dropZone.ondrop = e => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) loadImages(Array.from(e.dataTransfer.files));
  };

  async function pickFiles() {
    const files = await Utils.pickFiles('image/*', true);
    if (files?.length >= 2) loadImages(Array.from(files));
    else if (files?.length) Utils.toast('请至少选择 2 张图片', 'error');
  }

  async function loadImages(files) {
    images = [];
    manualOverlaps = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise(r => { img.onload = r; });
      images.push({ img, w: img.naturalWidth, h: img.naturalHeight });
    }
    if (images.length < 2) { Utils.toast('至少需要 2 张图片', 'error'); return; }
    manualOverlaps = new Array(images.length - 1).fill(0);

    dropZone.classList.add('hidden');
    imageList.classList.remove('hidden');
    optsDiv.classList.remove('hidden');
    actions.classList.remove('hidden');
    showThumbnails();
    if (modeSel.value === 'manual') showManualUI();
  }

  modeSel.onchange = () => {
    if (modeSel.value === 'manual' && images.length >= 2) showManualUI();
    else manualArea.classList.add('hidden');
  };

  $('#lsResetBtn').onclick = () => {
    images = []; overlapResults = []; manualOverlaps = []; resultBlob = null; dragState = null;
    dropZone.classList.remove('hidden');
    imageList.classList.add('hidden');
    optsDiv.classList.add('hidden');
    actions.classList.add('hidden');
    manualArea.classList.add('hidden');
    resultArea.classList.add('hidden');
    progress.classList.add('hidden');
    progressText.classList.add('hidden');
  };

  function showThumbnails() {
    imageList.innerHTML = `
      <div style="font-weight:600;font-size:0.9rem;margin-bottom:6px">已选 ${images.length} 张（从上到下）</div>
      <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:6px">
        ${images.map((im,i) => `
          <div style="flex-shrink:0;text-align:center">
            <div style="width:80px;height:60px;overflow:hidden;border-radius:6px;border:1px solid var(--border);background:var(--bg)">
              <img src="${im.img.src}" style="width:100%;height:100%;object-fit:cover">
            </div>
            <div style="font-size:0.6rem;color:var(--text-muted)">${i+1}</div>
          </div>`).join('')}
      </div>`;
  }

  // ====== Manual drag UI ======
  function showManualUI() {
    manualArea.classList.remove('hidden');
    manualArea.innerHTML = `
      <div style="font-weight:600;font-size:0.9rem;margin-bottom:4px">拖动调整重叠区域</div>
      <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:8px">在预览图中<span style="color:var(--cat-pdf)">蓝色虚线</span>处上下拖动</div>
      <div id="lsDragWrap" style="position:relative;overflow:auto;border:1px solid var(--border);border-radius:8px;background:#f5f5f5;max-height:500px"></div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:6px;font-size:0.75rem;color:var(--text-secondary)">
        ${manualOverlaps.map((o,i) => `<span>图${i+1}→${i+2}: <b id="mv${i}">${o}px</b>重叠</span>`).join('')}
      </div>`;
    setTimeout(drawManualPreview, 100);
  }

  function drawManualPreview() {
    const wrap = document.getElementById('lsDragWrap');
    if (!wrap) return;
    const targetW = getTargetW();
    const scale = Math.min(1, 350 / targetW);
    const dw = Math.round(targetW * scale);
    const scaled = images.map(im => ({
      w: dw,
      h: Math.round(im.h * dw / im.w),
      src: im.img
    }));

    let totalH = 0, positions = [];
    for (let i = 0; i < images.length; i++) {
      positions.push(totalH);
      totalH += scaled[i].h;
      if (i < images.length - 1) totalH -= Math.round(manualOverlaps[i] * scale);
    }

    const cvs = document.createElement('canvas');
    cvs.width = dw; cvs.height = totalH;
    cvs.style.display = 'block';
    cvs.style.cursor = 'default';
    const ctx = cvs.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, dw, totalH);

    // Draw images
    for (let i = 0; i < images.length; i++) {
      const sh = scaled[i].h;
      ctx.drawImage(images[i].img, 0, positions[i], dw, sh);
    }

    // Draw drag handles (separator lines)
    let accY = 0;
    for (let i = 0; i < images.length - 1; i++) {
      accY += scaled[i].h;
      const ov = Math.round(manualOverlaps[i] * scale);
      const lineY = accY - ov;
      // Semi-transparent overlap zone
      ctx.fillStyle = 'rgba(59,130,246,0.08)';
      ctx.fillRect(0, lineY - ov/2, dw, ov);
      // Dashed line
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath(); ctx.moveTo(0, lineY); ctx.lineTo(dw, lineY); ctx.stroke();
      ctx.setLineDash([]);
      // Drag handle pill
      const px = dw / 2 - 30;
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.roundRect(px, lineY - 10, 60, 20, 10);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('↕ 拖动', dw/2, lineY + 5);
      accY -= ov;
    }

    wrap.innerHTML = '';
    wrap.appendChild(cvs);
    wrap._dw = dw;
    wrap._scale = scale;
    wrap._scaled = scaled;
    wrap._positions = positions;

    // Bind drag events
    bindDrag(cvs, wrap);
  }

  function bindDrag(cvs, wrap) {
    const onDown = e => {
      const rect = cvs.getBoundingClientRect();
      const scale = wrap._scale;
      const scaled = wrap._scaled;

      // Get click coordinates relative to canvas pixels
      let cx, cy;
      if (e.touches) {
        cx = e.touches[0].clientX - rect.left;
        cy = e.touches[0].clientY - rect.top;
      } else {
        cx = e.offsetX;
        cy = e.offsetY;
      }

      // Scale to internal canvas coordinates
      const scaleX = cvs.width / rect.width;
      const scaleY = cvs.height / rect.height;
      const px = cx * scaleX;
      const py = cy * scaleY;

      // Find which separator was clicked
      let accY = 0;
      for (let i = 0; i < images.length - 1; i++) {
        accY += scaled[i].h;
        const ovPx = Math.round(manualOverlaps[i] * scale);
        const lineY = accY - ovPx;
        if (Math.abs(py - lineY) < 30) {
          dragState = {
            index: i,
            startY: e.touches ? e.touches[0].clientY : e.clientY,
            startOverlap: manualOverlaps[i],
            maxOverlap: Math.min(images[i].h, images[i+1].h)
          };
          cvs.style.cursor = 'grabbing';
          e.preventDefault();
          return;
        }
        accY -= ovPx;
      }
    };

    const onMove = e => {
      if (!dragState) {
        // Hover: show grab cursor near separators
        if (e.target === cvs) {
          const rect = cvs.getBoundingClientRect();
          const cy = (e.offsetY || (e.clientY - rect.top)) * (cvs.height / rect.height);
          const scale = wrap._scale;
          const scaled = wrap._scaled;
          let accY = 0, near = false;
          for (let i = 0; i < images.length - 1; i++) {
            accY += scaled[i].h;
            const ovPx = Math.round(manualOverlaps[i] * scale);
            const lineY = accY - ovPx;
            if (Math.abs(cy - lineY) < 25) { near = true; break; }
            accY -= ovPx;
          }
          cvs.style.cursor = near ? 'ns-resize' : 'default';
        }
        return;
      }
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dy = clientY - dragState.startY;
      const scale = wrap._scale;
      const newO = Math.round(Math.max(0, Math.min(dragState.maxOverlap, dragState.startOverlap - dy / scale)));
      manualOverlaps[dragState.index] = newO;
      drawManualPreview();
      const ve = document.getElementById('mv' + dragState.index);
      if (ve) ve.textContent = newO + 'px';
    };

    const onUp = () => {
      if (dragState && cvs) cvs.style.cursor = 'default';
      dragState = null;
    };

    cvs.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    cvs.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
  }

  // ====== Auto detect overlap ======
  function detectOverlap(c1, c2) {
    const w = c1.width;
    const h1 = c1.height;
    const h2 = c2.height;
    const maxO = Math.round(Math.min(h1, h2) * 0.5);
    const minO = 10;
    if (maxO <= minO) return { overlap: 0, confidence: 0 };

    const ctx1 = c1.getContext('2d');
    const ctx2 = c2.getContext('2d');

    // Compare the middle 70% strip horizontally
    const x0 = Math.round(w * 0.15);
    const x1 = Math.round(w * 0.85);
    const sw = x1 - x0;

    // Row-by-row comparison: compare bottom rows of image1 with top rows of image2
    let bestO = 0, bestDiff = Infinity;

    for (let o = minO; o <= maxO; o += 2) {
      let diff = 0, count = 0;

      // Compare every other row in the overlap region
      const rows = Math.min(o, 30); // sample up to 30 rows
      const step = Math.max(1, Math.floor(o / rows));

      for (let dy = 0; dy < o; dy += step) {
        const d1 = ctx1.getImageData(x0, h1 - o + dy, sw, 1).data;
        const d2 = ctx2.getImageData(x0, dy, sw, 1).data;
        for (let x = 0; x < sw * 4; x += 4) {
          // Compare grayscale to be more robust
          const g1 = 0.299 * d1[x] + 0.587 * d1[x+1] + 0.114 * d1[x+2];
          const g2 = 0.299 * d2[x] + 0.587 * d2[x+1] + 0.114 * d2[x+2];
          diff += Math.abs(g1 - g2);
          count++;
        }
      }
      if (count === 0) continue;
      const avg = diff / count;
      if (avg < bestDiff) { bestDiff = avg; bestO = o; }
    }

    // Accept if avg pixel difference < 50 (grayscale 0-255)
    if (bestDiff > 50) return { overlap: 0, confidence: 0 };
    const conf = Math.round(Math.max(0, (1 - bestDiff / 50) * 100));
    return { overlap: bestO, confidence: conf };
  }

  function getTargetW() {
    const v = document.getElementById('lsWidth')?.value || 'auto';
    return v === 'auto' ? Math.max(...images.map(i => i.w)) : parseInt(v);
  }

  async function doAutoStitch() {
    const targetW = getTargetW();
    // Resize all images to target width
    const scaled = images.map(im => {
      const c = document.createElement('canvas');
      c.width = targetW;
      c.height = Math.round(im.h * targetW / im.w);
      c.getContext('2d').drawImage(im.img, 0, 0, targetW, c.height);
      return c;
    });

    progress.classList.remove('hidden');
    progressText.classList.remove('hidden');

    overlapResults = [];
    let totalH = scaled[0].height;

    for (let i = 0; i < scaled.length - 1; i++) {
      progressText.textContent = `正在检测第 ${i+1}/${scaled.length-1} 组重叠区域...`;
      $('#lsProgress .progress-bar-fill').style.width = (20 + (i/(scaled.length-1))*50) + '%';
      await new Promise(r => setTimeout(r, 30));

      const res = detectOverlap(scaled[i], scaled[i+1]);
      overlapResults.push(res);
      totalH += scaled[i+1].height - res.overlap;

      if (res.overlap > 0) {
        progressText.textContent = `检测到 ${res.overlap}px 重叠（置信度 ${res.confidence}%）`;
        await new Promise(r => setTimeout(r, 200));
      }
    }

    progressText.textContent = '渲染长图中...';
    $('#lsProgress .progress-bar-fill').style.width = '85%';
    await new Promise(r => setTimeout(r, 30));

    renderResult(targetW, totalH, scaled);
  }

  function doManualStitch() {
    const targetW = getTargetW();
    const scaled = images.map(im => {
      const c = document.createElement('canvas');
      c.width = targetW;
      c.height = Math.round(im.h * targetW / im.w);
      c.getContext('2d').drawImage(im.img, 0, 0, targetW, c.height);
      return c;
    });

    overlapResults = manualOverlaps.map(o => ({ overlap: o, confidence: 100 }));
    let totalH = scaled[0].height;
    for (let i = 0; i < scaled.length - 1; i++) totalH += scaled[i+1].height - manualOverlaps[i];

    renderResult(targetW, totalH, scaled);
  }

  function renderResult(targetW, totalH, scaled) {
    progress.classList.add('hidden');
    progressText.classList.add('hidden');
    manualArea.classList.add('hidden');
    resultArea.classList.remove('hidden');

    const cvs = document.createElement('canvas');
    cvs.width = targetW; cvs.height = totalH;
    const ctx = cvs.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, targetW, totalH);

    let y = 0;
    for (let i = 0; i < images.length; i++) {
      ctx.drawImage(scaled[i], 0, y);
      y += scaled[i].height;
      if (i < images.length - 1) y -= overlapResults[i].overlap;
    }

    cvs.toBlob(blob => {
      resultBlob = blob;
      resultCanvas.width = targetW;
      resultCanvas.height = totalH;
      const rctx = resultCanvas.getContext('2d');
      rctx.drawImage(cvs, 0, 0);
      resultCanvas.style.width = '100%';
      resultCanvas.style.height = 'auto';
      resultCanvas.style.maxWidth = '600px';

      overlapInfo.innerHTML = overlapResults.map((r, i) =>
        `图${i+1}→图${i+2}: ${r.overlap > 0 ? r.overlap + 'px 重叠' : '无重叠'}` +
        (r.confidence !== undefined ? `（置信度 ${r.confidence}%）` : '')
      ).join('<br>');

      Utils.toast(`长图生成完成: ${targetW}×${totalH}px`, 'success');
    }, 'image/png');
  }

  // ===== Download / Copy =====
  $('#lsStitchBtn').onclick = () => {
    if (modeSel.value === 'manual') doManualStitch();
    else if (modeSel.value === 'none') {
      const targetW = getTargetW();
      const scaled = images.map(im => {
        const c = document.createElement('canvas');
        c.width = targetW;
        c.height = Math.round(im.h * targetW / im.w);
        c.getContext('2d').drawImage(im.img, 0, 0, targetW, c.height);
        return c;
      });
      overlapResults = new Array(images.length-1).fill({ overlap: 0, confidence: 100 });
      let totalH = 0;
      scaled.forEach(s => totalH += s.height);
      renderResult(targetW, totalH, scaled);
    } else {
      doAutoStitch();
    }
  };

  $('#lsDownload').onclick = () => {
    if (!resultBlob) return;
    Utils.download(resultBlob, '长截图_' + new Date().toISOString().slice(0,10) + '.png');
    Utils.toast('已下载', 'success');
  };

  $('#lsCopy').onclick = async () => {
    if (!resultBlob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': resultBlob })]);
      Utils.toast('已复制到剪贴板', 'success');
    } catch(e) {
      const a = document.createElement('a');
      const u = URL.createObjectURL(resultBlob);
      a.href = u; a.download = '长截图.png'; a.click();
      URL.revokeObjectURL(u);
    }
  };
}

function Tool_long_screenshot_deactivate() {}
