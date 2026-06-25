// ===== Office Toolkit - Router & App Core =====

// SVG Icon library — 24x24 line icons, strokes inherit currentColor
const Icons = {
  pdf_merge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="12" y2="12"/><line x1="15" y1="15" x2="12" y2="12"/></svg>',
  pdf_split: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16"/><path d="M18 6h4v16a2 2 0 0 1-2 2H6"/><line x1="10" y1="9" x2="10" y2="17"/><line x1="14" y1="9" x2="14" y2="15"/></svg>',
  pdf_extract: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M10 12l4 4"/><path d="M14 12l-4 4"/></svg>',
  pdf_reorder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="12" x2="8" y2="12"/><line x1="16" y1="16" x2="8" y2="16"/></svg>',
  pdf_encrypt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  img2pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  pdf_compress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="16 17 20 13"/><polyline points="12 13 8 17"/></svg>',
  word2pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
  img_compress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/><polyline points="16 17 20 13"/></svg>',
  img_convert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
  bg_remove: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  img_crop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>',
  batch_img2pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="12" height="16" rx="1"/><rect x="10" y="5" width="12" height="16" rx="1"/><line x1="6" y1="8" x2="10" y2="8"/><line x1="6" y1="12" x2="10" y2="12"/></svg>',
  scanner: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  ocr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
  qrcode_gen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><line x1="14" y1="14" x2="14" y2="14.01"/><line x1="18" y1="14" x2="18" y2="14.01"/><line x1="14" y1="18" x2="14" y2="18.01"/><line x1="18" y1="18" x2="18" y2="18.01"/></svg>',
  qrcode_scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="12" y1="12" x2="12" y2="12.01"/></svg>',
  markdown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 8 15 12 7"/><line x1="13" y1="17" x2="21" y2="17"/><line x1="13" y1="13" x2="18" y2="13"/><line x1="18" y1="13" x2="18" y2="17"/></svg>',
};

const CategoryMeta = {
  pdf:     { name:'PDF 工具',   desc:'合并、拆分、压缩、转换 PDF 文件' },
  image:   { name:'图片工具',   desc:'压缩、格式转换、抠图、裁剪' },
  scan:    { name:'扫描 & OCR', desc:'拍照扫描、文字识别' },
  utility: { name:'实用工具',   desc:'二维码生成识别、Markdown 预览' },
};

