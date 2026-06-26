// ===== 长截图拼接 — Picsew 5带像素投票 + 智能去页头页尾 =====
function Tool_long_screenshot(container) {
  let images = [];
  let overlaps = [];     // overlaps[i] = 图i和图i+1之间的重合像素数（内容区）
  let w = 0, hs = [];    // 统一宽度、各图高度
  let headerH = 0;       // 检测到的页头高度（像素）
  let footerH = 0;       // 检测到的页尾高度（像素）
  let dedupEnabled = true; // 是否启用智能去重头尾

  const html = `
    <div id="lsStep1">
      <div class="drop-zone" id="lsDrop">
        <div class="drop-zone-icon">📐</div><div class="drop-zone-text">选择截图（2张以上，从上到下排列）</div>
        <div class="drop-zone-hint">支持网页长截图：自动识别并去除重复的页头页尾</div>
      </div>
    </div>
    <div id="lsStep2" class="hidden">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" id="lsBack2">← 重新选图</button>
        <button class="btn btn-primary btn-sm" id="lsAutoBtn">🔍 自动检测重叠</button>
        <label id="lsDedupLabel" style="display:flex;align-items:center;gap:4px;font-size:0.78rem;color:var(--text-muted);cursor:pointer;margin-left:auto">
          <input type="checkbox" id="lsDedup" checked style="accent-color:var(--cat-pdf)">
          智能去重头尾
        </label>
        <span style="font-size:0.78rem;color:var(--text-muted)" id="lsStatus">共 0 张</span>
      </div>
      <div id="lsHeaderFooterInfo" style="display:none;font-size:0.75rem;color:var(--cat-pdf);margin-bottom:6px;padding:4px 10px;background:var(--bg-card);border-radius:6px;border:1px solid var(--border)"></div>
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

  // 内容区起始/结束行（排除头尾后）
  function contentRange(i) {
    if (!dedupEnabled) return { start: 0, end: hs[i] };
    const hh = Math.min(headerH, Math.floor(hs[i] * 0.4));
    const fh = Math.min(footerH, Math.floor(hs[i] * 0.3));
    return { start: hh, end: hs[i] - fh };
  }

  // ── 智能检测页头页尾 ──
  // 比较所有图片的顶部和底部，找出共有的固定区域
  function detectHeaderFooter() {
    if (images.length < 2) return;
    const ANALYZE_W = 400;
    const ROW_MSE_THRESHOLD = 800; // 行平均 MSE 阈值（宽松，因为是精确匹配）

    // 获取图片的缩放后像素数据
    function getImageData(img) {
      const h = Math.round(img.naturalHeight * ANALYZE_W / img.naturalWidth);
      const cv = document.createElement('canvas');
      cv.width = ANALYZE_W; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, ANALYZE_W, h);
      return { data: cv.getContext('2d').getImageData(0, 0, ANALYZE_W, h).data, h };
    }

    const imgDatas = images.map(getImageData);

    // 计算两行之间的 MSE
    function rowMSE(data1, y1, data2, y2) {
      const stride = ANALYZE_W * 4;
      const off1 = y1 * stride, off2 = y2 * stride;
      let sumSq = 0;
      for (let x = 0; x < ANALYZE_W; x += 2) {
        const i1 = off1 + x * 4, i2 = off2 + x * 4;
        const dr = data1[i1] - data2[i2];
        const dg = data1[i1 + 1] - data2[i2 + 1];
        const db = data1[i1 + 2] - data2[i2 + 2];
        sumSq += dr * dr + dg * dg + db * db;
      }
      return sumSq / (ANALYZE_W / 2 * 3);
    }

    // 检测顶部共有区域：逐行比较，找到第一行不一致的位置
    function detectCommonTop() {
      const maxCheck = Math.min(...imgDatas.map(d => d.h)) - 10;
      let commonH = 0;
      for (let y = 0; y < maxCheck; y++) {
        let allMatch = true;
        for (let i = 1; i < imgDatas.length; i++) {
          const mse = rowMSE(imgDatas[0].data, y, imgDatas[i].data, y);
          if (mse > ROW_MSE_THRESHOLD) {
            allMatch = false;
            break;
          }
        }
        if (!allMatch) break;
        commonH = y + 1;
      }
      return commonH;
    }

    // 检测底部共有区域：从底部向上逐行比较
    function detectCommonBottom() {
      const minH = Math.min(...imgDatas.map(d => d.h));
      let commonH = 0;
      for (let y = 0; y < minH - 10; y++) {
        let allMatch = true;
        const y0 = imgDatas[0].h - 1 - y;
        for (let i = 1; i < imgDatas.length; i++) {
          const yi = imgDatas[i].h - 1 - y;
          if (yi < 0) { allMatch = false; break; }
          const mse = rowMSE(imgDatas[0].data, y0, imgDatas[i].data, yi);
          if (mse > ROW_MSE_THRESHOLD) {
            allMatch = false;
            break;
          }
        }
        if (!allMatch) break;
        commonH = y + 1;
      }
      return commonH;
    }

    const commonTop = detectCommonTop();
    const commonBottom = detectCommonBottom();

    // 缩放回原始像素坐标
    const scaleBack = w / ANALYZE_W;
    headerH = Math.round(commonTop * scaleBack);
    footerH = Math.round(commonBottom * scaleBack);

    // 合理性检查：头/尾不能超过图片高度的 40%/30%
    const maxHeader = Math.min(...hs) * 0.4;
    const maxFooter = Math.min(...hs) * 0.3;
    if (headerH > maxHeader) headerH = Math.round(maxHeader);
    if (footerH > maxFooter) footerH = Math.round(maxFooter);
    if (headerH < 5) headerH = 0;
    if (footerH < 5) footerH = 0;

    // 更新信息显示
    const info = $('#lsHeaderFooterInfo');
    if (headerH > 0 || footerH > 0) {
      info.style.display = 'block';
      info.textContent = `📏 检测到页头 ${headerH}px / 页尾 ${footerH}px — 拼接时将去重`;
    } else {
      info.style.display = 'none';
    }
    return { headerH, footerH };
  }

  // ── Picsew 风格：5带像素级比较 + 投票机制 ──
  // 可指定搜索范围（用于排除头尾后搜索）
  function findOverlap(imgA, imgB, searchStartA, searchEndA, searchStartB, searchEndB) {
    const ANALYSIS_W = 400;
    const idxA = images.indexOf(imgA);
    const idxB = images.indexOf(imgB);
    const fullHA = Math.round(imgA.naturalHeight * ANALYSIS_W / imgA.naturalWidth);
    const fullHB = Math.round(imgB.naturalHeight * ANALYSIS_W / imgB.naturalWidth);

    // 默认搜索整个图片
    const sA = searchStartA != null ? Math.round(searchStartA * ANALYSIS_W / w) : 0;
    const eA = searchEndA != null ? Math.round(searchEndA * ANALYSIS_W / w) : fullHA;
    const sB = searchStartB != null ? Math.round(searchStartB * ANALYSIS_W / w) : 0;
    const eB = searchEndB != null ? Math.round(searchEndB * ANALYSIS_W / w) : fullHB;

    const hA = eA - sA;
    const hB = eB - sB;

    if (hA <= 0 || hB <= 0) return { overlap: 0, confidence: 0, votes: 0 };

    function getCanvas(img, targetW, targetH) {
      const cv = document.createElement('canvas');
      cv.width = targetW; cv.height = targetH;
      cv.getContext('2d').drawImage(img, 0, 0, targetW, targetH);
      return cv;
    }
    const ca = getCanvas(imgA, ANALYSIS_W, fullHA);
    const cb = getCanvas(imgB, ANALYSIS_W, fullHB);
    const pa = ca.getContext('2d').getImageData(0, 0, ANALYSIS_W, fullHA).data;
    const pb = cb.getContext('2d').getImageData(0, 0, ANALYSIS_W, fullHB).data;

    const maxOverlap = Math.min(hA, hB);
    const minOverlap = Math.max(10, Math.round(maxOverlap * 0.02));
    if (minOverlap >= maxOverlap) return { overlap: 0, confidence: 0, votes: 0 };
    const searchLen = Math.min(maxOverlap, Math.round(Math.min(hA, hB) * 0.85));
    if (searchLen < minOverlap) return { overlap: 0, confidence: 0, votes: 0 };

    const BANDS = 5;
    const BAND_H = 30;
    const MSE_TOLERANCE = 1200;

    let bestO = 0;
    let bestVotes = 0;
    let bestTotalMSE = Infinity;

    function bandMSE(y1, y2, h) {
      let sumSq = 0, count = 0;
      for (let dy = 0; dy < h; dy++) {
        const rA = (y1 + dy) * ANALYSIS_W * 4;
        const rB = (y2 + dy) * ANALYSIS_W * 4;
        for (let x = 0; x < ANALYSIS_W; x += 2) {
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

    for (let o = minOverlap; o <= searchLen; o += 4) {
      let votes = 0;
      let totalMSE = 0;

      for (let b = 0; b < BANDS; b++) {
        const bandCenter = Math.round(o * (b + 1) / (BANDS + 1));
        // A 底部区域（相对全局坐标 = sA + hA - o + bandCenter）
        let y1 = sA + hA - o + bandCenter - Math.floor(BAND_H / 2);
        let y2 = sB + bandCenter - Math.floor(BAND_H / 2);
        y1 = Math.max(sA, Math.min(sA + hA - BAND_H, y1));
        y2 = Math.max(sB, Math.min(sB + hB - BAND_H, y2));

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

    if (bestVotes < 4) {
      return { overlap: 0, confidence: 0, votes: bestVotes };
    }

    const confidence = bestVotes === 5 ? 0.9 : bestVotes === 4 ? 0.7 : 0.5;
    const origOverlap = Math.round(bestO * w / ANALYSIS_W);
    return { overlap: origOverlap, confidence, votes: bestVotes };
  }

  // ── 自动检测所有重合 ──
  async function autoDetect() {
    const btn = $('#lsAutoBtn');
    btn.textContent = '⏳ 分析中...';
    btn.disabled = true;

    // 如果启用了去重，先检测头尾
    if (dedupEnabled && images.length >= 2) {
      $('#lsStatus').textContent = '正在检测页头页尾...';
      await new Promise(r => setTimeout(r, 50));
      detectHeaderFooter();
    } else {
      headerH = 0; footerH = 0;
      $('#lsHeaderFooterInfo').style.display = 'none';
    }

    let found = 0;
    for (let i = 0; i < images.length - 1; i++) {
      $('#lsStatus').textContent = `分析第 ${i + 1}/${images.length - 1} 组重合区域...`;
      await new Promise(r => setTimeout(r, 10));

      let result;
      if (dedupEnabled && (headerH > 0 || footerH > 0)) {
        // 只搜索内容区（排除头尾）
        const rA = contentRange(i);
        const rB = contentRange(i + 1);
        result = findOverlap(images[i], images[i + 1], rA.start, rA.end, rB.start, rB.end);
      } else {
        result = findOverlap(images[i], images[i + 1]);
      }

      if (result.confidence >= 0.5) {
        overlaps[i] = result.overlap;
        found++;
      } else {
        overlaps[i] = 0;
      }
    }

    btn.textContent = '🔍 自动检测重叠';
    btn.disabled = false;

    const msg = found > 0
      ? `检测到 ${found} 处重合${dedupEnabled && (headerH > 0 || footerH > 0) ? '（已去除重复头尾）' : ''}`
      : '未检测到明显重合，请手动拖动滑块调整';
    $('#lsStatus').textContent = msg;
    Utils.toast(msg, found > 0 ? 'success' : 'info');

    renderSliders();
    drawPreview();
  }

  // ── 渲染滑块 ──
  function renderSliders() {
    // 计算每对图片内容区的最大可能重叠
    const maxOvs = [];
    for (let i = 0; i < images.length - 1; i++) {
      const rA = contentRange(i);
      const rB = contentRange(i + 1);
      const hA = rA.end - rA.start;
      const hB = rB.end - rB.start;
      maxOvs.push(Math.min(hA, hB));
    }
    overlaps = overlaps.map((o, i) => Math.min(o, maxOvs[i] || 0));

    const wInfo = images.map((img, i) => {
      const r = contentRange(i);
      const ch = r.end - r.start;
      return `<span style="font-size:0.72rem;color:var(--text-muted)">图${i + 1}: ${img.naturalWidth}×${img.naturalHeight}${dedupEnabled && (headerH>0||footerH>0) ? ' 内容'+ch+'px' : ''}</span>`;
    }).join('');

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

  // ── 预览（带页头页尾标注） ──
  function drawPreview() {
    if (!images.length) return;
    const PREV_W = 400;
    const scale = PREV_W / w;

    const phs = hs.map(h => Math.round(h * scale));
    const ovs = overlaps.map(o => Math.round(o * scale));
    const hdH = Math.round(headerH * scale);
    const ftH = Math.round(footerH * scale);

    // 在 dedup 模式下，每张图贡献：header(仅第一张) + 可见内容 + footer(仅最后一张)
    // 简化版：直接拼接带裁剪的图，然后标注头尾
    const vh = phs.map((ph, i) => i === 0 ? ph : ph - ovs[i - 1]);
    const totalH = vh.reduce((a, b) => a + b, 0);

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

    // 标注页头页尾区域
    if (dedupEnabled && headerH > 0) {
      cx.fillStyle = 'rgba(34,197,94,0.15)';
      cx.fillRect(0, 0, PREV_W, hdH);
      cx.fillStyle = '#16a34a';
      cx.font = 'bold 10px system-ui, sans-serif';
      cx.fillText('页头（去重）', 4, hdH - 4);
    }
    if (dedupEnabled && footerH > 0) {
      cx.fillStyle = 'rgba(239,68,68,0.15)';
      cx.fillRect(0, totalH - ftH, PREV_W, ftH);
      cx.fillStyle = '#dc2626';
      cx.font = 'bold 10px system-ui, sans-serif';
      cx.fillText('页尾（去重）', 4, totalH - 4);
    }

    // 高亮重合区域
    for (let i = 0; i < overlaps.length; i++) {
      const topY = pos[i + 1];
      if (ovs[i] > 1) {
        cx.fillStyle = 'rgba(37,99,235,0.10)';
        cx.fillRect(0, topY - ovs[i], PREV_W, ovs[i]);
      }
      cx.strokeStyle = '#2563eb';
      cx.lineWidth = 1.5;
      cx.setLineDash([4, 2]);
      cx.beginPath();
      cx.moveTo(0, topY);
      cx.lineTo(PREV_W, topY);
      cx.stroke();
      cx.setLineDash([]);
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

  // ── 导出（智能组装：头+内容+尾） ──
  function doExport() {
    let totalH;
    let cv, cx;

    if (dedupEnabled && (headerH > 0 || footerH > 0)) {
      // 智能拼接模式：头一次 + 拼接内容 + 尾一次
      const hh = headerH;
      const fh = footerH;

      // 提取每张图的内容区高度
      const contentHs = hs.map((h, i) => {
        const r = contentRange(i);
        return r.end - r.start;
      });

      // 内容区可见高度
      const contentVH = contentHs.map((ch, i) => i === 0 ? ch : ch - overlaps[i - 1]);
      const contentTotalH = contentVH.reduce((a, b) => a + b, 0);

      totalH = (hh > 0 ? hh : 0) + contentTotalH + (fh > 0 ? fh : 0);

      cv = document.createElement('canvas');
      cv.width = w;
      cv.height = totalH;
      cx = cv.getContext('2d');
      cx.fillStyle = '#fff';
      cx.fillRect(0, 0, w, totalH);

      let cy = 0;

      // 画页头（来自第一张图）
      if (hh > 0) {
        cx.drawImage(images[0], 0, 0, w, hh, 0, cy, w, hh);
        cy += hh;
      }

      // 画拼接后的内容区
      for (let i = 0; i < images.length; i++) {
        const r = contentRange(i);
        const srcY = r.start + (i > 0 ? overlaps[i - 1] : 0);
        const drawH = contentVH[i];
        cx.drawImage(images[i], 0, srcY, w, drawH, 0, cy, w, drawH);
        cy += drawH;
      }

      // 画页尾（来自最后一张图）
      if (fh > 0) {
        const lastR = contentRange(images.length - 1);
        const footerSrcY = lastR.end;
        cx.drawImage(images[images.length - 1], 0, footerSrcY, w, fh, 0, cy, w, fh);
      }
    } else {
      // 普通拼接模式
      const vh = hs.map((h, i) => i === 0 ? h : h - overlaps[i - 1]);
      totalH = vh.reduce((a, b) => a + b, 0);

      cv = document.createElement('canvas');
      cv.width = w;
      cv.height = totalH;
      cx = cv.getContext('2d');
      cx.fillStyle = '#fff';
      cx.fillRect(0, 0, w, totalH);

      let y = 0;
      for (let i = 0; i < images.length; i++) {
        const srcY = i > 0 ? overlaps[i - 1] : 0;
        cx.drawImage(images[i], 0, srcY, w, hs[i] - srcY, 0, y, w, vh[i]);
        y += vh[i];
      }
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
    headerH = 0; footerH = 0;

    $('#lsStep1').classList.add('hidden');
    $('#lsStep2').classList.remove('hidden');
    $('#lsStep3').classList.add('hidden');
    $('#lsStatus').textContent = `共 ${images.length} 张图片`;

    renderSliders();
    drawPreview();
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

  // 智能去重头尾开关
  $('#lsDedup').onchange = () => {
    dedupEnabled = $('#lsDedup').checked;
    if (dedupEnabled) {
      autoDetect(); // 重新检测
    } else {
      headerH = 0; footerH = 0;
      $('#lsHeaderFooterInfo').style.display = 'none';
      autoDetect();
    }
  };

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
