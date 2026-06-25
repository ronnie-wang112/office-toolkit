function Tool_img_convert(container) {
  let imgFile = null;
  let imgObj = null;

  const formats = [
    { id: 'image/jpeg', label: 'JPEG', ext: 'jpg' },
    { id: 'image/png', label: 'PNG', ext: 'png' },
    { id: 'image/webp', label: 'WebP', ext: 'webp' },
  ];

  container.innerHTML = `
    <div class="drop-zone" id="convertDrop">
      <div class="drop-zone-icon">🔄</div>
      <div class="drop-zone-text">选择要转换的图片</div>
      <div class="drop-zone-hint">支持 PNG, JPG, WebP, BMP, GIF</div>
    </div>
    <div id="convertInfo" class="hidden">
      <div class="file-item" id="convertFileItem"></div>
      <div class="preview-container"><img id="convertPreview" style="max-width:400px"></div>
      <div class="form-group" style="max-width:250px;margin-top:12px">
        <label>转换为</label>
        <select id="convertTarget"></select>
      </div>
      <div class="form-group" style="max-width:150px" id="convertQualityGrp">
        <label>质量</label>
        <input type="number" id="convertQuality" value="0.92" min="0.1" max="1" step="0.05">
      </div>
      <button class="btn btn-primary" id="convertBtn">转换并下载</button>
    </div>
    <input type="file" id="convertInput" accept="image/*" style="display:none">
  `;

  const dropZone = container.querySelector('#convertDrop');
  const fileInput = container.querySelector('#convertInput');
  const info = container.querySelector('#convertInfo');
  const targetSelect = container.querySelector('#convertTarget');
  const qualityGrp = container.querySelector('#convertQualityGrp');
  const convertBtn = container.querySelector('#convertBtn');
  const previewImg = container.querySelector('#convertPreview');

  targetSelect.innerHTML = formats.map(f => `<option value="${f.id}">${f.label} (.${f.ext})</option>`).join('');
  targetSelect.addEventListener('change', () => {
    qualityGrp.classList.toggle('hidden', targetSelect.value === 'image/png');
  });

  async function loadFile(file) {
    imgFile = file;
    imgObj = await Utils.loadImageFromFile(file);
    previewImg.src = URL.createObjectURL(file);
    container.querySelector('#convertFileItem').innerHTML = `
      <span>🖼️</span><span class="file-name">${file.name}</span>
      <span class="file-size">${Utils.formatSize(file.size)}</span>
      <span style="color:var(--text-muted);font-size:0.75rem">${imgObj.width}×${imgObj.height}</span>`;
    info.classList.remove('hidden');
    dropZone.classList.add('hidden');
  }

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) loadFile(f);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) loadFile(fileInput.files[0]);
  });

  convertBtn.addEventListener('click', async () => {
    if (!imgObj) return;
    convertBtn.disabled = true;
    try {
      const fmt = targetSelect.value;
      const info = formats.find(f => f.id === fmt);
      const quality = parseFloat(container.querySelector('#convertQuality').value) || 0.92;
      const canvas = Utils.imageToCanvas(imgObj);
      const blob = await Utils.canvasToBlob(canvas, fmt, quality);
      Utils.download(blob, Utils.getName(imgFile.name) + '.' + info.ext);
      Utils.toast('格式转换完成', 'success');
    } catch (err) { Utils.toast('转换失败', 'error'); }
    convertBtn.disabled = false;
  });
}
