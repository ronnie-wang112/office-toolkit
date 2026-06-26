// ===== 长截图拼接 v10 — Picsew 风格多区域配准 + 投票 + 增量拼接 =====
function Tool_long_screenshot(container) {
  let images = [], overlaps = [];

  container.innerHTML = `
    <div id="lsPick">
      <div class="drop-zone" id="lsDrop">
        <div class="drop-zone-icon">📐</div>
        <div class="drop-zone-text">选择截图（2张以上，按滚动顺序）</div>
        <div class="drop-zone-hint">自动检测重复区域并覆盖，仅保留新内容</div>
      </div>
    </div>
    <div id="lsEdit" class="hidden">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px">
        <span style="font-weight:600" id="lsTitle"></span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-primary btn-sm" id="lsAuto">🔍 自动检测重叠</button>
          <button class="btn btn-secondary btn-sm" id="lsReset">重选图片</button>
        </div>
      </div>
      <div id="lsSliders"></div>
      <div id="lsDiag" style="font-size:0.7rem;color:var(--text-secondary);margin:4px 0;display:none;line-height:1.5"></div>
      <div style="text-align:center;background:#e8e8e8;border-radius:8px;padding:6px;overflow:auto;max-height:380px">
        <canvas id="lsPrev" style="display:block;margin:0 auto"></canvas>
      </div>
      <div style="display:flex;justify-content:flex-end;align-items:flex-end;gap:10px;margin-top:8px;flex-wrap:wrap">
        <div class="form-group" style="max-width:110px"><label>输出宽度</label><select id="lsW"><option value="auto">原始</option><option value="1080">1080</option><option value="750">750</option></select></div>
        <button class="btn btn-primary" id="lsExp">📥 导出长图</button>
      </div>
    </div>
    <div id="lsDone" class="hidden">
      <canvas id="lsRes" style="display:block;max-width:100%;height:auto;margin:0 auto;border:1px solid var(--border);border-radius:8px"></canvas>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:10px;flex-wrap:wrap">
        <button class="btn btn-primary" id="lsDl">下载 PNG</button>
        <button class="btn btn-secondary" id="lsCopy">复制</button>
        <button class="btn btn-secondary" id="lsBack">← 返回调整</button>
      </div>
    </div>
  `;

  const $=s=>container.querySelector(s);
  const pick=$('#lsPick'),edit=$('#lsEdit'),done=$('#lsDone');

  // File loading
  async function load(files){
    images=[];for(const f of files){
      if(!f.type.startsWith('image/'))continue;
      const img=new Image();img.src=URL.createObjectURL(f);
      await new Promise(r=>img.onload=r);images.push(img);
    }
    if(images.length<2){Utils.toast('至少2张','error');return;}
    if(images.length>10)images=images.slice(0,10);
    overlaps=new Array(images.length-1).fill(0);
    pick.classList.add('hidden');edit.classList.remove('hidden');done.classList.add('hidden');
    $('#lsTitle').textContent=images.length+' 张 · 先点自动检测，滑块微调，导出';
    buildUI();draw();
  }
  async function pf(){const f=await Utils.pickFiles('image/*',true);if(f?.length>=2)load(Array.from(f));else if(f?.length)Utils.toast('至少选2张','error');}
  $('#lsDrop').onclick=pf;
  $('#lsDrop').ondragover=e=>{e.preventDefault();$('#lsDrop').classList.add('drag-over');};
  $('#lsDrop').ondragleave=()=>$('#lsDrop').classList.remove('drag-over');
  $('#lsDrop').ondrop=e=>{e.preventDefault();$('#lsDrop').classList.remove('drag-over');if(e.dataTransfer.files.length)load(Array.from(e.dataTransfer.files));};

  function tw(){const v=$('#lsW')?.value;return v==='auto'?Math.max(...images.map(i=>i.naturalWidth)):+v;}
  function hh(i){return Math.round(images[i].naturalHeight*tw()/images[i].naturalWidth);}

  function buildUI(){
    const mx=overlaps.map((_,i)=>Math.min(hh(i),hh(i+1)));
    overlaps=overlaps.map((o,i)=>Math.min(o,mx[i]));
    $('#lsSliders').innerHTML=overlaps.map((ov,i)=>
      `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;padding:3px 8px;background:var(--bg);border-radius:6px;font-size:0.8rem">
        <span style="color:var(--text-secondary);min-width:44px">${i+1}→${i+2}</span>
        <input type="range" min="0" max="${mx[i]}" value="${ov}" class="lr" data-i="${i}" style="flex:1;height:4px;accent-color:var(--cat-pdf)">
        <span class="lv" style="min-width:48px;text-align:right;font-weight:600;font-size:0.85rem;color:var(--cat-pdf)">${ov}px</span></div>`
    ).join('');
    $('#lsSliders').querySelectorAll('.lr').forEach(r=>r.oninput=()=>{
      overlaps[+r.dataset.i]=+r.value;
      $('#lsSliders').querySelectorAll('.lv')[+r.dataset.i].textContent=overlaps[+r.dataset.i]+'px';
      draw();
    });
  }

  function draw(){
    const w=tw(),hs=images.map((_,i)=>hh(i));
    const s=Math.min(1,350/w),pw=Math.round(w*s),phs=hs.map(h=>Math.round(h*s)),ovs=overlaps.map(o=>Math.round(o*s));
    // Compute each image's rendered height (= full height - overlap with PREVIOUS)
    const renderH=[phs[0]];
    for(let i=1;i<images.length;i++)renderH.push(phs[i]-ovs[i-1]);
    const pos=[0];
    for(let i=1;i<images.length;i++)pos.push(pos[i-1]+renderH[i-1]);
    const th=pos[images.length-1]+renderH[images.length-1];

    const cv=document.createElement('canvas');cv.width=pw;cv.height=th;
    const cx=cv.getContext('2d');cx.fillStyle='#e0e0e0';cx.fillRect(0,0,pw,th);
    for(let i=0;i<images.length;i++){
      // Crop: image i is drawn fully from its top, but its top 'overlaps[i-1]' is covered by previous image
      const srcY=(i>0)?ovs[i-1]:0;
      const srcH=phs[i]-srcY;
      cx.fillStyle='#fff';cx.fillRect(0,pos[i],pw,renderH[i]);
      cx.drawImage(images[i],0,srcY,pw,srcH,0,pos[i],pw,renderH[i]);
    }
    // Overlap boundaries
    for(let i=0;i<overlaps.length;i++){
      if(ovs[i]>2){cx.fillStyle='rgba(37,99,235,0.10)';cx.fillRect(0,pos[i+1]-ovs[i],pw,ovs[i]);}
      cx.strokeStyle='#2563eb';cx.lineWidth=1;cx.setLineDash([3,3]);
      cx.beginPath();cx.moveTo(0,pos[i+1]);cx.lineTo(pw,pos[i+1]);cx.stroke();cx.setLineDash([]);
    }
    const d=$('#lsPrev');d.width=pw;d.height=th;d.getContext('2d').drawImage(cv,0,0);
    d.style.width=Math.min(pw,350)+'px';d.style.height='auto';
  }

  // ===== 多区域配准 + 投票 (Picsew style) =====
  $('#lsAuto').onclick=()=>{
    const btn=$('#lsAuto');btn.textContent='⏳ ...';btn.disabled=true;
    const w=tw(),cw=250;let diag=[],found=0;

    setTimeout(()=>{
      for(let i=0;i<images.length-1;i++){
        const ch1=Math.round(images[i].naturalHeight*cw/images[i].naturalWidth);
        const ch2=Math.round(images[i+1].naturalHeight*cw/images[i+1].naturalWidth);

        const ca=document.createElement('canvas');ca.width=cw;ca.height=ch1;
        ca.getContext('2d').drawImage(images[i],0,0,cw,ch1);
        const cb=document.createElement('canvas');cb.width=cw;cb.height=ch2;
        cb.getContext('2d').drawImage(images[i+1],0,0,cw,ch2);

        const ctxA=ca.getContext('2d'),ctxB=cb.getContext('2d');
        const hA=ch1,hB=ch2,maxOv=Math.min(hA,hB);

        // Extract 5 horizontal bands from potential overlap zone
        const NUM_BANDS=5;
        const bandH=40; // each band 40 rows tall at comparison resolution

        // For each candidate overlap, compute MSE per band, then vote
        let bestOv=0,bestVotes=0;
        const tolerance=600; // MSE tolerance per band

        for(let o=10;o<=maxOv;o+=4){
          // Position 5 bands: spread evenly across the overlap zone
          const bandPositions=[];
          for(let b=0;b<NUM_BANDS;b++)bandPositions.push(Math.round(o*(b+1)/(NUM_BANDS+1)));

          const bandMSEs=[];
          for(const bp of bandPositions){
            // Compare row 'hA - o + bp' from A with row 'bp' from B
            const dA=ctxA.getImageData(0,hA-o+bp,cw,bandH).data;
            const dB=ctxB.getImageData(0,bp,cw,bandH).data;
            let mse=0;
            for(let idx=0;idx<cw*bandH*4;idx+=8){
              const dr=dA[idx]-dB[idx],dg=dA[idx+1]-dB[idx+1],db=dA[idx+2]-dB[idx+2];
              mse+=dr*dr+dg*dg+db*db;
            }
            mse/=(cw*bandH*4/8);
            bandMSEs.push(mse);
          }

          // Vote: count bands with MSE < tolerance
          const votes=bandMSEs.filter(m=>m<tolerance).length;
          if(votes>bestVotes){bestVotes=votes;bestOv=o;}
        }

        const fullOv=Math.round(bestOv*w/cw);
        const pass=bestVotes>=4; // ≥75% = 4/5 bands
        diag.push(`图${i+1}→${i+2}: ${bestVotes}/${NUM_BANDS}票 → ${pass?'✓ 重叠 '+fullOv+'px':'✗ 无匹配'}`);

        if(pass){overlaps[i]=Math.min(fullOv,Math.round(hh(i)*0.85));found++;}
        else{overlaps[i]=0;}
      }
      buildUI();draw();
      $('#lsDiag').style.display='block';$('#lsDiag').innerHTML=diag.map(d=>'<div>'+d+'</div>').join('');
      btn.textContent='🔍 自动检测';btn.disabled=false;
      Utils.toast(found?`检测到 ${found}/${overlaps.length} 处重叠`:'未检测到，请手动拖动滑块',found?'success':'info');
    },50);
  };

  // Export: incremental stitch (only new content)
  $('#lsExp').onclick=()=>{
    const w=tw(),hs=images.map((_,i)=>hh(i));
    const renderH=[hs[0]];
    for(let i=1;i<images.length;i++)renderH.push(hs[i]-overlaps[i-1]);
    const th=renderH.reduce((a,b)=>a+b,0);

    const cv=document.createElement('canvas');cv.width=w;cv.height=th;
    const cx=cv.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,w,th);

    let y=0;
    for(let i=0;i<images.length;i++){
      const srcY=(i>0)?overlaps[i-1]:0;
      const srcH=hs[i]-srcY;
      cx.drawImage(images[i],0,srcY,w,srcH,0,y,w,renderH[i]);
      y+=renderH[i];
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
function Tool_long_screenshot_deactivate(){}
