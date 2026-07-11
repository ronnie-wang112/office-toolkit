// ===== KEOUKE Office Tools - Router & App Core (Single Page) =====

// SVG Icon library
const Icons = {
  pdf_merge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="12" y2="12"/><line x1="15" y1="15" x2="12" y2="12"/></svg>',
  pdf_split: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16"/><path d="M18 6h4v16a2 2 0 0 1-2 2H6"/><line x1="10" y1="9" x2="10" y2="17"/><line x1="14" y1="9" x2="14" y2="15"/></svg>',
  pdf_extract: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M10 12l4 4"/><path d="M14 12l-4 4"/></svg>',
  pdf_reorder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="12" x2="8" y2="12"/><line x1="16" y1="16" x2="8" y2="16"/></svg>',
  pdf_encrypt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  img2pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  pdf_compress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="16 17 20 13"/><polyline points="12 13 8 17"/></svg>',
  word2pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
  batch_img2pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="12" height="16" rx="1"/><rect x="10" y="5" width="12" height="16" rx="1"/><line x1="6" y1="8" x2="10" y2="8"/><line x1="6" y1="12" x2="10" y2="12"/></svg>',
  img_compress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/><polyline points="16 17 20 13"/></svg>',
  img_convert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
  long_screenshot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="6" rx="1"/><rect x="3" y="11" width="18" height="6" rx="1"/><rect x="3" y="19" width="18" height="3" rx="1"/><line x1="12" y1="9" x2="12" y2="11"/><line x1="12" y1="17" x2="12" y2="19"/></svg>',
  image_gen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5"/></svg>',
  img_crop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>',
  scanner: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  qrcode_gen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><line x1="14" y1="14" x2="14" y2="14.01"/><line x1="18" y1="14" x2="18" y2="14.01"/><line x1="14" y1="18" x2="14" y2="18.01"/><line x1="18" y1="18" x2="18" y2="18.01"/></svg>',
  table_extract: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>',
  qrcode_scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>',
  price_monitor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>',
  label_gen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  markdown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 8 15 12 7"/><line x1="13" y1="17" x2="21" y2="17"/><line x1="13" y1="13" x2="18" y2="13"/><line x1="18" y1="13" x2="18" y2="17"/></svg>',
};

// Tool registry — all tools on one page, grouped by category
function GetIcon(name) {
  return Icons[name] || Icons.markdown || '';
}

const ToolSections = [
  {
    name: '实用工具',
    desc: '材料价格监控、标签制作、二维码、Markdown 预览',
    cat: 'utility',
    color: 'util',
    tools: [
      { id:'price-monitor',name:'材料价格监控', icon:'price_monitor',desc:'美元汇率、黄金原油、塑料原材料实时价格与走势', external: true },
      { id:'label-gen',   name:'克欧克标签制作', icon:'label_gen',  desc:'产品标签自动生成，支持条形码、多品牌', external: true },
      { id:'qrcode-gen',  name:'二维码生成',   icon:'qrcode_gen',   desc:'生成自定义二维码' },
      { id:'qrcode-scan', name:'二维码识别',   icon:'qrcode_scan',   desc:'扫描或上传图片识别二维码内容' },
      { id:'markdown',    name:'Markdown 预览',icon:'markdown',      desc:'编辑并实时预览 Markdown' },
    ]
  },
  {
    name: '图片工具',
    desc: 'AI生图、压缩、格式转换、裁剪旋转',
    cat: 'image',
    color: 'image',
    tools: [
      { id:'image-gen',  name:'image2.0生图', icon:'image_gen', desc:'AI图片生成，可选比例和分辨率，支持参考图' },
      { id:'img-compress',name:'图片压缩',     icon:'img_compress', desc:'压缩图片大小，支持批量处理' },
      { id:'img-convert', name:'格式转换',     icon:'img_convert',  desc:'PNG/JPG/WebP 格式互转' },
      { id:'img-crop',    name:'裁剪旋转',     icon:'img_crop',     desc:'裁剪和旋转图片' },
      { id:'long-screenshot',name:'长截图拼接',  icon:'long_screenshot', desc:'多图纵向拼接，自动检测重合区域' },
    ]
  },
  {
    name: 'PDF 工具',
    desc: '合并、拆分、压缩、转换 PDF 文件',
    cat: 'pdf',
    color: 'pdf',
    tools: [
      { id:'pdf-merge',   name:'PDF 合并',     icon:'pdf_merge',    desc:'将多个 PDF 文件合并为一个' },
      { id:'pdf-split',   name:'PDF 拆分',     icon:'pdf_split',    desc:'将 PDF 按页码范围拆分成多个文件' },
      { id:'pdf-extract', name:'PDF 提取页面', icon:'pdf_extract',  desc:'从 PDF 中提取指定页面' },
      { id:'pdf-reorder', name:'PDF 页面排序', icon:'pdf_reorder',  desc:'拖拽调整 PDF 页面顺序后导出' },
      { id:'pdf-encrypt', name:'PDF 加密/解密',icon:'pdf_encrypt',  desc:'为 PDF 添加或移除密码保护' },
      { id:'pdf-compress',name:'PDF 压缩',     icon:'pdf_compress', desc:'压缩 PDF 文件大小（快速/深度两种模式）' },
      { id:'img2pdf',     name:'图片转 PDF',   icon:'img2pdf',      desc:'将一张或多张图片转换为 PDF' },
      { id:'batch-img2pdf',name:'批量图片转 PDF',icon:'batch_img2pdf',desc:'多张图片批量合并为 PDF' },
      { id:'word2pdf',    name:'Word 转 PDF',  icon:'word2pdf',     desc:'将 .docx 文档转换为 PDF 文件' },
    ]
  },
  {
    name: '扫描工具',
    desc: '拍照扫描、智能增强',
    cat: 'scan',
    color: 'scan',
    tools: [
      { id:'scan-king',     name:'扫描王',     icon:'scanner',      desc:'实时边缘检测，透视矫正，多页扫描 PDF' },
      { id:'table-extract', name:'表格提取', icon:'table_extract', desc:'拍照识别表格，OCR 提取文字，导出 Excel' },
    ]
  },
];

