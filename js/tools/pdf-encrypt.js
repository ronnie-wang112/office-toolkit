function Tool_pdf_encrypt(container) {
  let pdfFile = null;

  container.innerHTML = `
    <div class="drop-zone" id="encDropZone">
      <div class="drop-zone-icon">🔒</div>
      <div class="drop-zone-text">选择 PDF 文件进行加密或解密</div>
    </div>
    <div id="encFileInfo" style="margin-top:12px"></div>
    <div id="encOptions" class="hidden">
      <div class="form-group">
        <label>操作类型</label>
        <select id="encMode">
          <option value="encrypt">加密（添加密码）</option>
          <option value="decrypt">解密（移除密码）</option>
        </select>
      </div>
      <div class="form-group" id="pwdGroup">
        <label id="pwdLabel">设置密码</label>
        <input type="password" id="encPassword" placeholder="输入密码">
      </div>
      <button class="btn btn-primary" id="encBtn">执行</button>
    </div>
    <input type="file" id="encFileInput" accept=".pdf" style="display:none">
    <div class="progress-bar hidden" id="encProgress"><div class="progress-bar-fill"></div></div>
  `;

  const dropZone = container.querySelector('#encDropZone');
  const fileInput = container.querySelector('#encFileInput');
  const encOptions = container.querySelector('#encOptions');
  const encMode = container.querySelector('#encMode');
  const encBtn = container.querySelector('#encBtn');
  const pwdLabel = container.querySelector('#pwdLabel');
  const progress = container.querySelector('#encProgress');

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f && (f.type === 'application/pdf' || f.name.endsWith('.pdf'))) { pdfFile = f; loadInfo(); }
  });
  fileInput.addEventListener('change', () => { pdfFile = fileInput.files[0]; if (pdfFile) loadInfo(); });

  function loadInfo() {
    container.querySelector('#encFileInfo').innerHTML = `
      <div class="file-item"><span>📄</span><span class="file-name">${pdfFile.name}</span>
      <span class="file-size">${Utils.formatSize(pdfFile.size)}</span></div>`;
    encOptions.classList.remove('hidden');
    dropZone.classList.add('hidden');
  }

  encMode.addEventListener('change', () => {
    const isEncrypt = encMode.value === 'encrypt';
    pwdLabel.textContent = isEncrypt ? '设置密码' : '输入当前密码（用于解密）';
    encBtn.textContent = isEncrypt ? '加密并下载' : '解密并下载';
  });

  encBtn.addEventListener('click', async () => {
    const password = container.querySelector('#encPassword').value;
    if (!password) { Utils.toast('请输入密码', 'warning'); return; }
    encBtn.disabled = true;
    progress.classList.remove('hidden');
    const bar = progress.querySelector('.progress-bar-fill');
    bar.style.width = '20%';

    try {
      const buf = await Utils.readFile(pdfFile);
      if (encMode.value === 'encrypt') {
        const pdf = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
        bar.style.width = '60%';
        pdf.setTitle(pdf.getTitle() || '');
        // pdf-lib encrypt: userPassword + ownerPassword
        const bytes = await pdf.save({
          userPassword: password,
          ownerPassword: password + '_owner',
          useObjectStreams: true,
        });
        bar.style.width = '100%';
        Utils.downloadBuffer(bytes, Utils.getName(pdfFile.name) + '_加密.pdf');
        Utils.toast('PDF 已加密', 'success');
      } else {
        try {
          const pdf = await PDFLib.PDFDocument.load(buf, { password });
          bar.style.width = '60%';
          const bytes = await pdf.save({ useObjectStreams: true });
          bar.style.width = '100%';
          Utils.downloadBuffer(bytes, Utils.getName(pdfFile.name) + '_解密.pdf');
          Utils.toast('PDF 已解密', 'success');
        } catch (e) {
          Utils.toast('密码错误或 PDF 未加密', 'error');
        }
      }
    } catch (err) {
      Utils.toast('处理失败: ' + err.message, 'error');
    }
    encBtn.disabled = false;
    setTimeout(() => progress.classList.add('hidden'), 1500);
  });
}
