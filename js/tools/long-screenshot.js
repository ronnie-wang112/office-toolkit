// ===== 长截图拼接 — 重构版：行签名 + 互相关检测重合区域 =====
function Tool_long_screenshot(container) {
  let images = [];
  let overlaps = [];     // overlaps[i] = 图i和图i+1之间的重合像素数
  let w = 0, hs = [];    // 统一宽度、各图高度
  const SAMPLE_W = 600;  // 分析时的统一宽度

  const html = `
    <div id="lsStep1">
      <div class="drop-zone" id="lsDrop">
        <div class="drop-zone-icon">📐</div><div class="drop-zone-text">选择截图（2张以上，从上到下排列）</div>
        <div class="drop-zone-hint">重叠区域将自动检测并合并。也支持拖拽手动调整。</div>
      </div>
    </div>
    <div id="lsStep2" class="hidden">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <button class="btn btn-secondary btn-sm" id="lsBack2">← 重新选图</button>
        <button class="btn btn-primary btn-sm" id="lsAutoBtn">🔍 自动检测重叠</button>
        <span style="font-size:0.78rem;color:var(--text-muted);margin-left:auto" id="lsStatus">共 ${images.length} 张</span>
      </div>
      <div id="lsPairs"></div>
      <div style="text-align:center;margin-top:12px;border-radius:8px;overflow:auto;background:var(--bg-card);border:1px solid var(--border);padding:8px">
        <canvas id="lsPrev" style="max-width:100%;height:auto;display:block;margin:0 auto"></canvas>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary" id="lsExport">📥 导出长图</button>
      </div>
    </div>
    <div id="lsStep3" class="hidden" style="text-align:center">
      <canvas id="lsResult" style="max-width:100%;height:auto;border:1px solid var(--border);border-radius:8px"></canvas>
      <div style="margin-top:10px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary" id="lsDl">💾 下载</button>
        <button class="btn btn-secondary" id="lsCopy">📋 复制</button>
        <button class="btn btn-secondary" id="lsBack3">← 返回调整</button>
      </div>
    </div>`;

  container.innerHTML = html;
  const $ = s => container.querySelector(s);

  // ── 工具函数 ──

  function recalcDims() {
    w = Math.max(...images.map(i => i.naturalWidth));
    hs = images.map(i => Math.round(i.naturalHeight * w / i.naturalWidth));
  }

  function dimsAtScale(scaleW) {
    if (!images.length) return { w: 0, hs: [] };
    const sw = Math.max(...images.map(i => i.naturalWidth));
    const shs = images.map(i => Math.round(i.naturalHeight * scaleW / i.naturalWidth));
    return { w: scaleW, hs: shs };
  }

  // ── Picsew 风格：5带像素级比较 + 投票机制 ──
  // 在图片 A 底部和图片 B 顶部提取多个像素条带，
  // 每个条带独立计算 MSE，投票决定是否有重叠
  function findOverlap(imgA, imgB) {
    const ANALYSIS_W = 400;
    const idxA = images.indexOf(imgA);
    const idxB = images.indexOf(imgB);
    const hA = Math.round(imgA.naturalHeight * ANALYSIS_W / imgA.naturalWidth);
    const hB = Math.round(imgB.naturalHeight * ANALYSIS_W / imgB.naturalWidth);

    // 绘制到 canvas 以便像素级比较
    function getCanvas(img, targetW, targetH) {
      const cv = document.createElement('canvas');
      cv.width = targetW; cv.height = targetH;
      cv.getContext('2d').drawImage(img, 0, 0, targetW, targetH);
      return cv;
    }
    const ca = getCanvas(imgA, ANALYSIS_W, hA);
    const cb = getCanvas(imgB, ANALYSIS_W, hB);
    const pa = ca.getContext('2d').getImageData(0, 0, ANALYSIS_W, hA).data;
    const pb = cb.getContext('2d').getImageData(0, 0, ANALYSIS_W, hB).data;

    const maxOverlap = Math.min(hA, hB);
    const minOverlap = Math.max(10, Math.round(maxOverlap * 0.02));
    const searchLen = Math.min(maxOverlap, Math.round(Math.min(hA, hB) * 0.85));

    const BANDS = 5;
    const BAND_H = 30;          // 每个条带高度
    const MSE_TOLERANCE = 1200; // 归一化 MSE 阈值

    let bestO = 0;
    let bestVotes = 0;
    let bestTotalMSE = Infinity;

    // 像素比较函数：比较 A 中 y1 开始和 B 中 y2 开始的 h 行
    function bandMSE(y1, y2, h) {
      let sumSq = 0, count = 0;
      for (let dy = 0; dy < h; dy++) {
        const rA = (y1 + dy) * ANALYSIS_W * 4;
        const rB = (y2 + dy) * ANALYSIS_W * 4;
        for (let x = 0; x < ANALYSIS_W; x += 2) { // 每隔 1 像素采样
          const iA = rA + x * 4;
          const iB = rB + x * 4;
          const dr = pa[iA] - pb[iB];
          const dg = pa[iA + 1] - pb[iB + 1];
          const db = pa[iA + 2] - pb[iB + 2];
          sumSq += dr * dr + dg * dg + db * db;
          count += 3;
        }
      }
      return count > 0 ? sumSq / count : Infinity;
    }

    // 遍历所有可能的 overlap
    for (let o = minOverlap; o <= searchLen; o += 4) {
      let votes = 0;
      let totalMSE = 0;

      for (let b = 0; b < BANDS; b++) {
        // 条带位置按比例分布在整个重叠区域内
        const bandCenter = Math.round(o * (b + 1) / (BANDS + 1));
        let y1 = hA - o + bandCenter - Math.floor(BAND_H / 2);
        let y2 = bandCenter - Math.floor(BAND_H / 2);
        // 边界钳制
        y1 = Math.max(0, Math.min(hA - BAND_H, y1));
        y2 = Math.max(0, Math.min(hB - BAND_H, y2));

        const mse = bandMSE(y1, y2, BAND_H);
        totalMSE += mse;
        if (mse < MSE_TOLERANCE) votes++;
      }

      if (votes > bestVotes || (votes === bestVotes && totalMSE < bestTotalMSE)) {
        bestVotes = votes;
        bestO = o;
        bestTotalMSE = totalMSE;
      }
    }

    // 投票机制：需要 >= 4/5 条带一致（Picsew 用 75%，即 4/5）
    if (bestVotes < 4) {
      return { overlap: 0, confidence: 0, votes: bestVotes };
    }

    // 置信度基于投票数
    const confidence = bestVotes === 5 ? 0.9 : bestVotes === 4 ? 0.7 : 0.5;

    // 缩放回原始像素坐标
    const origOverlap = Math.round(bestO * Math.max(...images.map(i=>i.naturalWidth)) / ANALYSIS_W);
    return { overlap: origOverlap, confidence, votes: bestVotes };
  }

  // ── 自动检测所有重合 ──
  async function autoDetect() {
    const btn = $('#lsAutoBtn');
    btn.textContent = '⏳ 分析中...';
    btn.disabled = true;
    $('#lsStatus').textContent = '正在检测重合区域...';

    // 用 setTimeout 让 UI 先刷新
    await new Promise(r => setTimeout(r, 60));

    let found = 0;
    for (let i = 0; i < images.length - 1; i++) {
      $('#lsStatus').textContent = `分析第 ${i + 1}/${images.length - 1} 组重合区域...`;
      await new Promise(r => setTimeout(r, 10)); // 让 UI 呼吸

      const result = findOverlap(images[i], images[i + 1]);
      if (result.confidence >= 0.4) {
        overlaps[i] = result.overlap;
        found++;
      } else {
        overlaps[i] = 0;
      }
    }

    btn.textContent = '🔍 自动检测重叠';
    btn.disabled = false;

    const msg = found > 0
      ? `检测到 ${found} 处重合（置信度: ${found === images.length - 1 ? '高' : '部分'}），可拖动滑块微调`
      : '未检测到明显重合，请手动拖动滑块调整';
    $('#lsStatus').textContent = `${msg}`;
    Utils.toast(msg, found > 0 ? 'success' : 'info');

    renderSliders();
    drawPreview();
  }

  // ── 渲染滑块 ──
  function renderSliders() {
    const maxOvs = [];
    for (let i = 0; i < images.length - 1; i++) {
      maxOvs.push(Math.min(hs[i], hs[i + 1]));
    }
    // clamp
    overlaps = overlaps.map((o, i) => Math.min(o, maxOvs[i]));

    const wInfo = images.map((img, i) =>
      `<span style="font-size:0.72rem;color:var(--text-muted)">图${i + 1}: ${img.naturalWidth}×${img.naturalHeight}</span>`
    ).join('');

    $('#lsPairs').innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px">${wInfo}</div>
      ${overlaps.map((ov, i) => `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;margin-bottom:6px;font-size:0.82rem">
          <span style="color:var(--text-muted);min-width:56px;font-weight:600">图${i + 1}↔${i + 2}</span>
          <input type="range" min="0" max="${maxOvs[i]}" value="${ov}"
            class="ls-r" data-i="${i}"
            style="flex:1;accent-color:var(--cat-pdf);height:6px">
          <span class="ls-v" style="min-width:52px;text-align:right;font-weight:600;color:var(--cat-pdf);font-variant-numeric:tabular-nums">${ov}px</span>
        </div>`).join('')}`;

    // 滑块事件 — 用 rAF 节流更新预览
    let rafId = null;
    $('#lsPairs').querySelectorAll('.ls-r').forEach(r => {
      r.addEventListener('input', () => {
        overlaps[+r.dataset.i] = +r.value;
        $('#lsPairs').querySelectorAll('.ls-v')[+r.dataset.i].textContent = overlaps[+r.dataset.i] + 'px';
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => { drawPreview(); rafId = null; });
      });
    });
  }

  // ── 预览 ──
  function drawPreview() {
    if (!images.length) return;
    const PREV_W = 400;
    const scale = PREV_W / w;

    const phs = hs.map(h => Math.round(h * scale));
    const ovs = overlaps.map(o => Math.round(o * scale));

    // 可见高度 = 每张图高度减去顶部被覆盖部分
    const vh = phs.map((ph, i) => i === 0 ? ph : ph - ovs[i - 1]);
    const totalH = vh.reduce((a, b) => a + b, 0);

    // 每张图起始 y 位置
    let y = 0;
    const pos = vh.map(v => { const p = y; y += v; return p; });

    const cv = document.createElement('canvas');
    cv.width = PREV_W;
    cv.height = totalH;
    const cx = cv.getContext('2d');
    cx.fillStyle = '#fff';
    cx.fillRect(0, 0, PREV_W, totalH);

    for (let i = 0; i < images.length; i++) {
      const srcY = i > 0 ? ovs[i - 1] : 0;
      const srcH = phs[i] - srcY;
      cx.drawImage(images[i], 0, srcY, PREV_W, srcH, 0, pos[i], PREV_W, vh[i]);
    }

    // 高亮重合区域
    for (let i = 0; i < overlaps.length; i++) {
      const topY = pos[i + 1];
      if (ovs[i] > 1) {
        // 透明蓝色覆盖
        cx.fillStyle = 'rgba(37,99,235,0.12)';
        cx.fillRect(0, topY - ovs[i], PREV_W, ovs[i]);
      }
      // 接缝线
      cx.strokeStyle = '#2563eb';
      cx.lineWidth = 1.5;
      cx.setLineDash([4, 2]);
      cx.beginPath();
      cx.moveTo(0, topY);
      cx.lineTo(PREV_W, topY);
      cx.stroke();
      cx.setLineDash([]);

      // 标签
      if (overlaps[i] > 0) {
        cx.fillStyle = '#2563eb';
        cx.font = 'bold 11px system-ui, sans-serif';
        cx.fillText(`重合 ${overlaps[i]}px ↑`, 6, topY - 3);
      }
    }

    const disp = $('#lsPrev');
    disp.width = PREV_W;
    disp.height = totalH;
    disp.getContext('2d').drawImage(cv, 0, 0);
    disp.style.width = Math.min(PREV_W, 400) + 'px';
    disp.style.height = 'auto';
  }

  // ── 导出 ──
  function doExport() {
    const vh = hs.map((h, i) => i === 0 ? h : h - overlaps[i - 1]);
    const totalH = vh.reduce((a, b) => a + b, 0);

    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = totalH;
    const cx = cv.getContext('2d');
    cx.fillStyle = '#fff';
    cx.fillRect(0, 0, w, totalH);

    let y = 0;
    for (let i = 0; i < images.length; i++) {
      const srcY = i > 0 ? overlaps[i - 1] : 0;
      cx.drawImage(images[i], 0, srcY, w, hs[i] - srcY, 0, y, w, vh[i]);
      y += vh[i];
    }

    cv.toBlob(b => {
      $('#lsStep2').classList.add('hidden');
      $('#lsStep3').classList.remove('hidden');
      const rc = $('#lsResult');
      rc.width = w;
      rc.height = totalH;
      rc.style.maxWidth = Math.min(w, 500) + 'px';
      rc.style.height = 'auto';
      rc.getContext('2d').drawImage(cv, 0, 0);
      rc._blob = b;
      rc._w = w;
      rc._h = totalH;
    }, 'image/png');
  }

  // ── 加载图片 ──
  async function loadFiles(files) {
    images = [];
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      const img = new Image();
      img.src = URL.createObjectURL(f);
      await new Promise((r, rej) => { img.onload = r; img.onerror = rej; });
      images.push(img);
    }
    if (images.length < 2) {
      Utils.toast('请至少选择2张图片', 'error');
      return;
    }
    recalcDims();
    overlaps = new Array(images.length - 1).fill(0);

    $('#lsStep1').classList.add('hidden');
    $('#lsStep2').classList.remove('hidden');
    $('#lsStep3').classList.add('hidden');
    $('#lsStatus').textContent = `共 ${images.length} 张图片`;

    renderSliders();
    drawPreview();

    // 自动触发检测
    autoDetect();
  }

  // ── 事件绑定 ──

  $('#lsDrop').onclick = async () => {
    const files = await Utils.pickFiles('image/*', true);
    if (files?.length >= 2) loadFiles(Array.from(files));
  };
  $('#lsDrop').ondragover = e => { e.preventDefault(); $('#lsDrop').classList.add('drag-over'); };
  $('#lsDrop').ondragleave = () => $('#lsDrop').classList.remove('drag-over');
  $('#lsDrop').ondrop = e => {
    e.preventDefault();
    $('#lsDrop').classList.remove('drag-over');
    if (e.dataTransfer.files.length >= 2) loadFiles(Array.from(e.dataTransfer.files));
  };

  $('#lsBack2').onclick = () => {
    images = []; overlaps = [];
    $('#lsStep1').classList.remove('hidden');
    $('#lsStep2').classList.add('hidden');
    $('#lsStep3').classList.add('hidden');
  };
  $('#lsBack3').onclick = () => {
    $('#lsStep3').classList.add('hidden');
    $('#lsStep2').classList.remove('hidden');
  };

  $('#lsAutoBtn').onclick = autoDetect;
  $('#lsExport').onclick = doExport;

  $('#lsDl').onclick = () => {
    const b = $('#lsResult')._blob;
    if (b) Utils.download(b, '长截图.png');
  };
  $('#lsCopy').onclick = async () => {
    const b = $('#lsResult')._blob;
    if (!b) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]);
      Utils.toast('已复制到剪贴板', 'success');
    } catch {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = '长截图.png';
      a.click();
    }
  };
}

function Tool_long_screenshot_deactivate() {}