const OfficeToolkit = {
  currentTool: null,
  currentCategory: 'pdf',

  tools: [
    { id:'pdf-merge',    name:'PDF 合并',      icon:'pdf_merge',    category:'pdf',     desc:'将多个 PDF 文件合并为一个' },
    { id:'pdf-split',    name:'PDF 拆分',      icon:'pdf_split',    category:'pdf',     desc:'将 PDF 按页码范围拆分成多个文件' },
    { id:'pdf-extract',  name:'PDF 提取页面',  icon:'pdf_extract',  category:'pdf',     desc:'从 PDF 中提取指定页面' },
    { id:'pdf-reorder',  name:'PDF 页面排序',  icon:'pdf_reorder',  category:'pdf',     desc:'拖拽调整 PDF 页面顺序后导出' },
    { id:'pdf-encrypt',  name:'PDF 加密/解密', icon:'pdf_encrypt',  category:'pdf',     desc:'为 PDF 添加或移除密码保护' },
    { id:'img2pdf',      name:'图片转 PDF',    icon:'img2pdf',      category:'pdf',     desc:'将一张或多张图片转换为 PDF' },
    { id:'pdf-compress', name:'PDF 压缩',      icon:'pdf_compress', category:'pdf',     desc:'压缩 PDF 文件大小（快速/深度两种模式）' },
    { id:'word2pdf',     name:'Word 转 PDF',   icon:'word2pdf',     category:'pdf',     desc:'将 .docx 文档转换为 PDF 文件' },
    { id:'img-compress', name:'图片压缩',      icon:'img_compress', category:'image',   desc:'压缩图片大小，支持批量处理' },
    { id:'img-convert',  name:'格式转换',      icon:'img_convert',  category:'image',   desc:'PNG/JPG/WebP 格式互转' },
    { id:'bg-remove',    name:'智能抠图',      icon:'bg_remove',    category:'image',   desc:'AI 自动去除图片背景' },
    { id:'img-crop',     name:'裁剪旋转',      icon:'img_crop',     category:'image',   desc:'裁剪和旋转图片' },
    { id:'batch-img2pdf',name:'批量图片转 PDF',icon:'batch_img2pdf',category:'image',   desc:'多张图片批量合并为 PDF' },
    { id:'scanner',      name:'拍照扫描',      icon:'scanner',      category:'scan',    desc:'拍照/扫描文档，增强后导出 PDF' },
    { id:'ocr',          name:'OCR 文字识别',  icon:'ocr',          category:'scan',    desc:'识别图片中的文字（中英文）' },
    { id:'qrcode-gen',   name:'二维码生成',    icon:'qrcode_gen',   category:'utility', desc:'生成自定义二维码' },
    { id:'qrcode-scan',  name:'二维码识别',    icon:'qrcode_scan',  category:'utility', desc:'扫描或上传图片识别二维码内容' },
    { id:'markdown',     name:'Markdown 预览', icon:'markdown',     category:'utility', desc:'编辑并实时预览 Markdown' },
  ],

  init() {
    Utils.setTheme(Utils.getTheme());
    this.bindEvents();
    this.renderCards('pdf');
    this.renderPageTitle('pdf');
    this.handleHash();
    window.addEventListener('hashchange', () => this.handleHash());
  },

  bindEvents() {
    document.getElementById('tabNav').addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      this.switchTab(btn.dataset.category);
    });
    document.getElementById('backBtn').addEventListener('click', () => { this.deactivateTool(); });
    document.getElementById('themeToggle').addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      Utils.setTheme(current === 'dark' ? 'light' : 'dark');
    });
    document.getElementById('infoBtn').addEventListener('click', () => {
      document.getElementById('aboutModal').classList.remove('hidden');
    });
    document.querySelector('.modal-close').addEventListener('click', () => {
      document.getElementById('aboutModal').classList.add('hidden');
    });
    document.getElementById('aboutModal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
    });
  },

  switchTab(category) {
    this.currentCategory = category;
    document.querySelectorAll('.tab-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.category === category)
    );
    this.deactivateTool();
    this.renderCards(category);
    this.renderPageTitle(category);
  },

  renderPageTitle(category) {
    const area = document.getElementById('pageTitleArea');
    if (!area) return;
    const meta = CategoryMeta[category] || CategoryMeta.pdf;
    area.innerHTML = `<h2>${meta.name}</h2><p>${meta.desc}</p>`;
  },

  renderCards(category) {
    const tools = this.tools.filter(t => t.category === category);
    const grid = document.getElementById('cardsGrid');
    grid.innerHTML = tools.map(t => `
      <div class="tool-card" data-tool="${t.id}" data-category="${t.category}">
        <div class="card-icon-wrap">${Icons[t.icon] || ''}</div>
        <div class="card-body">
          <div class="card-title">${t.name}</div>
          <div class="card-desc">${t.desc}</div>
        </div>
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
    document.getElementById('pageTitleArea').classList.add('hidden');
    document.getElementById('toolWorkspace').classList.remove('hidden');

    const container = document.getElementById('toolContainer');
    container.innerHTML = `
      <h2 style="display:flex;align-items:center;gap:8px;font-size:1.2rem;font-weight:700;margin-bottom:4px;">
        <span style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;">${Icons[tool.icon]||''}</span>
        ${tool.name}
      </h2>
      <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:20px;">${tool.desc}</p>
      <div id="toolBody"></div>
    `;

    const toolBody = document.getElementById('toolBody');
    const activateFn = window[`Tool_${tool.id.replace(/-/g, '_')}`];
    if (typeof activateFn === 'function') {
      activateFn(toolBody);
    } else {
      toolBody.innerHTML = '<p style="color:var(--text-muted)">此工具尚未实现</p>';
    }

    const catMap = { pdf:'pdf', image:'img', scan:'scan', utility:'util' };
    window.location.hash = `#/${catMap[tool.category]}/${tool.id}`;
  },

  deactivateTool() {
    if (this.currentTool) {
      const deactivateFn = window[`Tool_${this.currentTool.id.replace(/-/g, '_')}_deactivate`];
      if (typeof deactivateFn === 'function') deactivateFn();
    }
    this.currentTool = null;
    document.getElementById('toolWorkspace').classList.add('hidden');
    document.getElementById('cardsGrid').classList.remove('hidden');
    document.getElementById('pageTitleArea').classList.remove('hidden');
    window.location.hash = '';
    // Re-render page title for current category
    this.renderPageTitle(this.currentCategory);
  },

  handleHash() {
    const hash = window.location.hash.slice(2);
    if (!hash) return;
    const tool = this.tools.find(t => {
      const catMap = { pdf:'pdf', image:'img', scan:'scan', utility:'util' };
      return hash === `${catMap[t.category]}/${t.id}`;
    });
    if (tool) {
      if (this.currentCategory !== tool.category) {
        this.currentCategory = tool.category;
        document.querySelectorAll('.tab-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.category === tool.category);
        });
        this.renderCards(tool.category);
        this.renderPageTitle(tool.category);
      }
      this.activateTool(tool.id);
    }
  }
};
