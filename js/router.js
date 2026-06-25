// ===== Office Toolkit - Router & App Core =====
const OfficeToolkit = {
  currentTool: null,
  currentCategory: 'pdf',

  // All tools registry
  tools: [
    // PDF
    { id: 'pdf-merge',    name: 'PDF 合并',      icon: '📎', category: 'pdf',    desc: '将多个 PDF 文件合并为一个' },
    { id: 'pdf-split',    name: 'PDF 拆分',      icon: '✂️', category: 'pdf',    desc: '将 PDF 按页码范围拆分成多个文件' },
    { id: 'pdf-extract',  name: 'PDF 提取页面',  icon: '📋', category: 'pdf',    desc: '从 PDF 中提取指定页面' },
    { id: 'pdf-reorder',  name: 'PDF 页面排序',  icon: '🔀', category: 'pdf',    desc: '拖拽调整 PDF 页面顺序后导出' },
    { id: 'pdf-encrypt',  name: 'PDF 加密/解密', icon: '🔒', category: 'pdf',    desc: '为 PDF 添加或移除密码保护' },
    { id: 'img2pdf',      name: '图片转 PDF',    icon: '🖼️', category: 'pdf',    desc: '将一张或多张图片转换为 PDF' },
    { id: 'pdf-compress', name: 'PDF 压缩',    icon: '🗜️', category: 'pdf',    desc: '压缩 PDF 文件大小（快速/深度两种模式）' },
        { id: 'word2pdf',     name: 'Word 转 PDF',   icon: '📝', category: 'pdf',    desc: '将 .docx 文档转换为 PDF 文件' },
    // Image
    { id: 'img-compress', name: '图片压缩',      icon: '🗜️', category: 'image',  desc: '压缩图片大小，支持批量处理' },
    { id: 'img-convert',  name: '格式转换',      icon: '🔄', category: 'image',  desc: 'PNG/JPG/WebP 格式互转' },
    { id: 'bg-remove',    name: '智能抠图',      icon: '🎭', category: 'image',  desc: 'AI 自动去除图片背景' },
    { id: 'img-crop',     name: '裁剪旋转',      icon: '✂️', category: 'image',  desc: '裁剪和旋转图片' },
    { id: 'batch-img2pdf',name: '批量图片转 PDF',icon: '📚', category: 'image',  desc: '多张图片批量合并为 PDF' },
    // Scan & OCR
    { id: 'scanner',      name: '拍照扫描',      icon: '📷', category: 'scan',   desc: '拍照/扫描文档，增强后导出 PDF' },
    { id: 'ocr',          name: 'OCR 文字识别',  icon: '🔍', category: 'scan',   desc: '识别图片中的文字（中英文）' },
    // Utility
    { id: 'qrcode-gen',   name: '二维码生成',    icon: '🔳', category: 'utility',desc: '生成自定义二维码' },
    { id: 'qrcode-scan',  name: '二维码识别',    icon: '📱', category: 'utility',desc: '扫描或上传图片识别二维码内容' },
    { id: 'markdown',     name: 'Markdown 预览', icon: '📖', category: 'utility',desc: '编辑并实时预览 Markdown' },
  ],

  init() {
    Utils.setTheme(Utils.getTheme());
    this.bindEvents();
    this.renderCards('pdf');
    this.handleHash();
    window.addEventListener('hashchange', () => this.handleHash());
  },

  bindEvents() {
    // Tab switching
    document.getElementById('tabNav').addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      this.switchTab(btn.dataset.category);
    });

    // Back button
    document.getElementById('backBtn').addEventListener('click', () => {
      this.deactivateTool();
    });

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      Utils.setTheme(next);
    });

    // About modal
    document.getElementById('infoBtn').addEventListener('click', () => {
      document.getElementById('aboutModal').classList.remove('hidden');
    });
    document.querySelector('.modal-close').addEventListener('click', () => {
      document.getElementById('aboutModal').classList.add('hidden');
    });
    document.getElementById('aboutModal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        e.currentTarget.classList.add('hidden');
      }
    });
  },

  switchTab(category) {
    this.currentCategory = category;
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.category === category);
    });
    this.deactivateTool();
    this.renderCards(category);
  },

  renderCards(category) {
    const grid = document.getElementById('cardsGrid');
    const tools = this.tools.filter(t => t.category === category);
    grid.innerHTML = tools.map(t => `
      <div class="tool-card" data-tool="${t.id}">
        <div class="card-icon">${t.icon}</div>
        <div class="card-title">${t.name}</div>
        <div class="card-desc">${t.desc}</div>
      </div>
    `).join('');

    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.tool-card');
      if (!card) return;
      this.activateTool(card.dataset.tool);
    });
  },

  activateTool(toolId) {
    const tool = this.tools.find(t => t.id === toolId);
    if (!tool) return;

    this.currentTool = tool;
    document.getElementById('cardsGrid').classList.add('hidden');
    document.getElementById('toolWorkspace').classList.remove('hidden');

    const container = document.getElementById('toolContainer');
    container.innerHTML = `
      <h2>${tool.icon} ${tool.name}</h2>
      <p class="tool-desc">${tool.desc}</p>
      <div id="toolBody"></div>
    `;

    const toolBody = document.getElementById('toolBody');

    // Call the tool's activate function
    const activateFn = window[`Tool_${toolId.replace(/-/g, '_')}`];
    if (typeof activateFn === 'function') {
      activateFn(toolBody);
    } else {
      toolBody.innerHTML = '<p style="color:var(--text-muted)">此工具尚未实现</p>';
    }

    // Update hash
    const catMap = { pdf: 'pdf', image: 'img', scan: 'scan', utility: 'util' };
    window.location.hash = `#/${catMap[tool.category]}/${tool.id}`;
  },

  deactivateTool() {
    // Call deactivate if exists
    if (this.currentTool) {
      const deactivateFn = window[`Tool_${this.currentTool.id.replace(/-/g, '_')}_deactivate`];
      if (typeof deactivateFn === 'function') deactivateFn();
    }

    this.currentTool = null;
    document.getElementById('toolWorkspace').classList.add('hidden');
    document.getElementById('cardsGrid').classList.remove('hidden');
    window.location.hash = '';
  },

  handleHash() {
    const hash = window.location.hash.slice(2); // remove '#/'
    if (!hash) return;

    // Check if hash matches a tool route
    const tool = this.tools.find(t => {
      const catMap = { pdf: 'pdf', image: 'img', scan: 'scan', utility: 'util' };
      const expectedHash = `${catMap[t.category]}/${t.id}`;
      return hash === expectedHash;
    });

    if (tool) {
      // Switch to correct tab
      if (this.currentCategory !== tool.category) {
        this.currentCategory = tool.category;
        document.querySelectorAll('.tab-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.category === tool.category);
        });
        this.renderCards(tool.category);
      }
      this.activateTool(tool.id);
    }
  }
};
