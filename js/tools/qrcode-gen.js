function Tool_qrcode_gen(container) {
  let qrCode = null;

  container.innerHTML = `
    <div class="form-group">
      <label>输入文本或网址</label>
      <textarea id="qrText" placeholder="在此输入要生成二维码的文本或网址..." rows="3"></textarea>
    </div>
    <div class="form-row">
      <div class="form-group" style="max-width:130px">
        <label>尺寸</label>
        <select id="qrSize">
          <option value="200">小 (200)</option>
          <option value="300" selected>中 (300)</option>
          <option value="400">大 (400)</option>
          <option value="500">超大 (500)</option>
        </select>
      </div>
      <div class="form-group" style="max-width:130px">
        <label>颜色</label>
        <input type="color" id="qrColor" value="#000000">
      </div>
      <div class="form-group" style="max-width:130px">
        <label>背景色</label>
        <input type="color" id="qrBgColor" value="#ffffff">
      </div>
    </div>
    <button class="btn btn-primary" id="qrGenerate">生成二维码</button>
    <div class="qr-output hidden" id="qrOutput">
      <div id="qrCodeContainer"></div>
      <div class="btn-group">
        <button class="btn btn-primary" id="qrDownload">下载 PNG</button>
      </div>
    </div>
  `;

  const textarea = container.querySelector('#qrText');
  const generateBtn = container.querySelector('#qrGenerate');
  const output = container.querySelector('#qrOutput');
  const qrContainer = container.querySelector('#qrCodeContainer');

  generateBtn.addEventListener('click', () => {
    const text = textarea.value.trim();
    if (!text) { Utils.toast('请输入文本或网址', 'warning'); return; }

    const size = parseInt(container.querySelector('#qrSize').value);
    const color = container.querySelector('#qrColor').value;
    const bgColor = container.querySelector('#qrBgColor').value;

    qrContainer.innerHTML = '';
    qrCode = new QRCode(qrContainer, {
      text: text,
      width: size,
      height: size,
      colorDark: color,
      colorLight: bgColor,
      correctLevel: QRCode.CorrectLevel.M,
    });
    output.classList.remove('hidden');
  });

  container.querySelector('#qrDownload').addEventListener('click', () => {
    const canvas = qrContainer.querySelector('canvas');
    if (!canvas) return;
    canvas.toBlob(blob => {
      Utils.download(blob, '二维码.png');
      Utils.toast('已下载', 'success');
    }, 'image/png');
  });

  // Auto-generate on Enter
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      generateBtn.click();
    }
  });
}
