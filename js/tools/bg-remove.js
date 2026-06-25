async function Tool_bg_remove(container) {
  let imgFile = null;

  container.innerHTML = `
    <div class="drop-zone" id="bgDrop">
      <div class="drop-zone-icon">🎭</div>
      <div class="drop-zone-text">选择要去背景的图片</div>
      <div class="drop-zone-hint">AI 本地处理，不上传数据 · 首次需联网下载模型（约40MB）</div>
    </div>
    <div id="bgResult" class="hidden">
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <h4 style="margin-bottom:8px;color:var(--text-muted);font-size:0.8rem">原图</h4>
          <img id="bgOriginal" style="max-width:100%;border-radius:var(--radius-xs)">
        </div>
        <div style="flex:1;min-width:200px">
          <h4 style="margin-bottom:8px;color:var(--text-muted);font-size:0.8rem">去背景后</h4>
          <img id="bgOutput" style="max-width:100%;border-radius:var(--radius-xs);background:repeating-conic-gradient(#e2e8f0 0% 25%, transparent 0% 50%) 50% / 20px 20px">
        </div>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" id="bgDownload">下载 PNG（透明背景）</button>
        <button class="btn btn-secondary" id="bgRetry">重新选择</button>
      </div>
    </div>
    <input type="file" id="bgInput" accept="image/*" style="display:none">
    <div class="progress-bar hidden" id="bgProgress"><div class="progress-bar-fill"></div></div>
    <div class="progress-text hidden" id="bgProgressText">正在加载 AI 模型...</div>
  `;

  const dropZone = container.querySelector('#bgDrop');
  const fileInput = container.querySelector('#bgInput');
  const result = container.querySelector('#bgResult');
  const progress = container.querySelector('#bgProgress');
  const progressText = container.querySelector('#bgProgressText');
  const bar = progress.querySelector('.progress-bar-fill');

  let resultBlob = null;

  async function processImage(file) {
    imgFile = file;
    progress.classList.remove('hidden');
    progressText.classList.remove('hidden');
    bar.style.width = '10%';
    progressText.textContent = '正在加载 AI 模型（首次约 30 秒）...';

    try {
      container.querySelector('#bgOriginal').src = URL.createObjectURL(file);
      progressText.textContent = '正在处理图片...';
      bar.style.width = '30%';

      // Try jsdelivr first (better in China), fallback to unpkg
      let removeBackground;
      try {
        const mod = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/dist/background-removal.es.js');
        removeBackground = mod.removeBackground;
      } catch {
        const mod = await import('https://unpkg.com/@imgly/background-removal@1.7.0/dist/background-removal.es.js');
        removeBackground = mod.removeBackground;
      }

      bar.style.width = '50%';
      progressText.textContent = 'AI 正在识别主体...';

      const blob = await removeBackground(file, {
        progress: (key, current, total) => {
          const pct = 50 + ((current / total) * 40);
          bar.style.width = pct + '%';
          progressText.textContent = `AI 正在识别主体... ${Math.round(current / total * 100)}%`;
        },
      });

      bar.style.width = '95%';
      resultBlob = blob;
      const url = URL.createObjectURL(blob);
      container.querySelector('#bgOutput').src = url;
      bar.style.width = '100%';
      progressText.textContent = '处理完成！';

      result.classList.remove('hidden');
      dropZone.classList.add('hidden');
    } catch (err) {
      Utils.toast('抠图失败：模型下载失败，请检查网络', 'error');
      console.error(err);
    }
    setTimeout(() => { progress.classList.add('hidden'); progressText.classList.add('hidden'); }, 2000);
  }

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) processImage(f);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) processImage(fileInput.files[0]);
  });

  container.querySelector('#bgDownload').addEventListener('click', () => {
    if (resultBlob) {
      Utils.download(resultBlob, Utils.getName(imgFile.name) + '_透明.png');
      Utils.toast('已下载透明背景图片', 'success');
    }
  });

  container.querySelector('#bgRetry').addEventListener('click', () => {
    result.classList.add('hidden');
    dropZone.classList.remove('hidden');
    resultBlob = null;
  });
}
