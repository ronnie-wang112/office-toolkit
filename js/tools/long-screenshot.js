// ===== 长截图拼接工具 v3 =====
function Tool_long_screenshot(container) {
  let images = [];
  let overlapResults = [];
  let resultBlob = null;
  let manualOverlaps = [];
  let dragState = null;
  // Throttle
  let rafId = null, pendingUpdate = false;

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
  const drop = $('#lsDrop');
  const optsDiv = $('#lsOptions');
  const actions = $('#lsActions');
  const modeSel = $('#lsMode');
  const progress = $('#lsProgress');
  const pText = $('#lsProgressText');
  const resultArea = $('#lsResultArea');
  const resultCanvas = $('#lsResultCanvas');
  const ovInfo = $('#lsOverlapInfo');
  const manArea = $('#lsManualArea');

  drop.onclick = () => pickFiles();
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('drag-over'); };
  drop.ondragleave = () => drop.classList.remove('drag-over');
  drop.ondrop = e => {
    e.preventDefault(); drop.classList.remove('drag-over');
    if (e.dataTransfer.files.length) loadFiles(Array.from(e.dataTransfer.files));
  };

  async function pickFiles() {
    const f = await Utils.pickFiles('image/*', true);
    if (f?.length >= 2) loadFiles(Array.from(f));
    else if (f?.length) Utils.toast('至少选2张', 'error');
  }

  async function loadFiles(files) {
    images = []; manualOverlaps = [];
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      const img = new Image();
      img.src = URL.createObjectURL(f);
      await new Promise(r => { img.onload = r; });
      images.push({ img, w: img.naturalWidth, h: img.naturalHeight });
    }
    if (images.length < 2) { Utils.toast('至少2张', 'error'); return; }
    manualOverlaps = new Array(images.length-1).fill(0);
    drop.classList.add('hidden');
    $('#lsImageList').classList.remove('hidden');
    optsDiv.classList.remove('hidden');
    actions.classList.remove('hidden');
    showThumbs();
    if (modeSel.value === 'manual') buildManualUI();
  }

  modeSel.onchange = () => {
    manArea.classList.add('hidden');
    if (modeSel.value === 'manual' && images.length >= 2) buildManualUI();
  };

  $('#lsResetBtn').onclick = resetAll;

  function showThumbs() {
    $('#lsImageList').innerHTML = `
      <div style="font-weight:600;font-size:0.9rem;margin-bottom:4px">${images.length} 张图片（↑上 ↓下）</div>
      <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:6px">
        ${images.map((im,i)=>`
          <div style="flex-shrink:0;text-align:center">
            <div style="width:70px;height:52px;overflow:hidden;border-radius:6px;border:1px solid var(--border);background:var(--bg)">
              <img src="${im.img.src}" style="width:100%;height:100%;object-fit:cover">
            </div>
            <div style="font-size:0.6rem;color:var(--text-muted)">${i+1}</div>
          </div>`).join('')}
      </div>`;
  }

  // ============================
  //  MANUAL DRAG (optimized)
  // ============================
  function buildManualUI() {
    manArea.classList.remove('hidden');
    manArea.innerHTML = `
      <div style="font-weight:600;font-size:0.9rem;margin-bottom:4px">拖动蓝色分割线调整重叠</div>
      <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:8px">
        拖动 <span style="color:#3b82f6;font-weight:600">蓝色线</span> 上下移动，重叠区域越大合并越紧
      </div>
      <div id="lsDragWrap" style="position:relative;overflow:auto;border:1px solid var(--border);border-radius:8px;background:#f5f5f5;max-height:500px;touch-action:none"></div>
      <div id="lsOvLabels" style="display:flex;flex-wrap:wrap;gap:10px;margin-top:6px;font-size:0.75rem;color:var(--text-secondary)"></div>`;
    setTimeout(drawManual, 100);
  }

  function getManualLayout() {
    const targetW = getTargetW();
    const scale = Math.min(1, 350 / targetW);
    const dw = Math.round(targetW * scale);
    const sh = images.map(im => Math.round(im.h * dw / im.w));
    const pos = [0];
    for (let i = 1; i < images.length; i++) {
      pos.push(pos[i-1] + sh[i-1] - Math.round(manualOverlaps[i-1] * scale));
    }
    const totalH = pos[images.length-1] + sh[images.length-1];
    return { dw, scale, sh, pos, totalH };
  }

  function drawManual() {
    const wrap = document.getElementById('lsDragWrap');
    if (!wrap) return;

    const { dw, scale, sh, pos, totalH } = getManualLayout();

    // Reuse canvas if exists, else create
    let cvs = wrap.querySelector('canvas');
    if (!cvs || cvs.width !== dw || cvs.height !== totalH) {
      cvs = document.createElement('canvas');
      cvs.width = dw; cvs.height = totalH;
      cvs.style.display = 'block';
      wrap.innerHTML = '';
      wrap.appendChild(cvs);
    }

    const ctx = cvs.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, dw, totalH);

    // Draw images
    for (let i = 0; i < images.length; i++) {
      ctx.drawImage(images[i].img, 0, pos[i], dw, sh[i]);
    }

    // Draw separator lines
    for (let i = 0; i < images.length - 1; i++) {
      const lineY = pos[i+1];
      const ovPx = Math.round(manualOverlaps[i] * scale);
      // overlap zone shade
      ctx.fillStyle = 'rgba(59,130,246,0.10)';
      ctx.fillRect(0, lineY, dw, ovPx);
      // dashed line
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2; ctx.setLineDash([6,3]);
      ctx.beginPath(); ctx.moveTo(0, lineY); ctx.lineTo(dw, lineY); ctx.stroke();
      ctx.setLineDash([]);
      // drag pill
      const px = dw/2 - 28;
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath(); ctx.roundRect(px, lineY - 9, 56, 18, 9); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('↕ 拖动', dw/2, lineY + 4);
    }

    // Bind drag if not already
    if (!wrap._bound) {
      wrap._bound = true;
      bindDragEvents(cvs, wrap);
    }

    // Update labels
    const lbl = document.getElementById('lsOvLabels');
    if (lbl) {
      lbl.innerHTML = manualOverlaps.map((o,i) =>
        `<span>图${i+1}→${i+2}: <b style="color:#3b82f6">${o}px</b> 重叠</span>`).join('');
    }
  }

  function bindDragEvents(cvs, wrap) {
    cvs.addEventListener('mousedown', e => startDrag(e, cvs, wrap));
    cvs.addEventListener('touchstart', e => startDrag(e, cvs, wrap), { passive: false });
    window.addEventListener('mousemove', e => moveDrag(e, cvs, wrap));
    window.addEventListener('touchmove', e => moveDrag(e, cvs, wrap));
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchend', endDrag);
    cvs.addEventListener('mousemove', e => hoverCursor(e, cvs, wrap));
  }

  function getEventPos(e, cvs) {
    const rect = cvs.getBoundingClientRect();
    const sx = cvs.width / rect.width;
    const sy = cvs.height / rect.height;
    if (e.touches) {
      return { x: (e.touches[0].clientX - rect.left) * sx, y: (e.touches[0].clientY - rect.top) * sy, rawY: e.touches[0].clientY };
    }
    return { x: e.offsetX * sx, y: e.offsetY * sy, rawY: e.clientY, offsetX: e.offsetX, offsetY: e.offsetY };
  }

  function startDrag(e, cvs, wrap) {
    const { y, rawY } = getEventPos(e, cvs);
    const { sh, pos } = getManualLayout();

    for (let i = 0; i < images.length - 1; i++) {
      const lineY = pos[i+1];
      if (Math.abs(y - lineY) < 20) {
        dragState = {
          idx: i,
          startY: rawY,
          startO: manualOverlaps[i],
          maxO: Math.min(images[i].h, images[i+1].h)
        };
        cvs.style.cursor = 'grabbing';
        e.preventDefault();
        return;
      }
    }
  }

  function moveDrag(e, cvs, wrap) {
    if (!dragState) return;
    const { rawY } = getEventPos(e, cvs);
    const dy = rawY - dragState.startY;
    const scale = getManualLayout().scale;
    const newO = Math.round(Math.max(0, Math.min(dragState.maxO, dragState.startO - dy / scale)));
    if (newO !== manualOverlaps[dragState.idx]) {
      manualOverlaps[dragState.idx] = newO;
      // Use requestAnimationFrame to avoid excessive redraws
      if (!pendingUpdate) {
        pendingUpdate = true;
        rafId = requestAnimationFrame(() => {
          drawManual();
          pendingUpdate = false;
          rafId = null;
        });
      }
    }
  }

  function endDrag() {
    if (dragState && $('#lsDragWrap canvas')) {
      $('#lsDragWrap canvas').style.cursor = 'default';
    }
    dragState = null;
    // Final draw to ensure latest state
    if (pendingUpdate) {
      cancelAnimationFrame(rafId);
      drawManual();
      pendingUpdate = false;
      rafId = null;
    }
  }

  function hoverCursor(e, cvs, wrap) {
    if (dragState) return;
    const { y } = getEventPos(e, cvs);
    const { pos } = getManualLayout();
    let near = false;
    for (let i = 0; i < images.length - 1; i++) {
      if (Math.abs(y - pos[i+1]) < 20) { near = true; break; }
    }
    cvs.style.cursor = near ? 'ns-resize' : 'default';
  }

  // ============================
  //  AUTO DETECT OVERLAP
  // ============================
  function detectOverlap(ctx1, h1, ctx2, h2, w) {
    // Find where the bottom of image1 appears at the top of image2
    // Compare the bottom 40% of image1 with sliding window in top 60% of image2
    const maxO = Math.round(Math.min(h1, h2) * 0.6);
    const minO = Math.max(5, Math.round(h1 * 0.02));
    if (maxO <= minO) return { overlap: 0, confidence: 0 };

    // Take a signature strip from bottom of image1
    const sigH = Math.min(60, maxO);
    const x0 = Math.round(w * 0.15);
    const x1 = Math.round(w * 0.85);
    const sw = x1 - x0;

    // Build signature: average grayscale per row in bottom sigH rows of image1
    const sig = []; // array of {row, gray[]}
    for (let dy = 0; dy < sigH; dy++) {
      const d = ctx1.getImageData(x0, h1 - sigH + dy, sw, 1).data;
      let sum = 0;
      for (let x = 0; x < sw * 4; x += 4) {
        sum += 0.299 * d[x] + 0.587 * d[x+1] + 0.114 * d[x+2];
      }
      sig.push(sum / (sw));
    }

    // Slide the signature down the top of image2, find best match
    let bestO = 0, bestErr = Infinity;

    for (let o = minO; o <= maxO; o++) {
      let err = 0;
      const step = Math.max(1, Math.floor(sigH / 40)); // compare up to 40 rows
      for (let dy = 0; dy < sigH; dy += step) {
        const d2 = ctx2.getImageData(x0, o - sigH + dy, sw, 1).data;
        let sum2 = 0;
        for (let x = 0; x < sw * 4; x += 4) {
          sum2 += 0.299 * d2[x] + 0.587 * d2[x+1] + 0.114 * d2[x+2];
        }
        err += Math.abs(sig[dy] - sum2 / sw);
      }
      const avgErr = err / Math.ceil(sigH / step);
      if (avgErr < bestErr) { bestErr = avgErr; bestO = o; }
    }

    // Accept if error < 40 (on 0-255 scale, this is ~15% difference)
    if (bestErr > 40) return { overlap: 0, confidence: 0 };
    const conf = Math.round(Math.max(0, (1 - bestErr / 40) * 100));
    return { overlap: bestO, confidence: conf };
  }

  function getTargetW() {
    const v = document.getElementById('lsWidth')?.value || 'auto';
    return v === 'auto' ? Math.max(...images.map(i=>i.w)) : parseInt(v);
  }

  async function doAuto() {
    const targetW = getTargetW();

    // Scale images to target width
    const scaled = images.map(im => {
      const c = document.createElement('canvas');
      c.width = targetW;
      c.height = Math.round(im.h * targetW / im.w);
      c.getContext('2d').drawImage(im.img, 0, 0, targetW, c.height);
      return c;
    });

    progress.classList.remove('hidden');
    pText.classList.remove('hidden');
    const bar = progress.querySelector('.progress-bar-fill');

    overlapResults = [];
    let totalH = scaled[0].height;

    for (let i = 0; i < scaled.length - 1; i++) {
      pText.textContent = `检测第 ${i+1}/${scaled.length-1} 组重叠...`;
      bar.style.width = (20 + (i/(scaled.length-1))*50) + '%';
      await new Promise(r => setTimeout(r, 50));

      const c1 = scaled[i], c2 = scaled[i+1];
      const res = detectOverlap(
        c1.getContext('2d'), c1.height,
        c2.getContext('2d'), c2.height,
        targetW
      );
      overlapResults.push(res);
      totalH += scaled[i+1].height - res.overlap;

      pText.textContent = res.overlap > 0
        ? `✓ 图${i+1}→${i+2}: ${res.overlap}px 重叠 (${res.confidence}%)`
        : `图${i+1}→${i+2}: 未检测到重叠`;
      await new Promise(r => setTimeout(r, 400));
    }

    pText.textContent = '渲染中...';
    bar.style.width = '85%';
    await new Promise(r => setTimeout(r, 50));

    renderResult(targetW, totalH, scaled);
  }

  function doManual() {
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
    for (let i = 0; i < scaled.length-1; i++) totalH += scaled[i+1].height - manualOverlaps[i];
    renderResult(targetW, totalH, scaled);
  }

  function doNone() {
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
  }

  function renderResult(targetW, totalH, scaled) {
    progress.classList.add('hidden');
    pText.classList.add('hidden');
    manArea.classList.add('hidden');
    resultArea.classList.remove('hidden');

    const cvs = document.createElement('canvas');
    cvs.width = targetW; cvs.height = totalH;
    const ctx = cvs.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, targetW, totalH);

    let y = 0;
    for (let i = 0; i < images.length; i++) {
      ctx.drawImage(scaled[i], 0, y);
      y += scaled[i].height;
      if (i < images.length-1) y -= overlapResults[i].overlap;
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

      ovInfo.innerHTML = overlapResults.map((r,i) => {
        const ovTxt = r.overlap > 0 ? `<b style="color:#3b82f6">${r.overlap}px</b> 重叠` : '无重叠';
        return `图${i+1}→${i+2}: ${ovTxt}` + (r.confidence ? ` (置信度 ${r.confidence}%)` : '');
      }).join('<br>');

      Utils.toast(`完成: ${targetW}×${totalH}px`, 'success');
    }, 'image/png');
  }

  // ===== Buttons =====
  $('#lsStitchBtn').onclick = () => {
    if (modeSel.value === 'manual') doManual();
    else if (modeSel.value === 'none') doNone();
    else doAuto();
  };

  $('#lsDownload').onclick = () => {
    if (!resultBlob) return;
    Utils.download(resultBlob, '长截图_' + new Date().toISOString().slice(0,10) + '.png');
  };

  $('#lsCopy').onclick = async () => {
    if (!resultBlob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': resultBlob })]);
      Utils.toast('已复制', 'success');
    } catch(e) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(resultBlob);
      a.download = '长截图.png'; a.click();
    }
  };

  function resetAll() {
    images = []; overlapResults = []; manualOverlaps = []; resultBlob = null; dragState = null;
    drop.classList.remove('hidden');
    $('#lsImageList').classList.add('hidden');
    optsDiv.classList.add('hidden');
    actions.classList.add('hidden');
    manArea.classList.add('hidden');
    resultArea.classList.add('hidden');
    progress.classList.add('hidden');
    pText.classList.add('hidden');
  }
}

function Tool_long_screenshot_deactivate() {}