// Flatten for lookup
const AllTools = ToolSections.flatMap(s => s.tools);

const OfficeToolkit = {
  currentTool: null,

  init() {
    try { document.getElementById('cardsGrid').innerHTML = '<div style="padding:20px;text-align:center">✅ JS 加载成功，正在渲染...</div>'; } catch(e) {}
    Utils.setTheme(Utils.getTheme());
    this.bindEvents();
    try {
      this.renderAllCards();
    } catch(e) {
      document.getElementById('cardsGrid').innerHTML = '<div style="padding:20px;text-align:center;color:red">❌ 渲染失败: ' + e.message + '</div>';
      return;
    }
    this.handleHash();
    window.addEventListener('hashchange', () => this.handleHash());
  },

  bindEvents() {
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

  renderAllCards() {
    const grid = document.getElementById('cardsGrid');
    let html = '';

    ToolSections.forEach(section => {
      const colorClass = section.color;
      html += `<div class="section-header" data-color="${colorClass}">
        <h3>${section.name}</h3>
        <p>${section.desc}</p>
      </div>`;

      section.tools.forEach(tool => {
        html += `<div class="tool-card" data-tool="${tool.id}" data-section="${section.cat}">
          <div class="card-icon-wrap" style="background:var(--${colorClass}-light)">
            <svg class="card-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              ${GetIcon(tool.icon)}
            </svg>
          </div>
          <div class="card-body">
            <div class="card-title">${tool.name}</div>
            <div class="card-desc">${tool.desc}</div>
          </div>
        </div>`;
      });
    });

    grid.innerHTML = html;

    // Bind click events
    grid.querySelectorAll('.tool-card').forEach(card => {
      card.addEventListener('click', () => {
        const toolId = card.dataset.tool;
        this.activateTool(toolId);
      });
    });
  },

  activateTool(toolId) {
    const tool = AllTools.find(t => t.id === toolId);
    if (!tool) return;

    this.currentTool = tool;
    window.location.hash = `#/${tool.cat || 'utility'}/${tool.id}`;

    document.getElementById('backBtn').style.display = 'flex';
    document.getElementById('cardsGrid').style.display = 'none';
    document.querySelectorAll('.section-header').forEach(h => h.style.display = 'none');
    document.getElementById('toolPanel').classList.remove('hidden');

    if (tool.external) {
      const externalPages = {
        'price-monitor': 'price-monitor.html',
        'label-gen': 'label-generator.html',
      };
      window.location.href = externalPages[tool.id] || 'index.html';
      return;
    }

    const container = document.getElementById('toolContainer');
    container.innerHTML = '';

    const toolLoaders = {
      'image-gen': Tool_image_gen,
      'img-compress': Tool_img_compress,
      'img-convert': Tool_img_convert,
      'img-crop': Tool_img_crop,
      'long-screenshot': Tool_long_screenshot,
      'pdf-merge': Tool_pdf_merge,
      'pdf-split': Tool_pdf_split,
      'pdf-extract': Tool_pdf_extract,
      'pdf-reorder': Tool_pdf_reorder,
      'pdf-encrypt': Tool_pdf_encrypt,
      'pdf-compress': Tool_pdf_compress,
      'img2pdf': Tool_img2pdf,
      'batch-img2pdf': Tool_batch_img2pdf,
      'word2pdf': Tool_word2pdf,
      'bg-remove': Tool_bg_remove,
      'markdown': Tool_markdown,
      'qrcode-gen': Tool_qrcode_gen,
      'qrcode-scan': Tool_qrcode_scan,
      'table-extract': Tool_table_extract,
      'scan-king': Tool_scan_king,
    };

    const loader = toolLoaders[tool.id];
    if (loader) {
      loader(container);
    } else {
      container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">工具开发中...</div>`;
    }
  },

  deactivateTool() {
    document.getElementById('backBtn').style.display = 'none';
    document.getElementById('toolPanel').classList.add('hidden');
    document.getElementById('cardsGrid').style.display = '';
    document.querySelectorAll('.section-header').forEach(h => h.style.display = '');
    document.getElementById('toolContainer').innerHTML = '';
    window.location.hash = '';

    if (this.currentTool && typeof window[`Tool_${this.currentTool.id.replace(/-/g, '_')}_deactivate`] === 'function') {
      window[`Tool_${this.currentTool.id.replace(/-/g, '_')}_deactivate`]();
    }
    this.currentTool = null;
  },

  handleHash() {
    const hash = window.location.hash.slice(2);
    if (!hash) {
      if (this.currentTool) this.deactivateTool();
      return;
    }
    const parts = hash.split('/');
    const toolId = parts[parts.length - 1];
    if (toolId && AllTools.find(t => t.id === toolId)) {
      this.activateTool(toolId);
    }
  },
};

document.addEventListener('DOMContentLoaded', () => OfficeToolkit.init());
