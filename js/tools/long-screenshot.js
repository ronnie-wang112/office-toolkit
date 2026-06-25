// ===== 长截图拼接 v7 — 模板匹配版 =====
function Tool_long_screenshot(container) {
  let images = [], overlaps = [];

  container.innerHTML = `
    <div id="lsPick">
      <div class="drop-zone" id="lsDrop">
        <div class="drop-zone-icon">📐</div>
        <div class="drop-zone-text">选择截图（2张以上）</div>
        <div class="drop-zone-hint">图1=内容A+B，图2=B+C → 自动覆盖B → 输出A+B+C</div>
      </div>
    </div>
    <div id="lsEdit" class="hidden">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px">
        <span style="font-weight:600" id="lsTitle"></span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-primary btn-sm" id="lsAuto">🔍 自动检测重叠</button>
          <button class="btn btn-secondary btn-sm" id="lsReset">重选</button>
        </div>
      </div>
      <div id="lsSliders"></div>
      <div style="text-align:center;background:#f0f0f0;border-radius:8px;padding:6px;overflow:auto;max-height:400px">
        <canvas id="lsPreview" style="display:block;margin:0 auto"></canvas>
      </div>
      <div style="display:flex;justify-content:flex-end;align-items:flex-end;gap:10px;margin-top:8px;flex-wrap:wrap">
        <div class="form-group" style="max-width:110px"><label>宽度</label><select id="lsW"><option value="auto">原始</option><option value="1080">1080</option><option value="750">750</option></select></div>
        <button class="btn btn-primary" id="lsExport">📥 导出长图</button>
      </div>
    </div>
    <div id="lsDone" class="hidden">
      <canvas id="lsResult" style="display:block;max-width:100%;height:auto;margin:0 auto;border:1px solid var(--border);border-radius:8px"></canvas>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:10px;flex-wrap:wrap">
        <button class="btn btn-primary" id="lsDl">下载 PNG</button>
        <button class="btn btn-secondary" id="lsCopy">复制</button>
        <button class="btn btn-secondary" id="lsBack">← 返回</button>
      </div>
    </div>
  `;

  const $ = s => container.querySelector(s);
  const pick = $('#lsPick'), edit = $('#lsEdit'), done = $('#lsDone');

  // ---- Load ----
  async function pickFiles() {
    const f = await Utils.pickFiles('image/*', true);
    if (f?.length >= 2) load(Array.from(f));
    else if (f?.length) Utils.toast('至少选2张', 'error');
  }
  $('#lsDrop').onclick = pickFiles;
  $('#lsDrop').ondragover = e => { e.preventDefault(); $('#lsDrop').classList.add('drag-over'); };
  $('#lsDrop').ondragleave = () => $('#lsDrop').classList.remove('drag-over');
  $('#lsDrop').ondrop = e => {
    e.preventDefault(); $('#lsDrop').classList.remove('drag-over');
    if (e.dataTransfer.files.length) load(Array.from(e.dataTransfer.files));
  };

  async function load(files) {
    images = [];
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

  // ---- Dimensions ----
  function tw() { const v = $('#lsW')?.value || 'auto'; return v==='auto' ? Math.max(...images.map(i=>i.naturalWidth)) : +v; }
  function sh(i) { return Math.round(images[i].naturalHeight * tw() / images[i].naturalWidth); }

  // ---- Sliders ----
  function buildSliders() {
    const allMax = overlaps.map((_,i) => Math.min(sh(i), sh(i+1)));
    overlaps = overlaps.map((o,i) => Math.min(o, allMax[i]));

    $('#lsSliders').innerHTML = overlaps.map((ov,i) => {
      const m = allMax[i];
      return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;padding:4px 8px;background:var(--bg);border-radius:6px;font-size:0.8rem">
        <span style="color:var(--text-secondary);min-width:44px">${i+1}→${i+2}</span>
        <input type="range" min="0" max="${m}" value="${ov}" class="lr" data-i="${i}" style="flex:1;height:4px;accent-color:var(--cat-pdf)">
        <input type="number" min="0" max="${m}" value="${ov}" class="ln" data-i="${i}" style="width:66px;padding:3px 4px;text-align:right;border:1px solid var(--border);border-radius:4px;background:var(--bg-input);color:var(--text);font-size:0.78rem;font-family:monospace">
        <span style="color:var(--text-muted);font-size:0.7rem">px</span></div>`;
    }).join('');

    $('#lsSliders').querySelectorAll('.lr').forEach(r => r.oninput = () => { overlaps[+r.dataset.i]=+r.value; syncN(r.dataset.i); drawPreview(); });
    $('#lsSliders').querySelectorAll('.ln').forEach(n => n.oninput = () => { overlaps[+n.dataset.i]=+n.value||0; syncR(n.dataset.i); drawPreview(); });
  }
  function syncN(i) { const n = $('#lsSliders').querySelectorAll('.ln')[i]; if(n) n.value=overlaps[i]; }
  function syncR(i) { const r = $('#lsSliders').querySelectorAll('.lr')[i]; if(r) r.value=overlaps[i]; }

  // ---- Preview ----
  function drawPreview() {
    const w = tw(), hs = images.map((_,i)=>sh(i));
    const s = Math.min(1, 350/w);
    const pw = Math.round(w*s), phs = hs.map(h=>Math.round(h*s)), ovs = overlaps.map(o=>Math.round(o*s));
    const pos = [0];
    for (let i=0;i<overlaps.length;i++) pos.push(pos[i]+phs[i]-ovs[i]);
    const th = pos[overlaps.length]+phs[overlaps.length];

    const cvs = document.createElement('canvas'); cvs.width=pw; cvs.height=th;
    const ctx = cvs.getContext('2d');
    ctx.fillStyle='#e8e8e8'; ctx.fillRect(0,0,pw,th);
    for (let i=0;i<images.length;i++) {
      ctx.fillStyle='#fff'; ctx.fillRect(0,pos[i],pw,phs[i]);
      ctx.drawImage(images[i],0,pos[i],pw,phs[i]);
    }
    for (let i=0;i<overlaps.length;i++) {
      const y=pos[i+1];
      if(ovs[i]>2){ctx.fillStyle='rgba(37,99,235,0.12)';ctx.fillRect(0,y,pw,ovs[i]);}
      ctx.strokeStyle='#2563eb';ctx.lineWidth=1;ctx.setLineDash([3,3]);
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(pw,y);ctx.stroke();ctx.setLineDash([]);
      if(overlaps[i]>5){ctx.fillStyle='#2563eb';ctx.font='9px sans-serif';ctx.fillText(overlaps[i]+'px',4,y-3);}
    }
    const disp=$('#lsPreview');disp.width=pw;disp.height=th;
    disp.getContext('2d').drawImage(cvs,0,0);
    disp.style.width=Math.min(pw,350)+'px';disp.style.height='auto';
  }

  // ---- NCC Template Match ----
  function nccMatch(template, search) {
    // template, search: arrays of numbers
    const tLen = template.length, sLen = search.length;
    if (tLen > sLen) return { idx: 0, score: -1 };

    const tMean = template.reduce((a,b)=>a+b)/tLen;
    const tStd = Math.sqrt(template.reduce((a,b)=>a+(b-tMean)**2,0)/tLen) || 1;

    let best = 0, bestScore = -1;
    for (let i = 0; i <= sLen - tLen; i++) {
      const sub = search.slice(i, i + tLen);
      const sMean = sub.reduce((a,b)=>a+b)/tLen;
      const sStd = Math.sqrt(sub.reduce((a,b)=>a+(b-sMean)**2,0)/tLen) || 1;

      let cov = 0;
      for (let j = 0; j < tLen; j++) cov += (template[j] - tMean) * (sub[j] - sMean);
      const score = cov / (tLen * tStd * sStd);

      if (score > bestScore) { bestScore = score; best = i; }
    }
    return { idx: best, score: bestScore };
  }

  // ---- Auto Detect ----
  $('#lsAuto').onclick = () => {
    const btn = $('#lsAuto');
    btn.textContent = '⏳ 检测中...'; btn.disabled = true;

    const w = tw();
    const cw = 150; // comparison width
    let found = 0;

    setTimeout(() => {
      for (let i = 0; i < images.length - 1; i++) {
        const ch1 = Math.round(images[i].naturalHeight * cw / images[i].naturalWidth);
        const ch2 = Math.round(images[i+1].naturalHeight * cw / images[i+1].naturalWidth);

        // Small canvases
        const ca = document.createElement('canvas'); ca.width = cw; ca.height = ch1;
        ca.getContext('2d').drawImage(images[i], 0, 0, cw, ch1);
        const cb = document.createElement('canvas'); cb.width = cw; cb.height = ch2;
        cb.getContext('2d').drawImage(images[i+1], 0, 0, cw, ch2);

        // Row signatures
        const sig = (cvs, h) => {
          const ctx = cvs.getContext('2d'), a = [];
          for (let y = 0; y < h; y++) {
            const d = ctx.getImageData(0, y, cw, 1).data;
            let s = 0;
            for (let x = 0; x < cw*4; x+=4) s += d[x]*0.299+d[x+1]*0.587+d[x+2]*0.114;
            a.push(s/cw);
          }
          return a;
        };
        const sigA = sig(ca, ch1), sigB = sig(cb, ch2);

        // Template: bottom 15% of image A (but at least 15 rows, at most 200)
        const templateH = Math.max(15, Math.min(200, Math.round(ch1 * 0.15)));
        const template = sigA.slice(ch1 - templateH);

        // Search in: top 80% of image B
        const searchH = Math.round(ch2 * 0.8);
        const search = sigB.slice(0, Math.max(templateH, searchH));

        // NCC match
        const { idx, score } = nccMatch(template, search);

        // Convert position to overlap: overlap = idx + templateH (at comparison scale)
        if (score > 0.6) {
          overlaps[i] = Math.round((idx + templateH) * w / cw);
          found++;
        } else {
          overlaps[i] = 0;
        }
      }

      // Update UI
      document.querySelectorAll('.lr').forEach((r,i)=>{r.value=overlaps[i];});
      document.querySelectorAll('.ln').forEach((n,i)=>{n.value=overlaps[i];});
      buildSliders();
      drawPreview();
      btn.textContent = '🔍 自动检测重叠';
      btn.disabled = false;
      Utils.toast(found ? `识别 ${found}/${overlaps.length} 处重叠` : '未发现重叠', found?'success':'info');
    }, 50);
  };

  // ---- Export ----
  $('#lsExport').onclick = () => {
    const w = tw(), hs = images.map((_,i)=>sh(i));
    let th = hs[0];
    for (let i=0;i<overlaps.length;i++) th += hs[i+1] - overlaps[i];

    const cvs = document.createElement('canvas'); cvs.width=w; cvs.height=th;
    const ctx = cvs.getContext('2d');
    ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,th);
    let y = 0;
    for (let i=0;i<images.length;i++) {
      ctx.drawImage(images[i],0,y,w,hs[i]);
      y += hs[i];
      if (i<overlaps.length) y -= overlaps[i];
    }
    cvs.toBlob(blob => {
      edit.classList.add('hidden'); done.classList.remove('hidden');
      $('#lsResult').width=w; $('#lsResult').height=th;
      $('#lsResult').style.maxWidth=Math.min(w,600)+'px'; $('#lsResult').style.height='auto';
      $('#lsResult').getContext('2d').drawImage(cvs,0,0);
      $('#lsResult')._blob=blob;
    }, 'image/png');
  };

  // ---- Buttons ----
  $('#lsW').onchange = () => { buildSliders(); drawPreview(); };
  $('#lsReset').onclick = () => { images=[]; overlaps=[]; pick.classList.remove('hidden'); edit.classList.add('hidden'); done.classList.add('hidden'); };
  $('#lsDl').onclick = () => { const b=$('#lsResult')._blob; if(b) Utils.download(b,'长截图_'+new Date().toISOString().slice(0,10)+'.png'); };
  $('#lsCopy').onclick = async () => {
    const b=$('#lsResult')._blob; if(!b) return;
    try{await navigator.clipboard.write([new ClipboardItem({'image/png':b})]);Utils.toast('已复制','success');}
    catch(e){const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='long.png';a.click();}
  };
  $('#lsBack').onclick = () => { done.classList.add('hidden'); edit.classList.remove('hidden'); };
}
function Tool_long_screenshot_deactivate() {}
