// ===== 长截图拼接 v5 — 极简可靠 =====
// 设计参考: PicSew / Tailor 等成熟拼接工具
function Tool_long_screenshot(container) {
  let images = [];        // HTMLImageElement[]
  let overlaps = [];      // number[] 每对重叠像素
  let targetW = 0;

  container.innerHTML = `
    <div id="lsStep1">
      <div class="drop-zone" id="lsDrop">
        <div class="drop-zone-icon">📐</div>
        <div class="drop-zone-text">点击或拖拽选择图片（2张以上）</div>
        <div class="drop-zone-hint">按从上到下的顺序，截图中重复的画面将自动识别合并</div>
      </div>
    </div>
    <div id="lsStep2" class="hidden">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:8px;flex-wrap:wrap">
        <span style="font-weight:600;font-size:0.95rem">${images.length||0} 张图片</span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm" id="lsAutoBtn">🔍 自动检测重叠</button>
          <button class="btn btn-secondary btn-sm" id="lsReset2Btn">重新选择</button>
        </div>
      </div>
      <div id="lsPairs" style="margin-bottom:12px"></div>
      <div style="text-align:center;margin-bottom:10px">
        <canvas id="lsPreview" style="max-width:100%;height:auto;border:1px solid var(--border);border-radius:8px"></canvas>
      </div>
      <div style="display:flex;justify-content:flex-end;align-items:flex-end;gap:10px;flex-wrap:wrap">
        <div class="form-group" style="max-width:120px">
          <label>输出宽度</label>
          <select id="lsWidthSel">
            <option value="auto">自动</option>
            <option value="1080">1080px</option>
            <option value="750">750px</option>
          </select>
        </div>
        <button class="btn btn-primary" id="lsExportBtn">📥 导出长图</button>
      </div>
    </div>
    <div id="lsStep3" class="hidden">
      <div style="text-align:center">
        <canvas id="lsResult" style="max-width:100%;height:auto;border:1px solid var(--border);border-radius:8px"></canvas>
      </div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:10px">
        <button class="btn btn-primary" id="lsDlBtn">下载 PNG</button>
        <button class="btn btn-secondary" id="lsCopyBtn">复制</button>
        <button class="btn btn-secondary" id="lsBackBtn">← 返回调整</button>
      </div>
    </div>
  `;

  const $ = s => container.querySelector(s);

  // ---- File loading ----
  $('#lsDrop').onclick = async () => {
    const f = await Utils.pickFiles('image/*', true);
    if (f?.length >= 2) loadFiles(Array.from(f));
    else if (f?.length) Utils.toast('至少选2张', 'error');
  };
  $('#lsDrop').ondragover = e => { e.preventDefault(); $('#lsDrop').classList.add('drag-over'); };
  $('#lsDrop').ondragleave = () => $('#lsDrop').classList.remove('drag-over');
  $('#lsDrop').ondrop = e => {
    e.preventDefault(); $('#lsDrop').classList.remove('drag-over');
    if (e.dataTransfer.files.length) loadFiles(Array.from(e.dataTransfer.files));
  };

  async function loadFiles(files) {
    images = [];
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      const img = new Image();
      img.src = URL.createObjectURL(f);
      await new Promise(r => img.onload = r);
      images.push(img);
    }
    if (images.length < 2) { Utils.toast('至少选2张', 'error'); return; }
    if (images.length > 10) images = images.slice(0, 10);

    overlaps = new Array(images.length - 1).fill(0);
    targetW = getTargetW();
    $('#lsStep1').classList.add('hidden');
    $('#lsStep2').classList.remove('hidden');
    $('#lsStep3').classList.add('hidden');
    refreshUI();
  }

  function getTargetW() {
    const v = $('#lsWidthSel')?.value || 'auto';
    return v === 'auto' ? Math.max(...images.map(i => i.naturalWidth)) : parseInt(v);
  }

  function scaledH(i) {
    return Math.round(images[i].naturalHeight * targetW / images[i].naturalWidth);
  }

  // ---- Build pair sliders ----
  function buildPairs() {
    const div = $('#lsPairs');
    div.innerHTML = '';
    for (let i = 0; i < overlaps.length; i++) {
      const max = Math.min(scaledH(i), scaledH(i+1));
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:8px 10px;background:var(--bg);border-radius:6px;font-size:0.82rem';
      wrap.innerHTML = `
        <span style="color:var(--text-secondary);white-space:nowrap;min-width:48px">图${i+1}→${i+2}</span>
        <input type="range" min="0" max="${max}" value="${overlaps[i]}" step="1"
          style="flex:1;accent-color:var(--cat-pdf);height:4px"
          data-idx="${i}">
        <input type="number" min="0" max="${max}" value="${overlaps[i]}" step="10"
          style="width:72px;padding:4px 6px;text-align:right;border:1px solid var(--border);border-radius:4px;background:var(--bg-input);color:var(--text);font-size:0.8rem;font-family:monospace"
          data-idx="${i}">
        <span style="color:var(--text-muted);font-size:0.7rem;min-width:20px">px</span>`;
      div.appendChild(wrap);
    }
    // Bind
    div.querySelectorAll('input[type="range"]').forEach(slider => {
      slider.oninput = () => {
        const idx = +slider.dataset.idx;
        overlaps[idx] = +slider.value;
        const num = div.querySelector(`input[type="number"][data-idx="${idx}"]`);
        if (num) num.value = overlaps[idx];
        drawPreview();
      };
    });
    div.querySelectorAll('input[type="number"]').forEach(num => {
      num.oninput = () => {
        const idx = +num.dataset.idx;
        overlaps[idx] = +num.value || 0;
        const slider = div.querySelector(`input[type="range"][data-idx="${idx}"]`);
        if (slider) slider.value = overlaps[idx];
        drawPreview();
      };
    });
  }

  // ---- Preview ----
  function drawPreview() {
    const previewScale = Math.min(1, 500 / targetW);
    const pw = Math.round(targetW * previewScale);
    const sh = images.map((_, i) => Math.round(scaledH(i) * previewScale));
    const ov = overlaps.map(o => Math.round(o * previewScale));

    const pos = [0];
    for (let i = 1; i < images.length; i++) pos.push(pos[i-1] + sh[i-1] - (ov[i-1] || 0));
    const ph = pos[images.length-1] + sh[images.length-1];

    const cvs = document.createElement('canvas');
    cvs.width = pw; cvs.height = ph;
    const ctx = cvs.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, pw, ph);
    for (let i = 0; i < images.length; i++) ctx.drawImage(images[i], 0, pos[i], pw, sh[i]);
    for (let i = 0; i < overlaps.length; i++) {
      if (ov[i] > 0) {
        ctx.fillStyle = 'rgba(59,130,246,0.1)';
        ctx.fillRect(0, pos[i+1], pw, ov[i]);
      }
      ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(0, pos[i+1]); ctx.lineTo(pw, pos[i+1]); ctx.stroke();
      ctx.setLineDash([]);
    }

    const display = $('#lsPreview');
    display.style.width = Math.min(pw, 500) + 'px';
    display.style.height = 'auto';
    display.width = pw; display.height = ph;
    display.getContext('2d').drawImage(cvs, 0, 0);
  }

  // ---- Auto detect ----
  $('#lsAutoBtn').onclick = async () => {
    const btn = $('#lsAutoBtn');
    btn.textContent = '⏳ 检测中...'; btn.disabled = true;

    // Small canvas for fast comparison
    const sw = 200;
    const small = images.map(im => {
      const c = document.createElement('canvas');
      c.width = sw;
      c.height = Math.round(im.naturalHeight * sw / im.naturalWidth);
      c.getContext('2d').drawImage(im, 0, 0, sw, c.height);
      return c;
    });

    let found = 0;
    for (let i = 0; i < small.length - 1; i++) {
      const ctxA = small[i].getContext('2d');
      const ctxB = small[i+1].getContext('2d');
      const hA = small[i].height, hB = small[i+1].height;

      // Build row signatures (average grayscale)
      const sig = (ctx, h) => {
        const r = [];
        for (let y = 0; y < h; y++) {
          const d = ctx.getImageData(0, y, sw, 1).data;
          let s = 0;
          for (let x = 0; x < sw * 4; x += 4) s += d[x]*0.299 + d[x+1]*0.587 + d[x+2]*0.114;
          r.push(s / sw);
        }
        return r;
      };
      const sA = sig(ctxA, hA), sB = sig(ctxB, hB);

      // Find best overlap: compare last N rows of A with first N rows of B
      const maxO = Math.min(hA, hB);
      const minO = Math.max(3, Math.round(hA * 0.03));
      let best = 0, bestErr = 1e9;

      for (let o = minO; o <= maxO; o++) {
        let e = 0;
        const step = Math.max(1, Math.floor(o / 25));
        for (let dy = 0; dy < o; dy += step) e += Math.abs(sA[hA - o + dy] - sB[dy]);
        const avg = e / Math.ceil(o / step);
        if (avg < bestErr) { bestErr = avg; best = o; }
      }

      // Convert back, threshold 15
      if (bestErr < 15) {
        overlaps[i] = Math.round(best * targetW / sw);
        found++;
      } else {
        overlaps[i] = 0;
      }
    }

    // Update UI
    document.querySelectorAll('#lsPairs input[type="range"]').forEach((s, i) => {
      s.value = overlaps[i];
      const n = document.querySelectorAll('#lsPairs input[type="number"]')[i];
      if (n) n.value = overlaps[i];
    });
    drawPreview();
    btn.textContent = '🔍 自动检测重叠';
    btn.disabled = false;
    Utils.toast(found ? `检测到 ${found}/${overlaps.length} 处重叠` : '未检测到重叠，可手动调节', found ? 'success' : 'info');
  };

  // ---- Export ----
  $('#lsExportBtn').onclick = () => {
    const totalH = scaledH(0) + overlaps.reduce((sum, ov, i) => sum + scaledH(i+1) - ov, 0);
    const cvs = document.createElement('canvas');
    cvs.width = targetW; cvs.height = totalH;
    const ctx = cvs.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, targetW, totalH);
    let y = 0;
    for (let i = 0; i < images.length; i++) {
      const h = scaledH(i);
      ctx.drawImage(images[i], 0, y, targetW, h);
      y += h;
      if (i < overlaps.length) y -= overlaps[i];
    }
    cvs.toBlob(blob => {
      $('#lsStep2').classList.add('hidden');
      $('#lsStep3').classList.remove('hidden');
      $('#lsResult').width = targetW; $('#lsResult').height = totalH;
      $('#lsResult').style.maxWidth = Math.min(targetW, 600) + 'px';
      $('#lsResult').style.height = 'auto';
      $('#lsResult').getContext('2d').drawImage(cvs, 0, 0);
      $('#lsResult')._blob = blob;
    }, 'image/png');
  };

  // ---- Buttons ----
  $('#lsWidthSel').onchange = () => {
    targetW = getTargetW();
    buildPairs();
    drawPreview();
  };
  $('#lsReset2Btn').onclick = () => {
    images = []; overlaps = [];
    $('#lsStep1').classList.remove('hidden');
    $('#lsStep2').classList.add('hidden');
    $('#lsStep3').classList.add('hidden');
  };
  $('#lsDlBtn').onclick = () => {
    const b = $('#lsResult')._blob;
    if (b) Utils.download(b, '长截图_' + new Date().toISOString().slice(0,10) + '.png');
  };
  $('#lsCopyBtn').onclick = async () => {
    const b = $('#lsResult')._blob;
    if (!b) return;
    try { await navigator.clipboard.write([new ClipboardItem({'image/png': b})]); }
    catch(e) { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'long.png'; a.click(); }
  };
  $('#lsBackBtn').onclick = () => {
    $('#lsStep3').classList.add('hidden');
    $('#lsStep2').classList.remove('hidden');
  };

  function refreshUI() {
    buildPairs();
    drawPreview();
  }
}

function Tool_long_screenshot_deactivate() {}
