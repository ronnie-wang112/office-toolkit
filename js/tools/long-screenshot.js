// ===== 长截图拼接 v6 — PicSew 风格 =====
// 核心: NCC 归一化互相关 + 滑块微调 + 原生比例预览
function Tool_long_screenshot(container) {
  let images = [];
  let overlaps = [];
  let autoDone = false;

  container.innerHTML = `
    <div id="lsPick">
      <div class="drop-zone" id="lsDrop">
        <div class="drop-zone-icon">📐</div>
        <div class="drop-zone-text">点击选择截图（2张以上）</div>
        <div class="drop-zone-hint">按滚动顺序选择，自动识别重复区域</div>
      </div>
    </div>
    <div id="lsEdit" class="hidden">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:6px">
        <span style="font-weight:600" id="lsTitle"></span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-secondary btn-sm" id="lsAuto">🔍 自动检测</button>
          <button class="btn btn-secondary btn-sm" id="lsReset">重选图片</button>
        </div>
      </div>
      <div id="lsSliders"></div>
      <div style="text-align:center;background:#f5f5f5;border-radius:8px;padding:8px;overflow:auto;max-height:420px">
        <canvas id="lsPreviewCvs" style="display:block;margin:0 auto"></canvas>
      </div>
      <div style="display:flex;justify-content:flex-end;align-items:flex-end;gap:10px;margin-top:10px;flex-wrap:wrap">
        <div class="form-group" style="max-width:110px"><label>宽度</label><select id="lsWidth"><option value="auto">原始</option><option value="1080">1080</option><option value="750">750</option></select></div>
        <button class="btn btn-primary" id="lsExport">📥 导出长图</button>
      </div>
    </div>
    <div id="lsDone" class="hidden">
      <canvas id="lsResultCvs" style="display:block;max-width:100%;height:auto;margin:0 auto;border:1px solid var(--border);border-radius:8px"></canvas>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:10px">
        <button class="btn btn-primary" id="lsDl">下载 PNG</button>
        <button class="btn btn-secondary" id="lsCopy">复制</button>
        <button class="btn btn-secondary" id="lsBack">← 返回</button>
      </div>
    </div>
  `;

  const $ = s => container.querySelector(s);
  const pick = $('#lsPick'), edit = $('#lsEdit'), done = $('#lsDone');

  // ---- Pick files ----
  $('#lsDrop').onclick = () => pickFiles();
  $('#lsDrop').ondragover = e => { e.preventDefault(); $('#lsDrop').classList.add('drag-over'); };
  $('#lsDrop').ondragleave = () => $('#lsDrop').classList.remove('drag-over');
  $('#lsDrop').ondrop = e => {
    e.preventDefault(); $('#lsDrop').classList.remove('drag-over');
    if (e.dataTransfer.files.length) load(Array.from(e.dataTransfer.files));
  };
  async function pickFiles() {
    const f = await Utils.pickFiles('image/*', true);
    if (f?.length >= 2) load(Array.from(f));
    else if (f?.length) Utils.toast('至少选2张', 'error');
  }

  async function load(files) {
    images = []; autoDone = false;
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      const img = new Image();
      img.src = URL.createObjectURL(f);
      await new Promise(r => img.onload = r);
      images.push(img);
    }
    if (images.length < 2) { Utils.toast('至少2张', 'error'); return; }
    if (images.length > 10) images = images.slice(0, 10);
    overlaps = new Array(images.length - 1).fill(0);

    pick.classList.add('hidden');
    edit.classList.remove('hidden');
    done.classList.add('hidden');
    $('#lsTitle').textContent = images.length + ' 张截图';
    buildSliders();
    drawPreview();
  }

  // ---- Target width ----
  function tw() {
    const v = $('#lsWidth')?.value || 'auto';
    return v === 'auto' ? Math.max(...images.map(i => i.naturalWidth)) : +v;
  }
  function sh(i) { return Math.round(images[i].naturalHeight * tw() / images[i].naturalWidth); }

  // ---- Sliders ----
  function buildSliders() {
    const div = $('#lsSliders');
    div.innerHTML = overlaps.map((ov, i) => {
      const max = Math.min(sh(i), sh(i+1));
      return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;padding:4px 8px;background:var(--bg);border-radius:6px;font-size:0.8rem">
        <span style="color:var(--text-secondary);min-width:44px">${i+1}→${i+2}</span>
        <input type="range" min="0" max="${max}" value="${ov}" step="1" class="ls-range" data-i="${i}" style="flex:1;height:4px;accent-color:var(--cat-pdf)">
        <input type="number" min="0" max="${max}" value="${ov}" step="10" class="ls-num" data-i="${i}" style="width:68px;padding:3px 4px;text-align:right;border:1px solid var(--border);border-radius:4px;background:var(--bg-input);color:var(--text);font-size:0.78rem;font-family:monospace">
        <span style="color:var(--text-muted);font-size:0.7rem">px</span>
      </div>`;
    }).join('');

    div.querySelectorAll('.ls-range').forEach(r => {
      r.oninput = () => { overlaps[+r.dataset.i] = +r.value; syncNum(r.dataset.i); drawPreview(); };
    });
    div.querySelectorAll('.ls-num').forEach(n => {
      n.oninput = () => { overlaps[+n.dataset.i] = +n.value||0; syncRange(n.dataset.i); drawPreview(); };
    });
  }
  function syncNum(i) { const n = $('#lsSliders').querySelectorAll('.ls-num')[i]; if (n) n.value = overlaps[i]; }
  function syncRange(i) { const r = $('#lsSliders').querySelectorAll('.ls-range')[i]; if (r) r.value = overlaps[i]; }

  // ---- Preview (PicSew-style vertical stack) ----
  function drawPreview() {
    const w = tw();
    const hs = images.map((_, i) => sh(i));
    const scale = Math.min(1, 400 / w);
    const pw = Math.round(w * scale);
    const phs = hs.map(h => Math.round(h * scale));
    const ovs = overlaps.map(o => Math.round(o * scale));
    const pos = [0];
    for (let i = 0; i < overlaps.length; i++) pos.push(pos[i] + phs[i] - ovs[i]);
    const th = pos[overlaps.length] + phs[overlaps.length];

    const cvs = document.createElement('canvas');
    cvs.width = pw; cvs.height = th;
    const ctx = cvs.getContext('2d');
    ctx.fillStyle = '#f0f0f0'; ctx.fillRect(0, 0, pw, th);

    for (let i = 0; i < images.length; i++) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, pos[i], pw, phs[i]);
      ctx.drawImage(images[i], 0, pos[i], pw, phs[i]);
    }

    // Overlap highlights
    for (let i = 0; i < overlaps.length; i++) {
      const y = pos[i+1];
      if (ovs[i] > 2) {
        ctx.fillStyle = 'rgba(37,99,235,0.10)';
        ctx.fillRect(0, y, pw, ovs[i]);
      }
      ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(pw, y); ctx.stroke();
      ctx.setLineDash([]);

      // Small label
      if (ovs[i] > 5) {
        ctx.fillStyle = '#2563eb'; ctx.font = '9px sans-serif';
        ctx.fillText(overlaps[i] + 'px', 4, y - 3);
      }
    }

    const disp = $('#lsPreviewCvs');
    disp.width = pw; disp.height = th;
    disp.getContext('2d').drawImage(cvs, 0, 0);
    disp.style.width = Math.min(pw, 400) + 'px';
    disp.style.height = 'auto';
  }

  // ---- Auto-detect (NCC row matching) ----
  $('#lsAuto').onclick = async () => {
    $('#lsAuto').textContent = '⏳ ...'; $('#lsAuto').disabled = true;

    const w = tw();
    let found = 0;

    for (let i = 0; i < images.length - 1; i++) {
      // Create small canvases at same width for comparison
      const cw = 150;
      const ch1 = Math.round(images[i].naturalHeight * cw / images[i].naturalWidth);
      const ch2 = Math.round(images[i+1].naturalHeight * cw / images[i+1].naturalWidth);

      const c1 = document.createElement('canvas'); c1.width = cw; c1.height = ch1;
      c1.getContext('2d').drawImage(images[i], 0, 0, cw, ch1);
      const c2 = document.createElement('canvas'); c2.width = cw; c2.height = ch2;
      c2.getContext('2d').drawImage(images[i+1], 0, 0, cw, ch2);

      const ctx1 = c1.getContext('2d'), ctx2 = c2.getContext('2d');

      // Row signatures
      const sig = (ctx, h) => {
        const a = [];
        for (let y = 0; y < h; y++) {
          const d = ctx.getImageData(0, y, cw, 1).data;
          let s = 0;
          for (let x = 0; x < cw*4; x+=4) s += d[x]*0.299+d[x+1]*0.587+d[x+2]*0.114;
          a.push(s/cw);
        }
        return a;
      };
      const s1 = sig(ctx1, ch1), s2 = sig(ctx2, ch2);

      // Search: overlap up to 80% of the shorter image
      const maxO = Math.min(ch1, ch2);
      if (maxO < 5) continue;

      // Take a search window from bottom of s1
      const searchLen = Math.min(maxO, Math.round(ch1 * 0.8));
      const winS1 = s1.slice(ch1 - searchLen);
      const winLen = winS1.length;

      // Slide over top of s2, find best NCC
      let bestO = 0, bestNCC = -1;
      const searchEnd = Math.min(ch2 - winLen, maxO);

      // Precompute mean of winS1
      const mean1 = winS1.reduce((a,b)=>a+b)/winLen;
      const std1 = Math.sqrt(winS1.reduce((a,b)=>a+(b-mean1)**2,0)/winLen) || 1;

      for (let offset = 1; offset <= searchEnd; offset++) {
        // Take winLen rows from s2 at offset-window position
        const start2 = Math.max(0, offset - winLen);
        const sub2 = s2.slice(start2, start2 + winLen);
        if (sub2.length < winLen) continue;

        const mean2 = sub2.reduce((a,b)=>a+b)/winLen;
        const std2 = Math.sqrt(sub2.reduce((a,b)=>a+(b-mean2)**2,0)/winLen) || 1;

        let cov = 0;
        for (let j = 0; j < winLen; j++) cov += (winS1[j] - mean1) * (sub2[j] - mean2);
        const ncc = cov / (winLen * std1 * std2);

        if (ncc > bestNCC) { bestNCC = ncc; bestO = offset; }
      }

      // NCC > 0.7 = good match
      if (bestNCC > 0.7) {
        overlaps[i] = Math.round(bestO * w / cw);
        found++;
      } else {
        overlaps[i] = 0;
      }
    }

    // Update UI
    document.querySelectorAll('.ls-range').forEach((r, i) => { r.value = overlaps[i]; });
    document.querySelectorAll('.ls-num').forEach((n, i) => { n.value = overlaps[i]; });
    drawPreview();
    $('#lsAuto').textContent = '🔍 自动检测';
    $('#lsAuto').disabled = false;
    autoDone = true;
    Utils.toast(found ? `发现 ${found}/${overlaps.length} 处重叠` : '未发现重叠，请手动调节', found?'success':'info');
  };

  // ---- Width change ----
  $('#lsWidth').onchange = () => {
    const maxes = overlaps.map((_, i) => Math.min(sh(i), sh(i+1)));
    overlaps = overlaps.map((o, i) => Math.min(o, maxes[i]));
    buildSliders();
    drawPreview();
  };

  // ---- Export ----
  $('#lsExport').onclick = () => {
    const w = tw();
    const hs = images.map((_, i) => sh(i));
    let th = hs[0];
    for (let i = 0; i < overlaps.length; i++) th += hs[i+1] - overlaps[i];

    const cvs = document.createElement('canvas');
    cvs.width = w; cvs.height = th;
    const ctx = cvs.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, th);

    let y = 0;
    for (let i = 0; i < images.length; i++) {
      ctx.drawImage(images[i], 0, y, w, hs[i]);
      y += hs[i];
      if (i < overlaps.length) y -= overlaps[i];
    }

    cvs.toBlob(blob => {
      edit.classList.add('hidden');
      done.classList.remove('hidden');
      $('#lsResultCvs').width = w; $('#lsResultCvs').height = th;
      $('#lsResultCvs').style.maxWidth = Math.min(w, 600) + 'px';
      $('#lsResultCvs').style.height = 'auto';
      $('#lsResultCvs').getContext('2d').drawImage(cvs, 0, 0);
      $('#lsResultCvs')._blob = blob;
    }, 'image/png');
  };

  // ---- Buttons ----
  $('#lsReset').onclick = () => { images=[]; overlaps=[]; pick.classList.remove('hidden'); edit.classList.add('hidden'); done.classList.add('hidden'); };
  $('#lsDl').onclick = () => { const b=$('#lsResultCvs')._blob; if(b) Utils.download(b, '长截图_'+new Date().toISOString().slice(0,10)+'.png'); };
  $('#lsCopy').onclick = async () => {
    const b=$('#lsResultCvs')._blob; if(!b) return;
    try{await navigator.clipboard.write([new ClipboardItem({'image/png':b})]); Utils.toast('已复制','success');}
    catch(e){const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='long.png';a.click();}
  };
  $('#lsBack').onclick = () => { done.classList.add('hidden'); edit.classList.remove('hidden'); };
}
function Tool_long_screenshot_deactivate() {}
