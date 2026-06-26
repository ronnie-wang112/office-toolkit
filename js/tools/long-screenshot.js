// ===== 长截图拼接 v9 — 像素级模板匹配 + 修复渲染顺序 =====
function Tool_long_screenshot(container) {
  let images = [], overlaps = [];

  container.innerHTML = `
    <div id="lsPick">
      <div class="drop-zone" id="lsDrop">
        <div class="drop-zone-icon">📐</div>
        <div class="drop-zone-text">选择截图（2张以上，按滚动顺序）</div>
        <div class="drop-zone-hint">图1底部 = 图2顶部 → 自动覆盖重复区域</div>
      </div>
    </div>
    <div id="lsEdit" class="hidden">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px">
        <span style="font-weight:600" id="lsTitle"></span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-primary btn-sm" id="lsAuto">🔍 自动检测</button>
          <button class="btn btn-secondary btn-sm" id="lsReset">重选</button>
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

  async function load(files){
    images=[];
    for(const f of files){
      if(!f.type.startsWith('image/'))continue;
      const img=new Image();img.src=URL.createObjectURL(f);
      await new Promise(r=>img.onload=r);images.push(img);
    }
    if(images.length<2){Utils.toast('至少2张','error');return;}
    if(images.length>10)images=images.slice(0,10);
    overlaps=new Array(images.length-1).fill(0);
    pick.classList.add('hidden');edit.classList.remove('hidden');done.classList.add('hidden');
    $('#lsTitle').textContent=images.length+' 张截图 · 先点「自动检测」，滑块微调，导出';
    buildUI();draw();
  }

  async function pickFiles(){const f=await Utils.pickFiles('image/*',true);if(f?.length>=2)load(Array.from(f));else if(f?.length)Utils.toast('至少选2张','error');}
  $('#lsDrop').onclick=pickFiles;
  $('#lsDrop').ondragover=e=>{e.preventDefault();$('#lsDrop').classList.add('drag-over');};
  $('#lsDrop').ondragleave=()=>$('#lsDrop').classList.remove('drag-over');
  $('#lsDrop').ondrop=e=>{e.preventDefault();$('#lsDrop').classList.remove('drag-over');if(e.dataTransfer.files.length)load(Array.from(e.dataTransfer.files));};

  function tw(){const v=$('#lsW')?.value;return v==='auto'?Math.max(...images.map(i=>i.naturalWidth)):+v;}
  function hh(i){return Math.round(images[i].naturalHeight*tw()/images[i].naturalWidth);}

  function buildUI(){
    const maxOv=overlaps.map((_,i)=>Math.min(hh(i),hh(i+1)));
    overlaps=overlaps.map((o,i)=>Math.min(o,maxOv[i]));
    $('#lsSliders').innerHTML=overlaps.map((ov,i)=>
      `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;padding:3px 8px;background:var(--bg);border-radius:6px;font-size:0.8rem">
        <span style="color:var(--text-secondary);min-width:44px">${i+1}→${i+2}</span>
        <input type="range" min="0" max="${maxOv[i]}" value="${ov}" class="lr" data-i="${i}" style="flex:1;height:4px;accent-color:var(--cat-pdf)">
        <input type="number" min="0" max="${maxOv[i]}" value="${ov}" class="ln" data-i="${i}" style="width:64px;padding:2px 4px;text-align:right;border:1px solid var(--border);border-radius:4px;background:var(--bg-input);color:var(--text);font-size:0.76rem">
        <span style="color:var(--text-muted);font-size:0.65rem">px重叠</span></div>`
    ).join('');
    $('#lsSliders').querySelectorAll('.lr').forEach(r=>r.oninput=()=>{
      overlaps[+r.dataset.i]=+r.value;$('#lsSliders').querySelectorAll('.ln')[+r.dataset.i].value=overlaps[+r.dataset.i];draw();
    });
    $('#lsSliders').querySelectorAll('.ln').forEach(n=>n.oninput=()=>{
      overlaps[+n.dataset.i]=+n.value||0;$('#lsSliders').querySelectorAll('.lr')[+n.dataset.i].value=overlaps[+n.dataset.i];draw();
    });
  }

  function draw(){
    const w=tw(),hs=images.map((_,i)=>hh(i));
    const s=Math.min(1,350/w),pw=Math.round(w*s),phs=hs.map(h=>Math.round(h*s)),ovs=overlaps.map(o=>Math.round(o*s));
    const pos=[0];for(let i=0;i<overlaps.length;i++)pos.push(pos[i]+phs[i]-ovs[i]);
    const th=pos[overlaps.length]+phs[overlaps.length];
    const cv=document.createElement('canvas');cv.width=pw;cv.height=th;
    const cx=cv.getContext('2d');cx.fillStyle='#e0e0e0';cx.fillRect(0,0,pw,th);
    for(let i=0;i<images.length;i++){
      cx.fillStyle='#fff';cx.fillRect(0,pos[i],pw,phs[i]);
      cx.drawImage(images[i],0,pos[i],pw,phs[i]);
    }
    for(let i=0;i<overlaps.length;i++){
      const y=pos[i+1];
      if(ovs[i]>2){cx.fillStyle='rgba(37,99,235,0.12)';cx.fillRect(0,y,pw,ovs[i]);}
      cx.strokeStyle='#2563eb';cx.lineWidth=1;cx.setLineDash([3,3]);
      cx.beginPath();cx.moveTo(0,y);cx.lineTo(pw,y);cx.stroke();cx.setLineDash([]);
      if(overlaps[i]>5){cx.fillStyle='#2563eb';cx.font='9px sans-serif';cx.fillText('重叠 '+overlaps[i]+'px',4,y-3);}
    }
    const d=$('#lsPrev');d.width=pw;d.height=th;d.getContext('2d').drawImage(cv,0,0);
    d.style.width=Math.min(pw,350)+'px';d.style.height='auto';
  }

  // ===== MSE pixel matching =====
  $('#lsAuto').onclick=()=>{
    const btn=$('#lsAuto');btn.textContent='⏳ 像素匹配中...';btn.disabled=true;
    const w=tw(),cw=200;let diag=[],found=0;

    setTimeout(()=>{
      for(let i=0;i<images.length-1;i++){
        const ch1=Math.round(images[i].naturalHeight*cw/images[i].naturalWidth);
        const ch2=Math.round(images[i+1].naturalHeight*cw/images[i+1].naturalWidth);
        const ca=document.createElement('canvas');ca.width=cw;ca.height=ch1;
        ca.getContext('2d').drawImage(images[i],0,0,cw,ch1);
        const cb=document.createElement('canvas');cb.width=cw;cb.height=ch2;
        cb.getContext('2d').drawImage(images[i+1],0,0,cw,ch2);
        const ctxA=ca.getContext('2d'),ctxB=cb.getContext('2d');

        const maxOv=Math.min(ch1,ch2);
        let best=0,bestMSE=1e9;
        const sampleRows=30; // compare up to 30 rows per offset

        for(let o=5;o<=maxOv;o+=2){
          let mse=0,cnt=0;
          const step=Math.max(1,Math.floor(o/sampleRows));
          for(let dy=0;dy<o;dy+=step){
            const dA=ctxA.getImageData(0,ch1-o+dy,cw,1).data;
            const dB=ctxB.getImageData(0,dy,cw,1).data;
            for(let x=0;x<cw*4;x+=8){
              const dr=dA[x]-dB[x],dg=dA[x+1]-dB[x+1],db=dA[x+2]-dB[x+2];
              mse+=dr*dr+dg*dg+db*db;cnt++;
            }
          }
          if(cnt){mse/=cnt;if(mse<bestMSE){bestMSE=mse;best=o;}}
        }

        const fullOv=Math.round(best*tw()/cw);
        // Threshold: MSE < 500 = good match (for 0-255 RGB, identical=0, noise≈200)
        const isMatch=bestMSE<500;
        diag.push(`图${i+1}→${i+2}: MSE=${bestMSE.toFixed(0)} → ${isMatch?'✓ 重叠 '+fullOv+'px':'✗ 无匹配'}`);
        if(isMatch){overlaps[i]=Math.min(fullOv,Math.round(hh(i)*0.85));found++;}
        else{overlaps[i]=0;}
      }
      buildUI();draw();
      $('#lsDiag').style.display='block';$('#lsDiag').innerHTML=diag.map(d=>'<div>'+d+'</div>').join('');
      btn.textContent='🔍 自动检测';btn.disabled=false;
      Utils.toast(found?`发现 ${found}/${overlaps.length} 处重叠`:'未检测到重叠，请手动拖滑块',found?'success':'info');
    },50);
  };

  // Export with correct draw order
  $('#lsExp').onclick=()=>{
    const w=tw(),hs=images.map((_,i)=>hh(i));
    let th=hs[0];for(let i=0;i<overlaps.length;i++)th+=hs[i+1]-overlaps[i];
    const cv=document.createElement('canvas');cv.width=w;cv.height=th;
    const cx=cv.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,w,th);
    // Draw in order: image 0 first, then 1, 2... so later images COVER earlier ones in overlap
    let y=0;
    for(let i=0;i<images.length;i++){
      cx.drawImage(images[i],0,y,w,hs[i]);
      y+=hs[i];
      if(i<overlaps.length)y-=overlaps[i];
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
