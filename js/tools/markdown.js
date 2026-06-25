function Tool_markdown(container) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
      <button class="btn btn-sm btn-secondary" id="mdInsertH1">H1</button>
      <button class="btn btn-sm btn-secondary" id="mdInsertH2">H2</button>
      <button class="btn btn-sm btn-secondary" id="mdInsertBold"><b>B</b></button>
      <button class="btn btn-sm btn-secondary" id="mdInsertItalic"><i>I</i></button>
      <button class="btn btn-sm btn-secondary" id="mdInsertCode">&lt;/&gt;</button>
      <button class="btn btn-sm btn-secondary" id="mdInsertLink">🔗</button>
      <button class="btn btn-sm btn-secondary" id="mdInsertList">📋</button>
      <button class="btn btn-sm btn-secondary" id="mdClear">清空</button>
      <span style="flex:1"></span>
      <button class="btn btn-sm btn-secondary" id="mdExportPdf">导出 PDF</button>
      <button class="btn btn-sm btn-primary" id="mdCopyHtml">复制 HTML</button>
    </div>
    <div class="markdown-editor">
      <textarea id="mdEditor" placeholder="# 输入 Markdown 文本..."></textarea>
      <div class="markdown-preview" id="mdPreview"></div>
    </div>
  `;

  const editor = container.querySelector('#mdEditor');
  const preview = container.querySelector('#mdPreview');

  async function updatePreview() {
    const text = editor.value;
    if (typeof marked !== 'undefined' && marked.parse) {
      preview.innerHTML = marked.parse(text);
    } else {
      // Fallback: simple rendering
      preview.innerHTML = text
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
    }
  }

  editor.addEventListener('input', Utils.debounce(updatePreview, 200));

  // Toolbar buttons
  function insertAtCursor(before, after = '') {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const text = editor.value;
    const selected = text.substring(start, end);
    editor.value = text.substring(0, start) + before + selected + after + text.substring(end);
    editor.focus();
    editor.selectionStart = start + before.length;
    editor.selectionEnd = end + before.length;
    updatePreview();
  }

  container.querySelector('#mdInsertH1').addEventListener('click', () => insertAtCursor('# ', ''));
  container.querySelector('#mdInsertH2').addEventListener('click', () => insertAtCursor('## ', ''));
  container.querySelector('#mdInsertBold').addEventListener('click', () => insertAtCursor('**', '**'));
  container.querySelector('#mdInsertItalic').addEventListener('click', () => insertAtCursor('*', '*'));
  container.querySelector('#mdInsertCode').addEventListener('click', () => insertAtCursor('`', '`'));
  container.querySelector('#mdInsertLink').addEventListener('click', () => insertAtCursor('[', '](https://)'));
  container.querySelector('#mdInsertList').addEventListener('click', () => insertAtCursor('- ', ''));
  container.querySelector('#mdClear').addEventListener('click', () => {
    editor.value = '';
    preview.innerHTML = '';
  });

  container.querySelector('#mdCopyHtml').addEventListener('click', () => {
    navigator.clipboard.writeText(preview.innerHTML).then(() => {
      Utils.toast('HTML 已复制到剪贴板', 'success');
    }).catch(() => Utils.toast('复制失败', 'error'));
  });

  container.querySelector('#mdExportPdf').addEventListener('click', async () => {
    updatePreview();
    try {
      const canvas = await html2canvas(preview, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const { PDFDocument } = PDFLib;
      const pdf = await PDFDocument.create();
      const imgBuf = await Utils.canvasToBuffer(canvas, 'image/png', 1.0);
      const embedded = await pdf.embedPng(new Uint8Array(imgBuf));
      const pageW = 595, margin = 30, contentW = pageW - margin * 2;
      const scale = contentW / canvas.width;
      const pageH = canvas.height * scale + margin * 2;
      const page = pdf.addPage([pageW, pageH]);
      page.drawImage(embedded, { x: margin, y: margin, width: contentW, height: canvas.height * scale });
      const bytes = await pdf.save();
      Utils.downloadBuffer(bytes, 'Markdown文档.pdf');
      Utils.toast('已导出 PDF', 'success');
    } catch (err) { Utils.toast('导出失败', 'error'); }
  });

  // Initial placeholder
  editor.value = `# 欢迎使用 Markdown 预览

## 基本语法

**粗体** *斜体* \`代码\`

### 列表
- 项目 1
- 项目 2
- 项目 3

### 链接
[OpenAI](https://openai.com)

### 引用
> 这是一段引用文字

---

开始编辑吧！`;
  updatePreview();
}
