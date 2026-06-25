async function Tool_ocr(container) {
  let imgDataUrl = null;

  container.innerHTML = `
    <div class="form-row">
      <div class="form-group" style="max-width:200px">
        <label>识别语言</label>
        <select id="ocrLang">
          <option value="chi_sim+eng">中文 + 英文</option>
          <option value="eng">仅英文</option>
          <option value="chi_sim">仅中文</option>
        </select>
      </div>
    </div>
    <div class="drop-zone" id="ocrDrop">
      <div class="drop-zone-icon">🔍</div>
      <div class="drop-zone-text">选择包含文字的图片</div>
      <div class="drop-zone-hint">首次加载语言包约需 10 秒，之后会缓存</div>
    </div>
    <div id="ocrResult" class="hidden">
      <div class="preview-container"><img id="ocrPreview" style="max-width:400px"></div>
      <div style="margin-top:12px">
        <label style="font-size:0.875rem;font-weight:500">识别结果</label>
        <textarea id="ocrText" readonly style="width:100%;min-height:200px;margin-top:4px"></textarea>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" id="ocrCopy">复制文本</button>
        <button class="btn btn-secondary" id="ocrRetry">重新识别</button>
      </div>
    </div>
    <input type="file" id="ocrInput" accept="image/*" style="display:none">
    <div class="progress-bar hidden" id="ocrProgress"><div class="progress-bar-fill"></div></div>
    <div class="progress-text hidden" id="ocrProgressText"></div>
  `;

  const dropZone = container.querySelector('#ocrDrop');
  const fileInput = container.querySelector('#ocrInput');
  const result = container.querySelector('#ocrResult');
  const textArea = container.querySelector('#ocrText');
  const preview = container.querySelector('#ocrPreview');
  const progress = container.querySelector('#ocrProgress');
  const progressText = container.querySelector('#ocrProgressText');
  const bar = progress.querySelector('.progress-bar-fill');
  const langSelect = container.querySelector('#ocrLang');

  async function doOCR(file) {
    imgDataUrl = URL.createObjectURL(file);
    preview.src = imgDataUrl;
    progress.classList.remove('hidden');
    progressText.classList.remove('hidden');
    bar.style.width = '5%';

    try {
      const { createWorker } = await import('../../lib/tesseract.esm.min.js');
      progressText.textContent = '正在初始化 OCR 引擎...';

      const worker = await createWorker(langSelect.value, 1, {
        workerPath: 'lib/tesseract.worker.min.js',
        logger: (m) => {
          if (m.status === 'recognizing text') {
            bar.style.width = (30 + m.progress * 65) + '%';
            progressText.textContent = `正在识别文字... ${Math.round(m.progress * 100)}%`;
          } else {
            progressText.textContent = m.status;
            bar.style.width = m.status === 'loading tesseract core' ? '15%'
              : m.status === 'initializing tesseract' ? '20%'
              : m.status === 'loading language traineddata' ? '25%'
              : m.status === 'initializing api' ? '28%'
              : bar.style.width;
          }
        },
      });

      const { data } = await worker.recognize(file);
      bar.style.width = '100%';
      progressText.textContent = '识别完成！';

      textArea.value = data.text;
      result.classList.remove('hidden');
      dropZone.classList.add('hidden');
      await worker.terminate();
    } catch (err) {
      Utils.toast('OCR 失败: ' + err.message, 'error');
      console.error(err);
    }
    setTimeout(() => { progress.classList.add('hidden'); progressText.classList.add('hidden'); }, 1500);
  }

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) doOCR(f);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) doOCR(fileInput.files[0]);
  });

  container.querySelector('#ocrCopy').addEventListener('click', () => {
    navigator.clipboard.writeText(textArea.value).then(() => {
      Utils.toast('已复制到剪贴板', 'success');
    }).catch(() => {
      textArea.select();
      document.execCommand('copy');
      Utils.toast('已复制', 'success');
    });
  });

  container.querySelector('#ocrRetry').addEventListener('click', () => {
    result.classList.add('hidden');
    dropZone.classList.remove('hidden');
    textArea.value = '';
  });
}
