// ===== 长截图拼接 v8 =====
function Tool_long_screenshot(container) {
  let images = [], overlaps = [];

  container.innerHTML = `
    <div id="lsPick">
      <div class="drop-zone" id="lsDrop">
        <div class="drop-zone-icon">📐</div>
        <div class="drop-zone-text">选择截图（2张以上）</div>
        <div class="drop-zone-hint">图1=A+B，图2=B+C → 自动覆盖重复的B → 输出A+B+C</div>
      </div>
    </div>
    <div id="lsEdit" class="hidden">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px">
        <span style="font-weight:600" id="lsTitle"></span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-primary btn-sm" id="lsAuto">🔍 自动检测重叠</button>
          <button class="btn btn-secondary btn-sm" id="lsReset">重选</button>
        </div>
      </div>
      <div id="lsSliders"></div>
      <div id="lsDiag" style="font-size:0.72rem;color:var(--text-muted);margin-bottom:6px;display:none"></div>
      <div style="text-align:center;background:#e8e8e8;border-radius:8px;padding:6px;overflow:auto;max-height:380px">
        <canvas id="lsPrev" style="display:block;margin:0 auto"></canvas>
      </div>
      <div style="display:flex;justify-content:flex-end;align-items:flex-end;gap:10px;margin-top:8px;flex-wrap:wrap">
        <div class="form-group" style="max-width:110px"><label>宽度</label><select id="lsW"><option value="auto">原始</option><option value="1080">1080</option><option value="750">750</option></select></div>
        <button class="btn btn-primary" id="lsExp">📥 导出</button>
      </div>
    </div>
    <div id="lsDone" class="hidden">
      <canvas id="lsRes" style="display:block;max-width:100%;height:auto;margin:0 auto;border:1px solid var(--border);border-radius:8px"></canvas>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:10px;flex-wrap:wrap">
        <button class="btn btn-primary" id="lsDl">下载</button>
        <button class="btn btn-secondary" id="lsCopy">复制</button>
        <button class="btn btn-secondary" id="lsBack">← 返回</button>
      </div>
    </div>
  `;

  const $ = s => container.querySelector(s);
  const pick = $('#lsPick'), edit = $('#lsEdit'), done = $('#lsDone');

  async function load(files) {
    images = [];
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      const img = new Image(); img.src = URL.createObjectURL(f);
      await new Promise(r => img.onload = r); images.push(img);
    }
    if (images.length < 2) { Utils.toast('至少2张', 'error'); return; }
    if (images.length > 10) images = images.slice(0, 10);
    overlaps = new Array(images.length - 1).fill(0);
    pick.classList.add('hidden'); edit.classList.remove('hidden'); done.classList.add('hidden');
    $('#lsTitle').textContent = images.length + ' 张截图 · 先点「自动检测」，再手工微调滑块';
    buildUI(); draw();
  }

  async function pickFiles() {
    const f = await Utils.pickFiles('image/*', true);
    if (f?.length >= 2) load(Array.from(f)); else if (f?.length) Utils.toast('至少选2张', 'error');
  }
  $('#lsDrop').onclick = pickFiles;
  $('#lsDrop').ondragover = e => { e.preventDefault(); $('#lsDrop').classList.add('drag-over'); };
  $('#lsDrop').ondragleave = () => $('#lsDrop').classList.remove('drag-over');
  $('#lsDrop').ondrop = e => {
    e.preventDefault(); $('#lsDrop').classList.remove('drag-over');
    if (e.dataTransfer.files.length) load(Array.from(e.dataTransfer.files));
  };

  function tw() { return ($('#lsW')?.value === 'auto') ? Math.max(...images.map(i=>i.naturalWidth)) : +($('#lsW')?.value||1080); }
  function hh(i) { return Math.round(images[i].naturalHeight * tw() / images[i].naturalWidth); }

  function buildUI() {
    const maxOv = overlaps.map((_,i) => Math.min(hh(i), hh(i+1)));
    overlaps = overlaps.map((o,i) => Math.min(o, maxOv[i]));
    $('#lsSliders').innerHTML = overlaps.map((ov,i) =>
      `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;padding:3px 8px;background:var(--bg);border-radius:6px;font-size:0.8rem">
        <span style="color:var(--text-secondary);min-width:44px">${i+1}→${i+2}</span>
        <input type="range" min="0" max="${maxOv[i]}" value="${ov}" class="lr" data-i="${i}" style="flex:1;height:4px;accent-color:var(--cat-pdf)">
        <input type="number" min="0" max="${maxOv[i]}" value="${ov}" class="ln" data-i="${i}" style="width:64px;padding:2px 4px;text-align:right;border:1px solid var(--border);border-radius:4px;background:var(--bg-input);color:var(--text);font-size:0.76rem">
        <span style="color:var(--text-muted);font-size:0.65rem">px</span></div>`
    ).join('');
    $('#lsSliders').querySelectorAll('.lr').forEach(r => r.oninput = () => { overlaps[+r.dataset.i]=+r.value; $('#lsSliders').querySelectorAll('.ln')[+r.dataset.i].value=overlaps[+r.dataset.i]; draw(); });
    $('#lsSliders').querySelectorAll('.ln').forEach(n => n.oninput = () => { overlaps[+n.dataset.i]=+n.value||0; $('#lsSliders').querySelectorAll('.lr')[+n.dataset.i].value=overlaps[+n.dataset.i]; draw(); });
  }

  function draw() {
    const w=tw(), hs=images.map((_,i)=>hh(i));
    const s=Math.min(1,350/w), pw=Math.round(w*s), phs=hs.map(h=>Math.round(h*s)), ovs=overlaps.map(o=>Math.round(o*s));
    const pos=[0]; for(let i=0;i<overlaps.length;i++) pos.push(pos[i]+phs[i]-ovs[i]);
    const th=pos[overlaps.length]+phs[overlaps.length];
    const cv=document.createElement('canvas');cv.width=pw;cv.height=th;
    const cx=cv.getContext('2d');cx.fillStyle='#e8e8e8';cx.fillRect(0,0,pw,th);
    // Draw bottom-up so image 2 covers image 1's bottom in overlap zone
    for(let i=images.length-1;i>=0;i--) {
      cx.fillStyle='#fff';cx.fillRect(0,pos[i],pw,phs[i]);
      cx.drawImage(images[i],0,pos[i],pw,phs[i]);
    }
    for(let i=0;i<overlaps.length;i++) {
      const y=pos[i+1];
      if(ovs[i]>2){cx.fillStyle='rgba(37,99,235,0.12)';cx.fillRect(0,y,pw,ovs[i]);}
      cx.strokeStyle='#2563eb';cx.lineWidth=1;cx.setLineDash([3,3]);
      cx.beginPath();cx.moveTo(0,y);cx.lineTo(pw,y);cx.stroke();cx.setLineDash([]);
    }
    const d=$('#lsPrev');d.width=pw;d.height=th;d.getContext('2d').drawImage(cv,0,0);
    d.style.width=Math.min(pw,350)+'px';d.style.height='auto';
  }

  // ===== Auto-detect: row-signature template matching =====
  $('#lsAuto').onclick = () => {
    const btn=$('#lsAuto');btn.textContent='⏳ ...';btn.disabled=true;
    const w=tw(), cw=200; let diag=[], found=0;

    setTimeout(() => {
      for(let i=0;i<images.length-1;i++) {
        const ch1=Math.round(images[i].naturalHeight*cw/images[i].naturalWidth);
        const ch2=Math.round(images[i+1].naturalHeight*cw/images[i+1].naturalWidth);
        const ca=document.createElement('canvas');ca.width=cw;ca.height=ch1;ca.getContext('2d').drawImage(images[i],0,0,cw,ch1);
        const cb=document.createElement('canvas');cb.width=cw;cb.height=ch2;cb.getContext('2d').drawImage(images[i+1],0,0,cw,ch2);
        const sig=c=>{const a=[],cx=c.getContext('2d');for(let y=0;y<c.height;y++){const d=cx.getImageData(0,y,cw,1).data;let s=0;for(let x=0;x<cw*4;x+=4)s+=d[x]*0.299+d[x+1]*0.587+d[x+2]*0.114;a.push(s/cw);}return a;};
        const sA=sig(ca),sB=sig(cb);

        // Template: bottom 25% of A (at least 20 rows)
        const tH=Math.max(20,Math.round(ch1*0.25));
        const tpl=sA.slice(ch1-tH);
        // Search: entire image B
        const srch=sB;

        // NCC
        const tM=tpl.reduce((a,b)=>a+b)/tH;
        const tS=Math.sqrt(tpl.reduce((a,b)=>a+(b-tM)**2,0)/tH)||1;
        let best=0,bestNCC=-2;
        for(let p=0;p<=srch.length-tH;p++){
          const sub=srch.slice(p,p+tH);
          const sM=sub.reduce((a,b)=>a+b)/tH;
          const sS=Math.sqrt(sub.reduce((a,b)=>a+(b-sM)**2,0)/tH)||1;
          let cov=0;for(let j=0;j<tH;j++)cov+=(tpl[j]-tM)*(sub[j]-sM);
          const ncc=cov/(tH*tS*sS);
          if(ncc>bestNCC){bestNCC=ncc;best=p;}
        }
        const scaleOv=best+tH, fullOv=Math.round(scaleOv*w/cw);
        diag.push(`图${i+1}→${i+2}: NCC=${bestNCC.toFixed(3)} 匹配位置=${best} 估算重叠=${fullOv}px`);
        if(bestNCC>0.55){overlaps[i]=Math.min(fullOv,Math.round(hh(i)*0.85));found++;}
        else{overlaps[i]=0;}
      }
      buildUI();draw();
      $('#lsDiag').style.display='block';
      $('#lsDiag').innerHTML=diag.map(d=>'<div>'+d+'</div>').join('');
      btn.textContent='🔍 自动检测重叠';btn.disabled=false;
      Utils.toast(found?`识别 ${found}/${overlaps.length} 处`:'未识别',found?'success':'info');
    },50);
  };

  // Export
  $('#lsExp').onclick=()=>{
    const w=tw(),hs=images.map((_,i)=>hh(i));
    let th=hs[0];for(let i=0;i<overlaps.length;i++)th+=hs[i+1]-overlaps[i];
    const cv=document.createElement('canvas');cv.width=w;cv.height=th;
    const cx=cv.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,w,th);
    // Draw bottom-up so later images cover earlier in overlap
    for(let i=images.length-1;i>=0;i--){
      let y=0;
      for(let j=0;j<i;j++)y+=hs[j]-(overlaps[j]||0);
      cx.drawImage(images[i],0,y,w,hs[i]);
    }
    cv.toBlob(b=>{
      edit.classList.add('hidden');done.classList.remove('hidden');
      $('#lsRes').width=w;$('#lsRes').height=th;
      $('#lsRes').style.maxWidth=Math.min(w,600)+'px';$('#lsRes').style.height='auto';
      $('#lsRes').getContext('2d').drawImage(cv,0,0);$('#lsRes')._blob=b;
    },'image/png');
  };

  $('#lsW').onchange=()=>{buildUI();draw();};
  $('#lsReset').onclick=()=>{images=[];overlaps=[];pick.classList.remove('hidden');edit.classList.add('hidden');done.classList.add('hidden');};
  $('#lsDl').onclick=()=>{const b=$('#lsRes')._blob;if(b)Utils.download(b,'长截图_'+new Date().toISOString().slice(0,10)+'.png');};
  $('#lsCopy').onclick=async()=>{
    const b=$('#lsRes')._blob;if(!b)return;
    try{await navigator.clipboard.write([new ClipboardItem({'image/png':b})]);Utils.toast('已复制','success');}
    catch(e){const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='long.png';a.click();}
  };
  $('#lsBack').onclick=()=>{done.classList.add('hidden');edit.classList.remove('hidden');};
}
function Tool_long_screenshot_deactivate() {}
