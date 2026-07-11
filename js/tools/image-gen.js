// ===== Image2.0 生图 — RunningHub ChatGPT Image 2.0 API =====
function Tool_image_gen(container) {
  // Try deployed proxy first, fallback to localhost
  const PROXY_URLS = [
    'https://YOUR_APP.railway.app',  // ← 部署后替换为 Railway 地址
    'http://localhost:8765',
  ];
  let activeProxy = PROXY_URLS[0];
  let generatedImages = [];
  let isGenerating = false;

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

  let refImageData = null;
  let proxyAvailable = false;

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

    // Preview
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Scale for preview
        const maxW = 200;
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        previewCanvas.width = w;
        previewCanvas.height = h;
        previewCanvas.getContext('2d').drawImage(img, 0, 0, w, h);
        previewCanvas.style.display = 'block';
      };
      img.src = reader.result;

      // Store as base64 for API
      refImageData = reader.result;
    };
    reader.readAsDataURL(f);
  };
  clearImgBtn.onclick = () => {
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
        const resp = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3000) });
        if (resp.ok) {
          activeProxy = url;
          proxyAvailable = true;
          break;
        }
      } catch(e) {}
    }
    if (proxyAvailable) {
      proxyStatus.innerHTML = `🟢 生图代理已连接<br><small style="color:var(--text-muted)">${activeProxy}</small>`;
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

      // Submit task
      statusDiv.innerHTML = '<div class="progress-bar"><div class="progress-bar-fill" style="width:50%"></div></div><div class="progress-text">AI 正在生图...</div>';

      const resp = await fetch(`${activeProxy}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await resp.json();

      if (!data.success || !data.taskId) {
        throw new Error(data.error || '提交失败');
      }

      // Poll for result
      let attempts = 0;
      const maxAttempts = 120;
      const pollInterval = 3000;

      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, pollInterval));
        attempts++;

        const pct = Math.min(90, 30 + (attempts / maxAttempts) * 60);
        statusDiv.innerHTML = `<div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div><div class="progress-text">生成中... (${Math.round(attempts * 3)}秒)</div>`;

        const pollResp = await fetch(`${activeProxy}/api/task/${data.taskId}`);
        const pollData = await pollResp.json();

        if (!pollData.success) {
          throw new Error(pollData.error || '任务失败');
        }

        if (pollData.status === 'SUCCESS' && pollData.images) {
          generatedImages = pollData.images;
          renderResults(pollData.images);
          statusDiv.innerHTML = '<div style="color:var(--success)">✅ 生成完成！</div>';
          Utils.toast(`生成 ${pollData.images.length} 张图片`, 'success');
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
      // Use proxy to fetch image (avoid CORS issues with the CDN)
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

    // Bind download buttons
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
          // Fallback: open in new tab
          window.open(url, '_blank');
          this.textContent = '📥 重试';
          this.disabled = false;
        }
      };
    });

    // Bind view buttons
    resultsDiv.querySelectorAll('.ig-view-btn').forEach(btn => {
      btn.onclick = function() {
        window.open(this.dataset.url, '_blank');
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

  // ── Init ──
  checkProxy();
}

function Tool_image_gen_deactivate() {}
