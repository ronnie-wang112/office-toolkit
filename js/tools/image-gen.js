// ===== Image2.0 生图 — RunningHub ChatGPT Image 2.0 API =====
function Tool_image_gen(container) {
  const HISTORY_KEY = 'image_gen_history';
  const MAX_HISTORY = 20;

  const PROXY_URLS = [
    'https://1316850592-flaadcrz81.ap-nanjing.tencentscf.com',
    'https://office-toolkit-production.up.railway.app',
    'http://localhost:8765',
  ];
  let activeProxy = PROXY_URLS[0];
  let generatedImages = [];
  let isGenerating = false;
  let history = loadHistory();

  const ASPECT_RATIOS = [
    { v: '1:1', label: '1:1 正方形' },
    { v: '2:3', label: '2:3 竖版' },
    { v: '3:2', label: '3:2 横版' },
    { v: '4:3', label: '4:3 标准' },
    { v: '3:4', label: '3:4 竖版' },
    { v: '16:9', label: '16:9 宽屏' },
    { v: '9:16', label: '9:16 手机' },
    { v: '21:9', label: '21:9 超宽' },
  ];

  const RESOLUTIONS = [
    { v: '1k', label: '1K 标清' },
    { v: '2k', label: '2K 高清' },
    { v: '4k', label: '4K 超清' },
  ];

  container.innerHTML = `
    <div style="max-width:800px;margin:0 auto">
      <div class="form-group">
        <label>🎨 图片描述 (Prompt)</label>
        <textarea id="igPrompt" rows="3" placeholder="描述你想生成的图片内容，越详细越好...
例如：一只可爱的橘猫坐在窗台上，阳光洒在它身上，窗外是樱花树，摄影风格，高画质" style="width:100%;resize:vertical;font-size:0.9rem;padding:12px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);color:var(--text)"></textarea>
        <div style="font-size:0.72rem;color:var(--text-muted);margin-top:4px"><span id="igCharCount">0</span>/20000 字符</div>
      </div>

      <div class="form-group">
        <label>🖼️ 参考图片（可选）</label>
        <div style="display:flex;gap:8px;align-items:center">
          <input type="file" id="igImageInput" accept="image/*" style="display:none">
          <button class="btn btn-secondary btn-sm" id="igUploadBtn">📤 上传参考图</button>
          <span id="igImageLabel" style="font-size:0.78rem;color:var(--text-muted)">未选择</span>
          <button class="btn btn-sm" id="igClearImg" style="display:none;color:var(--danger)">✕ 移除</button>
        </div>
        <canvas id="igPreviewCanvas" style="display:none;max-width:200px;max-height:200px;margin-top:8px;border-radius:6px;border:1px solid var(--border)"></canvas>
      </div>

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">
        <div class="form-group" style="flex:1;min-width:150px">
          <label>📐 图片比例</label>
          <select id="igRatio">${ASPECT_RATIOS.map(r => `<option value="${r.v}">${r.label}</option>`).join('')}</select>
        </div>
        <div class="form-group" style="flex:1;min-width:150px">
          <label>🔍 分辨率</label>
          <select id="igResolution">${RESOLUTIONS.map(r => `<option value="${r.v}">${r.label}</option>`).join('')}</select>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:16px">
        <button class="btn btn-primary" id="igGenerate" style="flex:1">🎨 开始生成</button>
        <button class="btn btn-secondary" id="igClear">清空</button>
      </div>

      <div id="igStatus" style="text-align:center;margin-bottom:12px"></div>
      <div id="igResults" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px"></div>

      <div id="igHistory" style="margin-top:24px"></div>

      <div id="igProxyStatus" style="margin-top:16px;padding:8px 12px;border-radius:8px;font-size:0.78rem;text-align:center"></div>
    </div>
  `;

  const $ = s => container.querySelector(s);
  const promptEl = $('#igPrompt');
  const charCount = $('#igCharCount');
  const ratioSel = $('#igRatio');
  const resSel = $('#igResolution');
  const statusDiv = $('#igStatus');
  const resultsDiv = $('#igResults');
  const proxyStatus = $('#igProxyStatus');
  const previewCanvas = $('#igPreviewCanvas');
  const imageLabel = $('#igImageLabel');
  const clearImgBtn = $('#igClearImg');
  const historyDiv = $('#igHistory');

  let refImageData = null;
  let proxyAvailable = false;

  // ── History ──
  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch(e) { return []; }
  }

  function saveHistory(record) {
    history.unshift(record);
    if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch(e) {
      // Quota exceeded — strip refImage from oldest records
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].refImage) { history[i].refImage = null; break; }
      }
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch(e2) {}
    }
    renderHistory();
  }

  function renderHistory() {
    if (history.length === 0) { historyDiv.innerHTML = ''; return; }
    let html = '<div style="font-size:0.85rem;font-weight:600;margin-bottom:8px;color:var(--text-muted)">📋 历史记录</div>';
    history.forEach((h, idx) => {
      const modeLabel = h.mode === 'text-to-image' ? '文生图' : '图生图';
      const time = new Date(h.time).toLocaleString('zh-CN');
      html += `
        <div style="border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px;background:var(--bg-card)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-size:0.78rem;font-weight:600">${modeLabel} · ${h.ratio} · ${h.res}</span>
            <span style="font-size:0.7rem;color:var(--text-muted)">${time} · ⏱ ${h.duration || '?'}秒</span>
          </div>
          <div style="font-size:0.78rem;color:var(--text);margin-bottom:8px;line-height:1.4">${h.prompt}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:flex-start">
            ${h.refImage ? `<div style="position:relative;width:80px;height:80px;flex-shrink:0">
              <img src="${h.refImage}" style="width:80px;height:80px;object-fit:cover;border-radius:4px;border:1px solid var(--border);opacity:0.7" onclick="showLightbox('${h.refImage}')" title="参考图">
              <span style="position:absolute;top:2px;left:2px;font-size:0.6rem;background:rgba(0,0,0,0.6);color:#fff;padding:1px 4px;border-radius:2px">参考</span>
            </div>` : ''}
            ${(h.images || []).map((img, i) => `
              <img src="${img.url}" style="width:80px;height:80px;object-fit:cover;border-radius:4px;cursor:pointer;border:1px solid var(--border)"
                   onclick="showLightbox('${img.url}')" title="点击查看大图">
            `).join('')}
          </div>
          <div style="margin-top:6px;display:flex;gap:4px">
            <button class="btn btn-sm hist-replay-btn" data-idx="${idx}" style="font-size:0.72rem;padding:2px 8px">🔄 复用提示词</button>
            <button class="btn btn-sm hist-del-btn" data-idx="${idx}" style="font-size:0.72rem;padding:2px 8px;color:var(--danger)">🗑</button>
          </div>
        </div>`;
    });
    historyDiv.innerHTML = html;

    // Replay button
    historyDiv.querySelectorAll('.hist-replay-btn').forEach(btn => {
      btn.onclick = function() {
        const h = history[parseInt(this.dataset.idx)];
        promptEl.value = h.prompt;
        charCount.textContent = h.prompt.length;
        ratioSel.value = h.ratio;
        resSel.value = h.res;
        promptEl.scrollIntoView({ behavior: 'smooth' });
      };
    });

    // Delete button
    historyDiv.querySelectorAll('.hist-del-btn').forEach(btn => {
      btn.onclick = function() {
        history.splice(parseInt(this.dataset.idx), 1);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        renderHistory();
      };
    });
  }

  // ── Character count ──
  promptEl.addEventListener('input', () => {
    charCount.textContent = promptEl.value.length;
  });

  // ── Image upload ──
  $('#igUploadBtn').onclick = () => $('#igImageInput').click();
  $('#igImageInput').onchange = () => {
    const f = $('#igImageInput').files[0];
    if (!f) return;
    imageLabel.textContent = f.name;
    clearImgBtn.style.display = 'inline-block';

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 200;
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        previewCanvas.width = w;
        previewCanvas.height = h;
        previewCanvas.getContext('2d').drawImage(img, 0, 0, w, h);
        previewCanvas.style.display = 'block';
      };
      img.src = reader.result;
      refImageData = reader.result;
    };
    reader.readAsDataURL(f);
  };

  $('#igClearImg').onclick = () => {
    refImageData = null;
    previewCanvas.style.display = 'none';
    imageLabel.textContent = '未选择';
    clearImgBtn.style.display = 'none';
    $('#igImageInput').value = '';
  };

  // ── Check proxy ──
  async function checkProxy() {
    for (const url of PROXY_URLS) {
      try {
        const resp = await fetch(`${url}/?action=health`);
        if (resp.ok) {
          activeProxy = url;
          proxyAvailable = true;
          break;
        }
      } catch(e) {}
    }
    if (proxyAvailable) {
      proxyStatus.innerHTML = `🟢 生图代理已连接<br><small style="color:var(--text-muted)">${activeProxy || '同源部署'}</small>`;
      proxyStatus.style.background = 'var(--bg)';
    } else {
      proxyStatus.innerHTML = '🔴 生图代理未连接<br><small style="color:var(--text-muted)">请运行 ./start.sh 或部署云端代理</small>';
      proxyStatus.style.background = '#FEF2F2';
    }
    return proxyAvailable;
  }

  // ── Generate ──
  $('#igGenerate').onclick = async () => {
    if (isGenerating) return;

    const prompt = promptEl.value.trim();
    if (!prompt) { Utils.toast('请输入图片描述', 'error'); return; }
    if (prompt.length > 20000) { Utils.toast('描述不能超过20000字符', 'error'); return; }

    if (!await checkProxy()) {
      Utils.toast('代理未连接，请先运行 ./start.sh', 'error');
      return;
    }

    isGenerating = true;
    const genStartTime = Date.now();
    const btn = $('#igGenerate');
    btn.disabled = true;
    btn.textContent = '⏳ 排队中...';
    statusDiv.innerHTML = '<div class="progress-bar"><div class="progress-bar-fill" style="width:30%"></div></div><div class="progress-text">正在提交任务...</div>';

    try {
      const body = {
        prompt,
        aspectRatio: ratioSel.value,
        resolution: resSel.value,
      };
      if (refImageData) {
        body.imageData = refImageData;
      }

      statusDiv.innerHTML = '<div class="progress-bar"><div class="progress-bar-fill" style="width:50%"></div></div><div class="progress-text">AI 正在生图...</div>';

      body.action = 'generate';
      body.mode = refImageData ? 'image-to-image' : 'text-to-image';
      const resp = await fetch(`${activeProxy}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await resp.json();

      if (!data.success || !data.taskId) {
        throw new Error(data.error || '提交失败');
      }

      let attempts = 0;
      const maxAttempts = 200;
      const pollInterval = 3000;

      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, pollInterval));
        attempts++;

        const pct = Math.min(90, 30 + (attempts / maxAttempts) * 60);
        statusDiv.innerHTML = `<div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div><div class="progress-text">生成中... (${Math.round(attempts * 3)}秒)</div>`;

        const pollResp = await fetch(`${activeProxy}/?action=poll&taskId=${data.taskId}`);
        const pollData = await pollResp.json();

        if (!pollData.success) {
          throw new Error(pollData.error || '任务失败');
        }

        if (pollData.status === 'SUCCESS' && pollData.images) {
          generatedImages = pollData.images;
          renderResults(pollData.images);
          statusDiv.innerHTML = '<div style="color:var(--success)">✅ 生成完成！</div>';
          Utils.toast(`生成 ${pollData.images.length} 张图片`, 'success');

          // Save to history
          const genDuration = Math.round((Date.now() - genStartTime) / 1000);
          saveHistory({
            prompt,
            mode: refImageData ? 'image-to-image' : 'text-to-image',
            ratio: ratioSel.value,
            res: resSel.value,
            time: Date.now(),
            duration: genDuration,
            images: pollData.images,
            refImage: refImageData || null,
          });
          break;
        }
      }

      if (attempts >= maxAttempts) {
        throw new Error('生成超时，请重试');
      }

    } catch(e) {
      statusDiv.innerHTML = `<div style="color:var(--warning)">❌ ${e.message}</div>`;
      Utils.toast(e.message, 'error');
    }

    isGenerating = false;
    btn.disabled = false;
    btn.textContent = '🎨 开始生成';
  };

  // ── Render results ──
  function renderResults(images) {
    let html = '';
    images.forEach((img, i) => {
      html += `
        <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden;background:var(--bg-card)">
          <img src="${img.url}" style="width:100%;display:block" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22><rect fill=%22%23eee%22 width=%22200%22 height=%22200%22/><text x=%22100%22 y=%22105%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2240%22>🖼</text></svg>'">
          <div style="padding:8px;display:flex;gap:6px">
            <button class="btn btn-primary btn-sm ig-dl-btn" data-url="${img.url}" data-idx="${i}" style="flex:1">📥 下载</button>
            <button class="btn btn-secondary btn-sm ig-view-btn" data-url="${img.url}" style="flex:1">🔍 查看大图</button>
          </div>
        </div>`;
    });
    resultsDiv.innerHTML = html;

    resultsDiv.querySelectorAll('.ig-dl-btn').forEach(btn => {
      btn.onclick = async function() {
        const url = this.dataset.url;
        this.textContent = '⏳ 下载中...';
        this.disabled = true;
        try {
          const resp = await fetch(url);
          const blob = await resp.blob();
          Utils.download(blob, `image2.0_${Date.now()}.png`);
          this.textContent = '✅ 完成';
        } catch(e) {
          window.open(url, '_blank');
          this.textContent = '📥 重试';
          this.disabled = false;
        }
      };
    });

    resultsDiv.querySelectorAll('.ig-view-btn').forEach(btn => {
      btn.onclick = function() {
        showLightbox(this.dataset.url);
      };
    });
  }

  // ── Clear ──
  $('#igClear').onclick = () => {
    promptEl.value = '';
    charCount.textContent = '0';
    resultsDiv.innerHTML = '';
    statusDiv.innerHTML = '';
    generatedImages = [];
    refImageData = null;
    previewCanvas.style.display = 'none';
    imageLabel.textContent = '未选择';
    clearImgBtn.style.display = 'none';
  };

  // ── Lightbox ──
  window.showLightbox = function(url) {
    let lb = document.getElementById('igLightbox');
    if (!lb) {
      lb = document.createElement('div');
      lb.id = 'igLightbox';
      lb.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer';
      lb.onclick = () => lb.remove();
      document.body.appendChild(lb);
    }
    lb.innerHTML = '<img src="' + url + '" style="max-width:95vw;max-height:95vh;object-fit:contain;border-radius:8px;cursor:default" onclick="event.stopPropagation()">';
  };

  // ── Init ──
  checkProxy();
  renderHistory();
}

function Tool_image_gen_deactivate() {}
