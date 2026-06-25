// ===== 长截图拼接 v4 — 滑块调节 + 实时预览 =====
function Tool_long_screenshot(container) {
  let images = [];
  let overlaps = [];
  let previewCvs = null;

  const $ = s => container.querySelector(s);

  container.innerHTML = `
    <div id="lsStep1">
      <div class="drop-zone" id="lsDrop">
        <div class="drop-zone-icon">📐</div>
        <div class="drop-zone-text">选择要拼接的图片（2~10 张）</div>
        <div class="drop-zone-hint">按从上到下顺序，截图中重复的画面将自动匹配</div>
      </div>
    </div>
    <div id="lsStep2" class="hidden">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
        <div style="font-weight:600;font-size:0.95rem">${images.length} 张图片 · 调节重叠</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" id="lsAutoBtn">🔍 自动检测重叠</button>
          <button class="btn btn-secondary btn-sm" id="lsResetBtn">重新选择</button>
        </div>
      </div>
      <div id="lsSliders" style="margin-bottom:16px"></div>
      <div style="display:flex;justify-content:center;margin-bottom:16px">
        <div class="preview-container" style="max-height:420px;overflow-y:auto;width:100%">
          <canvas id="lsPreviewCvs" style="width:100%;height:auto"></canvas>
        </div>
      </div>
      <div class="form-row" style="justify-content:flex-end;align-items:center">
        <div class="form-group" style="max-width:140px">
          <label>输出宽度</label>
          <select id="lsWidth">
            <option value="auto">自动</option>
            <option value="1080">1080px</option>
            <option value="750">750px</option>
          </select>
        </div>
        <button class="btn btn-primary" id="lsExportBtn" style="margin-top:18px">导出长图</button>
      </div>
    </div>
    <div id="lsStep3" class="hidden">
      <div class="result-area">
        <div class="preview-container" style="max-height:500px;overflow-y:auto">
          <canvas id="lsResultCvs"></canvas>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn btn-primary" id="lsDownload">下载 PNG</button>
          <button class="btn btn-secondary" id="lsCopyBtn">复制到剪贴板</button>
          <button class="btn btn-secondary" id="lsBackBtn">返回调整</button>
        </div>
      </div>
    </div>
  `;

  const drop = $('#lsDrop');
  const step1 = $('#lsStep1'), step2 = $('#lsStep2'), step3 = $('#lsStep3');

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
    else if (f?.length) Utils.toast('请至少选2张', 'error');
  }

  async function loadFiles(files) {
    images = [];
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      const img = new Image();
      img.src = URL.createObjectURL(f);
      await new Promise(r => img.onload = r);
      images.push(img);
    }
    if (images.length < 2) { Utils.toast('至少2张', 'error'); return; }
    if (images.length > 10) { images = images.slice(0, 10); Utils.toast('最多10张', 'info'); }

    overlaps = new Array(images.length - 1).fill(0);
    showStep2();
    renderSliders();
    updatePreview();
  }

  function showStep2() {
    step1.classList.add('hidden');
    step2.classList.remove('hidden');
    step3.classList.add('hidden');
  }

  function getTargetW() {
    const sel = $('#lsWidth');
    const v = sel?.value || 'auto';
    return v === 'auto' ? Math.max(...images.map(i => i.naturalWidth)) : parseInt(v);
  }

  // Compute scaled heights for the target width
  function getHeights(targetW) {
    return images.map(im => Math.round(im.naturalHeight * targetW / im.naturalWidth));
  }

  // ===== Slider UI =====
  function renderSliders() {
    const div = $('#lsSliders');
    const maxOverlaps = [];
    for (let i = 0; i < images.length - 1; i++) {
      const targetW = getTargetW();
      const h1 = Math.round(images[i].naturalHeight * targetW / images[i].naturalWidth);
      const h2 = Math.round(images[i+1].naturalHeight * targetW / images[i+1].naturalWidth);
      maxOverlaps.push(Math.min(h1, h2));
    }

    div.innerHTML = overlaps.map((ov, i) => `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;padding:10px 14px;background:var(--bg);border-radius:8px">
        <span style="white-space:nowrap;font-size:0.8rem;color:var(--text-secondary);min-width:55px">图${i+1}→${i+2}</span>
        <input type="range" class="ls-slider" data-idx="${i}" min="0" max="${maxOverlaps[i]}" value="${ov}" step="1"
          style="flex:1;accent-color:var(--cat-pdf)">
        <span class="ls-ov-val" data-idx="${i}" style="min-width:60px;text-align:right;font-weight:600;font-size:0.85rem;font-variant-numeric:tabular-nums;color:var(--cat-pdf)">${ov}px</span>
      </div>
    `).join('');

    // Thumbnails
    div.insertAdjacentHTML('beforeend', `
      <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-top:8px">
        ${images.map((im,i) => `
          <div style="flex-shrink:0;text-align:center">
            <div style="width:60px;height:45px;overflow:hidden;border-radius:4px;border:1px solid var(--border);background:var(--bg)">
              <img src="${im.src}" style="width:100%;height:100%;object-fit:cover">
            </div>
            <div style="font-size:0.6rem;color:var(--text-muted)">${i+1}</div>
          </div>`).join('')}
      </div>`);

    // Bind slider events
    div.querySelectorAll('.ls-slider').forEach(slider => {
      slider.addEventListener('input', () => {
        const idx = parseInt(slider.dataset.idx);
        overlaps[idx] = parseInt(slider.value);
        // Update value display
        const valEl = div.querySelector(`.ls-ov-val[data-idx="${idx}"]`);
        if (valEl) valEl.textContent = overlaps[idx] + 'px';
        updatePreview();
      });
    });
  }

  // ===== Auto-detect =====
  $('#lsAutoBtn').addEventListener('click', async () => {
    const btn = $('#lsAutoBtn');
    btn.textContent = '⏳ 检测中...';
    btn.disabled = true;

    const targetW = getTargetW();
    const heights = getHeights(targetW);

    // Create small canvases for fast comparison
    const sw = 200; // small width for comparison
    const small = images.map((im, i) => {
      const c = document.createElement('canvas');
      c.width = sw;
      c.height = Math.round(heights[i] * sw / targetW);
      c.getContext('2d').drawImage(im, 0, 0, sw, c.height);
      return c;
    });

    for (let i = 0; i < small.length - 1; i++) {
      const c1 = small[i], c2 = small[i+1];
      const ctx1 = c1.getContext('2d'), ctx2 = c2.getContext('2d');

      // Build row signatures for bottom 60% of image1
      const maxO = Math.min(c1.height, c2.height);
      const rows1 = [];
      for (let y = 0; y < c1.height; y++) {
        const d = ctx1.getImageData(0, y, sw, 1).data;
        let sum = 0;
        for (let x = 0; x < sw * 4; x += 4) sum += 0.299*d[x] + 0.587*d[x+1] + 0.114*d[x+2];
        rows1.push(sum / sw);
      }

      // Build row signatures for image2
      const rows2 = [];
      for (let y = 0; y < c2.height; y++) {
        const d = ctx2.getImageData(0, y, sw, 1).data;
        let sum = 0;
        for (let x = 0; x < sw * 4; x += 4) sum += 0.299*d[x] + 0.587*d[x+1] + 0.114*d[x+2];
        rows2.push(sum / sw);
      }

      // Slide: compare bottom of image1 with top of image2
      let bestO = 0, bestErr = Infinity;
      const minO = Math.max(5, Math.round(c1.height * 0.02));

      for (let o = minO; o <= maxO; o++) {
        // Compare last 'o' rows of image1 with first 'o' rows of image2
        let err = 0, count = 0;
        const step = Math.max(1, Math.floor(o / 30)); // sample ~30 rows
        for (let dy = 0; dy < o; dy += step) {
          err += Math.abs(rows1[c1.height - o + dy] - rows2[dy]);
          count++;
        }
        if (count > 0) {
          const avg = err / count;
          if (avg < bestErr) { bestErr = avg; bestO = o; }
        }
      }

      // Convert back to full scale and set
      const fullScaleO = Math.round(bestO * targetW / sw);
      if (bestErr < 25) { // reasonable match
        overlaps[i] = Math.min(fullScaleO, Math.round(heights[i] * 0.8));
      } else {
        overlaps[i] = 0;
      }
    }

    // Update UI
    document.querySelectorAll('.ls-slider').forEach((slider, i) => {
      slider.value = overlaps[i];
      const valEl = document.querySelector(`.ls-ov-val[data-idx="${i}"]`);
      if (valEl) valEl.textContent = overlaps[i] + 'px';
    });
    updatePreview();

    btn.textContent = '🔍 自动检测重叠';
    btn.disabled = false;

    const found = overlaps.filter(o => o > 0).length;
    Utils.toast(found > 0 ? `检测到 ${found} 处重叠` : '未检测到重叠，请手动调整', 'info');
  });

  // ===== Live preview =====
  function updatePreview() {
    const targetW = getTargetW();
    const heights = getHeights(targetW);
    const scale = Math.min(1, 500 / targetW);
    const dw = Math.round(targetW * scale);
    const sh = heights.map(h => Math.round(h * scale));
    const ovScaled = overlaps.map(o => Math.round(o * scale));

    let y = 0;
    const positions = [0];
    for (let i = 1; i < images.length; i++) {
      y += sh[i-1] - ovScaled[i-1];
      positions.push(y);
    }
    const totalH = y + sh[images.length-1];

    const cvs = document.createElement('canvas');
    cvs.width = dw; cvs.height = totalH;
    const ctx = cvs.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, dw, totalH);

    for (let i = 0; i < images.length; i++) {
      ctx.drawImage(images[i], 0, positions[i], dw, sh[i]);
    }

    // Draw overlap markers
    for (let i = 0; i < images.length - 1; i++) {
      const lineY = positions[i+1];
      if (ovScaled[i] > 0) {
        ctx.fillStyle = 'rgba(59,130,246,0.12)';
        ctx.fillRect(0, lineY, dw, ovScaled[i]);
      }
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(0, lineY); ctx.lineTo(dw, lineY); ctx.stroke();
      ctx.setLineDash([]);
    }

    previewCvs = cvs;
    const display = $('#lsPreviewCvs');
    if (display) {
      display.width = dw;
      display.height = totalH;
      display.getContext('2d').drawImage(cvs, 0, 0);
      display.style.width = '100%';
      display.style.height = 'auto';
    }
  }

  // ===== Width change =====
  $('#lsWidth').addEventListener('change', () => {
    // Recalculate max values for sliders
    const targetW = getTargetW();
    const heights = getHeights(targetW);
    document.querySelectorAll('.ls-slider').forEach((slider, i) => {
      const maxO = Math.min(heights[i], heights[i+1]);
      slider.max = maxO;
      if (parseInt(slider.value) > maxO) {
        slider.value = maxO;
        overlaps[i] = maxO;
        const valEl = document.querySelector(`.ls-ov-val[data-idx="${i}"]`);
        if (valEl) valEl.textContent = maxO + 'px';
      }
    });
    updatePreview();
  });

  // ===== Export =====
  $('#lsExportBtn').addEventListener('click', () => {
    const targetW = getTargetW();
    const heights = getHeights(targetW);
    let totalH = heights[0];
    for (let i = 0; i < overlaps.length; i++) totalH += heights[i+1] - overlaps[i];

    const cvs = document.createElement('canvas');
    cvs.width = targetW; cvs.height = totalH;
    const ctx = cvs.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, targetW, totalH);

    let y = 0;
    for (let i = 0; i < images.length; i++) {
      const h = heights[i];
      ctx.drawImage(images[i], 0, y, targetW, h);
      y += h;
      if (i < overlaps.length) y -= overlaps[i];
    }

    cvs.toBlob(blob => {
      step2.classList.add('hidden');
      step3.classList.remove('hidden');
      const rcvs = $('#lsResultCvs');
      rcvs.width = targetW;
      rcvs.height = totalH;
      rcvs.getContext('2d').drawImage(cvs, 0, 0);
      rcvs.style.width = '100%';
      rcvs.style.height = 'auto';
      rcvs.style.maxWidth = '600px';

      // Store blob for download
      rcvs._blob = blob;
      Utils.toast(`长图: ${targetW}×${totalH}px`, 'success');
    }, 'image/png');
  });

  // ===== Download / Copy =====
  $('#lsDownload').addEventListener('click', () => {
    const blob = $('#lsResultCvs')._blob;
    if (blob) Utils.download(blob, '长截图_' + new Date().toISOString().slice(0,10) + '.png');
  });

  $('#lsCopyBtn').addEventListener('click', async () => {
    const blob = $('#lsResultCvs')._blob;
    if (!blob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      Utils.toast('已复制', 'success');
    } catch(e) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '长截图.png'; a.click();
    }
  });

  $('#lsBackBtn').addEventListener('click', () => {
    step3.classList.add('hidden');
    step2.classList.remove('hidden');
  });

  $('#lsResetBtn').addEventListener('click', () => {
    images = []; overlaps = [];
    step1.classList.remove('hidden');
    step2.classList.add('hidden');
    step3.classList.add('hidden');
  });
}

function Tool_long_screenshot_deactivate() {}
