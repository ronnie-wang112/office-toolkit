// ===== 克欧克标签制作 Tool =====
function Tool_label_gen(container) {
  // ===== CSS =====
  var style = document.createElement("style");
  style.textContent = `.labelgen-scope *, .labelgen-scope *::before, .labelgen-scope *::after { box-sizing: border-box; margin: 0; padding: 0; }
.labelgen-scope {
  --bg: #f9fafb;
  --card-bg: #ffffff;
  --border: #e5e7eb;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;
  --blue-50: #eff6ff;
  --purple-50: #faf5ff;
  --gray-50: #f9fafb;
  --primary: #1a1a1a;
  --primary-fg: #ffffff;
  --destructive: #ef4444;
  --radius: 0.625rem;
  --radius-sm: calc(0.625rem - 4px);
  --radius-md: calc(0.625rem - 2px);
  --radius-lg: 0.625rem;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
.labelgen-scope {
  font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background: var(--bg);
  color: var(--text-primary);
  min-height: 100vh;
  line-height: 1.5;
}
.labelgen-scope .container { max-width: 1280px; margin: 0 auto; padding: 1rem; }
@media (min-width: 768px) { .labelgen-scope .container { padding: 2rem; } }

.labelgen-scope .header { text-align: center; margin-bottom: 2rem; }
.labelgen-scope .header h1 { font-size: 1.875rem; font-weight: 700; color: #111827; margin-bottom: 0.5rem; }
.labelgen-scope .header p { color: #4b5563; }

.labelgen-scope .main-grid { display: grid; gap: 1.5rem; grid-template-columns: 1fr 1fr; }
@media (max-width: 1023px) { .labelgen-scope .main-grid { grid-template-columns: 1fr; } }

.labelgen-scope .card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  display: flex; flex-direction: column; gap: 1.5rem;
  padding: 1.5rem;
}
.labelgen-scope .card-header { display: flex; flex-direction: column; gap: 0.25rem; }
.labelgen-scope .card-title { font-weight: 600; font-size: 1.05rem; line-height: 1; }
.labelgen-scope .card-desc { color: var(--text-secondary); font-size: 0.875rem; }

.labelgen-scope .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
.labelgen-scope .form-label { font-size: 0.875rem; font-weight: 500; line-height: 1; }

.labelgen-scope .form-input, .form-select, .form-textarea {
  height: 2.25rem; padding: 0 0.75rem;
  font-size: 0.875rem; font-family: inherit;
  background: transparent; border: 1px solid var(--border);
  border-radius: var(--radius-sm); color: var(--text-primary);
  outline: none; transition: border-color 0.15s, box-shadow 0.15s;
  width: 100%; min-width: 0;
}
.labelgen-scope .form-input:focus, .form-select:focus, .form-textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}
.labelgen-scope .form-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 0.75rem center;
  padding-right: 2rem; cursor: pointer;
}
.labelgen-scope .form-textarea { height: auto; min-height: 2.25rem; padding: 0.5rem 0.75rem; resize: vertical; }
.labelgen-scope .form-textarea.rows-3 { min-height: 5rem; }

.labelgen-scope .form-grid { display: grid; gap: 1rem; }
.labelgen-scope .form-grid-2 { grid-template-columns: 1fr 1fr; }
.labelgen-scope .form-grid-3 { grid-template-columns: 1fr 1fr 1fr; }

.labelgen-scope .section-blue { background: var(--blue-50); border-radius: var(--radius-sm); padding: 1rem; }
.labelgen-scope .section-purple { background: var(--purple-50); border-radius: var(--radius-sm); padding: 1rem; }
.labelgen-scope .section-gray { background: var(--gray-50); border-radius: var(--radius-sm); padding: 0.75rem; }

.labelgen-scope .btn-group { display: flex; gap: 0.5rem; }
.labelgen-scope .btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  height: 2.25rem; padding: 0 1rem;
  font-size: 0.875rem; font-weight: 500; font-family: inherit;
  border-radius: var(--radius-sm); border: 1px solid transparent;
  cursor: pointer; transition: all 0.15s;
}
.labelgen-scope .btn-primary { background: var(--primary); color: var(--primary-fg); flex: 1; }
.labelgen-scope .btn-primary:hover { background: #333; }
.labelgen-scope .btn-outline { background: var(--card-bg); border-color: var(--border); color: var(--text-primary); }
.labelgen-scope .btn-outline:hover { background: #f9fafb; border-color: #d1d5db; }

.labelgen-scope .preview-container {
  display: flex; justify-content: center;
  border: 2px dashed #d1d5db;
  border-radius: var(--radius-sm); padding: 1rem; background: white;
}
.labelgen-scope .preview-container canvas { max-width: 100%; height: auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }

.labelgen-scope .size-hint { text-align: center; font-size: 0.875rem; color: var(--text-muted); margin-top: 1rem; }

@media (max-width: 639px) {
  .labelgen-scope .form-grid-2, .labelgen-scope .form-grid-3 { grid-template-columns: 1fr; }
}

.labelgen-scope .hidden { display: none !important; }
.labelgen-scope .form-input-barcode { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; letter-spacing: 0.05em; }`;
  container.appendChild(style);

  // ===== HTML Template =====
  container.innerHTML = `<div class="labelgen-scope">
<div class="container">
  <div class="header">
    <h1>产品标签自动定制系统</h1>
    <p>填写产品信息，自动生成符合规范的标签图片</p>
  </div>

  <div class="main-grid">
    <!-- Left: Form -->
    <div class="card" style="overflow-y:auto;max-height:calc(100vh - 120px)">
      <div class="card-header">
        <div class="card-title">产品信息录入</div>
        <div class="card-desc">请填写以下信息生成标签</div>
      </div>

      <!-- Image Settings -->
      <div class="section-blue">
        <div class="form-grid form-grid-2">
          <div class="form-group"><label class="form-label" for="imageWidth">图片宽度 (像素)</label><input type="number" class="form-input" id="labelgen_imageWidth" value="1200"></div>
          <div class="form-group"><label class="form-label" for="imageHeight">图片高度 (像素)</label><input type="number" class="form-input" id="labelgen_imageHeight" value="1000"></div>
          <div class="form-group"><label class="form-label" for="fontSize">基础字号 (像素)</label><input type="number" class="form-input" id="labelgen_fontSize" value="35" min="10" max="40"></div>
          <div class="form-group"><label class="form-label" for="fontWeight">字体粗细</label><select class="form-select" id="labelgen_fontWeight"><option value="normal">正常</option><option value="bold" selected>粗体</option><option value="lighter">细体</option><option value="bolder">特粗</option></select></div>
        </div>
      </div>

      <!-- Brand -->
      <div class="form-group"><label class="form-label">品牌</label><select class="form-select" id="labelgen_brand"><option value="KEOUKE" selected>KEOUKE</option><option value="LULUWOOD">LULUWOOD</option><option value="MAXCEYSEN">MAXCEYSEN</option><option value="MAXCEYSEN_KEOUKE">MAXCEYSEN® xKEOUKE® 联名款</option><option value="other">其他</option></select></div>

      <div id="labelgen_customBrandGroup" class="form-group hidden"><label class="form-label" for="customBrand">自定义品牌名称</label><input class="form-input" id="labelgen_customBrand" placeholder="请输入品牌名称"></div>

      <!-- Product info (2 columns) -->
      <div class="form-grid form-grid-2">
        <div class="form-group"><label class="form-label" for="productModel">产品型号</label><textarea class="form-textarea" id="labelgen_productModel" rows="1">XXX</textarea></div>
        <div class="form-group"><label class="form-label" for="productName">产品名称</label><textarea class="form-textarea" id="labelgen_productName" rows="1">XXX</textarea></div>
      </div>

      <!-- Brand info (gray bg for known brands, plain for "other") -->
      <div id="labelgen_brandInfoKnown" class="section-gray">
        <div class="form-group"><label class="form-label" for="company">品牌方</label><textarea class="form-textarea" id="labelgen_company" rows="1">常州克欧克厨具有限公司</textarea></div>
        <div class="form-group"><label class="form-label" for="address">品牌方地址</label><textarea class="form-textarea" id="labelgen_address" rows="1">江苏省常州市钟楼区芦墅桥北堍</textarea></div>
      </div>
      <div id="labelgen_brandInfoOther" class="hidden">
        <div class="form-group"><label class="form-label" for="customCompany">品牌方</label><input class="form-input" id="labelgen_customCompany"></div>
        <div class="form-group"><label class="form-label" for="customAddress">品牌方地址</label><input class="form-input" id="labelgen_customAddress"></div>
      </div>

      <!-- Factory -->
      <div class="form-group"><label class="form-label">生产工厂</label><select class="form-select" id="labelgen_factory"></select></div>

      <div id="labelgen_factoryKnown" class="section-gray">
        <div class="form-group"><label class="form-label" for="factoryAddress">工厂地址</label><textarea class="form-textarea" id="labelgen_factoryAddress" rows="1">常州市新北区西夏墅微山湖路38号</textarea></div>
        <div class="form-group"><label class="form-label" for="standard">执行标准</label><textarea class="form-textarea" id="labelgen_standard" rows="1">Q/320411BNG005-2020</textarea></div>
      </div>
      <div id="labelgen_factoryOther" class="hidden">
        <div class="form-group"><label class="form-label" for="customFactory">自定义生产工厂</label><textarea class="form-textarea" id="labelgen_customFactory" rows="1"></textarea></div>
        <div class="form-group"><label class="form-label" for="customFactoryAddress">工厂地址</label><textarea class="form-textarea" id="labelgen_customFactoryAddress" rows="1"></textarea></div>
        <div class="form-group"><label class="form-label" for="customStandard">执行标准</label><textarea class="form-textarea" id="labelgen_customStandard" rows="1"></textarea></div>
      </div>

      <!-- Contact & specs (3 columns) -->
      <div class="form-grid form-grid-3">
        <div class="form-group"><label class="form-label" for="servicePhone">服务电话</label><input class="form-input" id="labelgen_servicePhone" value="+86-0519-86760906"></div>
        <div class="form-group"><label class="form-label" for="material">产品材质</label><textarea class="form-textarea" id="labelgen_material" rows="1">XXX</textarea></div>
        <div class="form-group"><label class="form-label" for="size">产品尺寸</label><textarea class="form-textarea" id="labelgen_size" rows="1">XXX</textarea></div>
      </div>

      <div class="form-grid form-grid-2">
        <div class="form-group"><label class="form-label" for="netWeight">产品净重</label><textarea class="form-textarea" id="labelgen_netWeight" rows="1">XXX</textarea></div>
        <div class="form-group"><label class="form-label" for="shelfLife">保质期限</label><textarea class="form-textarea" id="labelgen_shelfLife" rows="1">5年</textarea></div>
      </div>

      <!-- Production date -->
      <div class="form-group"><label class="form-label">生产日期</label><select class="form-select" id="labelgen_productionDateType"><option value="date">选择日期</option><option value="text" selected>见说明书或铭牌</option></select></div>
      <div id="labelgen_datePicker" class="form-group hidden"><label class="form-label" for="productionDate">选择生产日期</label><input type="date" class="form-input" id="labelgen_productionDate"></div>

      <!-- Compliance -->
      <div class="form-group"><label class="form-label" for="complianceDeclaration">符合性声明</label><textarea class="form-textarea rows-3" id="labelgen_complianceDeclaration">本产品符合GB4806.1-2016、GB4806.7-2023、GB4806.9-2023等相关标准的要求。</textarea></div>

      <!-- Barcode -->
      <div class="form-group"><label class="form-label" for="barcode">条码号码</label><input class="form-input form-input-barcode" id="labelgen_barcode" value="6928307551619" placeholder="输入条码号码自动生成条形码"></div>

      <!-- Barcode position (purple bg) -->
      <div class="section-purple">
        <div class="form-grid form-grid-3">
          <div class="form-group"><label class="form-label" for="barcodeX">水平位置 (px)</label><input type="number" class="form-input" id="labelgen_barcodeX" value="65" min="0" max="200"></div>
          <div class="form-group"><label class="form-label" for="barcodeY">垂直位置 (px)</label><input type="number" class="form-input" id="labelgen_barcodeY" value="750" min="0" max="1000"></div>
          <div class="form-group"><label class="form-label" for="barcodeScale">大小缩放 (%)</label><input type="number" class="form-input" id="labelgen_barcodeScale" value="117" min="50" max="200"></div>
        </div>
      </div>

      <!-- Buttons -->
      <div class="btn-group">
        <button class="btn btn-primary" id="labelgen_btnExport">导出标签</button>
        <button class="btn btn-outline" id="labelgen_btnReset">重置</button>
      </div>
    </div>

    <!-- Right: Preview -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">标签预览</div>
        <div class="card-desc">实时预览生成的标签效果</div>
      </div>
      <div class="preview-container">
        <canvas id="labelgen_labelCanvas" width="1200" height="1000"></canvas>
      </div>
      <div class="size-hint" id="labelgen_sizeHint">当前尺寸: 1200 x 1000 像素</div>
    </div>
  </div>
</div>`;

  // ===== JS Logic =====
  // ====== BRAND CONFIG (exact copy from original) ======
var BRAND_CONFIG = {
  KEOUKE: {
    name: 'KEOUKE', logo: 'KEOUKE',
    company: '常州克欧克厨具有限公司',
    address: '江苏省常州市钟楼区芦墅桥北堍',
    factories: [
      { name: '常州欧辰机械有限公司', address: '常州市新北区西夏墅微山湖路38号', standard: 'Q/320411BNG005-2020' },
      { name: '常州市墅乐厨具有限公司', address: '常州市新北区西夏墅镇翠屏湖路19号', standard: 'Q/320411AGF016-2025' },
      { name: '其他', address: '', standard: '', isOther: true }
    ]
  },
  LULUWOOD: {
    name: 'LULUWOOD', logo: 'LULUWOOD',
    company: '常州家帮手宠物用品有限公司',
    address: '江苏省常州市钟楼区大红旗西路58号',
    factories: [
      { name: '常州家帮手宠物用品有限公司', address: '江苏省常州市钟楼区大红旗西路58号', standard: 'GB/T 43839-2024' },
      { name: '桐乡市恒爱家居用品有限公司', address: '浙江省嘉兴市桐乡市崇福镇世纪大道66号', standard: 'GB/T 22796-2021' },
      { name: '潮州市潮安区枫溪镇恩宠瓷厂', address: '广东省潮州市潮安区枫溪镇长美一村', standard: 'GB4806.1-2016' },
      { name: '潮州市枫溪自塔瓷五厂', address: '广东省潮州市潮安区东风镇送至昆江五村冬梅路西侧四亩池片2号', standard: 'GB4806.4-2016' },
      { name: '潮州市潮安区连泰不锈钢制品厂', address: '广东省潮州市潮安区东风镇送至昆江五村冬梅路西侧四亩池片2号', standard: 'GB/T 43839-2024' },
      { name: '中山市不染陶瓷有限公司', address: '广东省中山市小榄镇升平中路10号2座1206房', standard: 'GB31604.24-2016' },
      { name: '广州沙米陶家居有限公司', address: '广东省潮州市潮安区凤塘镇塘边工业区', standard: 'GB4806.4-2016' },
      { name: '其他', address: '', standard: '', isOther: true }
    ]
  },
  MAXCEYSEN: {
    name: 'MAXCEYSEN', logo: 'MAXCEYSEN',
    company: '常州麦鲜生电器有限公司',
    address: '常州市钟楼区春江南路67号联东U谷常州智能制造产业园',
    factories: [
      { name: '常州市墅乐厨具有限公司', address: '常州市新北区西夏墅镇翠屏湖路19号', standard: 'GB4706.1-2005，GB4806.1-2016，GB4706.30-2008' },
      { name: '其他', address: '', standard: '', isOther: true }
    ]
  },
  MAXCEYSEN_KEOUKE: {
    name: 'MAXCEYSEN® xKEOUKE® 联名款', logo: 'MAXCEYSEN',
    company: 'MAXCEYSEN® xKEOUKE® 联名款',
    address: '常州市钟楼区春江南路67号联东U谷常州智能制造产业园',
    factories: [
      { name: '常州市墅乐厨具有限公司', address: '常州市新北区西夏墅镇翠屏湖路19号', standard: 'GB4706.1-2005，GB4806.1-2016，GB4706.30-2008' },
      { name: '其他', address: '', standard: '', isOther: true }
    ]
  }
};

// ====== State ======
var imageWidth = 1200;
var imageHeight = 1000;
var formData = {
  brand: 'KEOUKE',
  productModel: 'XXX', productName: 'XXX',
  customBrand: '', customCompany: '', customAddress: '',
  factory: '常州欧辰机械有限公司',
  customFactory: '', customFactoryAddress: '', customStandard: '',
  factoryAddress: '常州市新北区西夏墅微山湖路38号',
  standard: 'Q/320411BNG005-2020',
  company: '常州克欧克厨具有限公司',
  address: '江苏省常州市钟楼区芦墅桥北報',
  servicePhone: '+86-0519-86760906',
  material: 'XXX', size: 'XXX', netWeight: 'XXX',
  productionDateType: 'text', productionDate: '',
  shelfLife: '5年',
  complianceDeclaration: '本产品符合GB4806.1-2016、GB4806.7-2023、GB4806.9-2023等相关标准的要求。',
  barcode: '6928307551619',
  barcodeX: 65, barcodeY: 750, barcodeScale: 117,
  fontSize: 35, fontWeight: 'bold'
};

// Defaults for reset
var resetData = JSON.parse(JSON.stringify(formData));
resetData.factory = '常州欧辰机械有限公司';
resetData.factoryAddress = '常州市新北区西夏墅微山湖路38号';
resetData.standard = 'Q/320411BNG005-2020';
resetData.company = '常州克欧克厨具有限公司';
resetData.address = '江苏省常州市钟楼区芦墅桥北報';

// ====== DOM refs ======
var $ = function(id) { return document.getElementById(id); };
var canvas = $('labelgen_labelCanvas');
var ctx = canvas.getContext('2d');

// ====== Helpers ======
function getCurrentBrandConfig() {
  return formData.brand === 'other' ? null : BRAND_CONFIG[formData.brand];
}

function getFactoryOptions() {
  var config = getCurrentBrandConfig();
  return config ? config.factories : [];
}

// ====== Display helpers ======
function getDisplayCompany() {
  return formData.brand === 'other' ? formData.customCompany : formData.company;
}
function getDisplayAddress() {
  return formData.brand === 'other' ? formData.customAddress : formData.address;
}
function getDisplayFactory() {
  return formData.factory === '其他' ? formData.customFactory : formData.factory;
}
function getDisplayFactoryAddress() {
  return formData.factory === '其他' ? formData.customFactoryAddress : formData.factoryAddress;
}
function getDisplayStandard() {
  return formData.factory === '其他' ? formData.customStandard : formData.standard;
}
function getDisplayLogo() {
  if (formData.brand === 'other') return formData.customBrand;
  var cfg = getCurrentBrandConfig();
  return cfg ? cfg.logo : '';
}
function getDisplayProductionDate() {
  if (formData.productionDateType === 'text') return '见说明书或铭牌';
  return formData.productionDate;
}

// ====== Canvas Rendering (exact copy from original) ======
function calculateScale() {
  var baseWidth = 1200, baseHeight = 1000;
  return ((imageWidth / baseWidth) + (imageHeight / baseHeight)) / 2;
}

function wrapText(context, text, maxWidth) {
  var lines = [];
  var paragraphs = text.split('\n');
  for (var p = 0; p < paragraphs.length; p++) {
    var paragraph = paragraphs[p];
    if (paragraph === '') { lines.push(''); continue; }
    var chars = paragraph.split('');
    var currentLine = '';
    for (var i = 0; i < chars.length; i++) {
      var testLine = currentLine + chars[i];
      var testWidth = context.measureText(testLine).width;
      if (testWidth > maxWidth && currentLine !== '') {
        lines.push(currentLine);
        currentLine = chars[i];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine !== '') lines.push(currentLine);
  }
  return lines;
}

function drawStar(context, cx, cy, outerRadius, innerRadius, spikes) {
  var rot = Math.PI / 2 * 3;
  var x = cx, y = cy;
  var step = Math.PI / spikes;
  context.beginPath();
  context.moveTo(cx, cy - outerRadius);
  for (var i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    context.lineTo(x, y);
    rot += step;
    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    context.lineTo(x, y);
    rot += step;
  }
  context.lineTo(cx, cy - outerRadius);
  context.closePath();
  context.fill();
}

function renderLabel() {
  if (!canvas || !ctx) return;
  var scale = calculateScale();

  canvas.width = imageWidth;
  canvas.height = imageHeight;

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Border
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.round(3 * scale);
  ctx.strokeRect(10 * scale, 10 * scale, canvas.width - 20 * scale, canvas.height - 20 * scale);

  // Set text rendering defaults
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  // Font sizes
  var baseFontSize = formData.fontSize * scale;
  var titleFontSize = Math.round(baseFontSize * 1.33);
  var contentFontSize = Math.round(baseFontSize);
  var smallFontSize = Math.round(baseFontSize * 0.78);
  var logoFontSize = Math.round(baseFontSize * 2);

  // Logo
  var logo = getDisplayLogo();
  var logoWidth = 0;
  if (logo) {
    ctx.font = formData.fontWeight + ' ' + logoFontSize + 'px Arial, sans-serif';
    ctx.fillStyle = '#000000';
    ctx.fillText(logo, 30 * scale, 30 * scale);
    logoWidth = ctx.measureText(logo).width;
  }

  // Top-right disclaimer
  ctx.font = formData.fontWeight + ' ' + smallFontSize + 'px Arial, sans-serif';
  ctx.fillStyle = '#666666';
  var topRightText = '本公司保留更改产品设计与规划的权利印刷资料和产品的颜色若与实物不同请以实物为准';
  var logoEndX = 30 * scale + logoWidth;
  var rightPadding = 30 * scale;
  var gapBetweenLogoAndText = 20 * scale;
  var maxDisclaimerWidth = canvas.width - rightPadding - logoEndX - gapBetweenLogoAndText;
  var disclaimerLines = wrapText(ctx, topRightText, maxDisclaimerWidth);
  var y = 30 * scale;
  for (var i = 0; i < disclaimerLines.length; i++) {
    ctx.fillText(disclaimerLines[i], canvas.width - ctx.measureText(disclaimerLines[i]).width - rightPadding, y);
    y += Math.round(baseFontSize * 1.11);
  }

  // Seal (black double circle + star)
  y += 15 * scale;
  var sealSize = Math.round(baseFontSize * 3.5);
  var sealX = canvas.width - sealSize - 30 * scale;
  var sealY = y;
  ctx.save();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.round(2 * scale);
  ctx.beginPath();
  ctx.arc(sealX + sealSize / 2, sealY + sealSize / 2, sealSize / 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = Math.round(1 * scale);
  ctx.beginPath();
  ctx.arc(sealX + sealSize / 2, sealY + sealSize / 2, sealSize / 2 - 5 * scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(baseFontSize * 0.65) + 'px "Microsoft YaHei", "微软雅黑", Arial, sans-serif';
  ctx.fillText('合格证', sealX + sealSize / 2, sealY + sealSize / 2 - Math.round(baseFontSize * 0.45));
  ctx.font = 'bold ' + Math.round(baseFontSize * 0.5) + 'px "Microsoft YaHei", "微软雅黑", Arial, sans-serif';
  ctx.fillText('产品', sealX + sealSize / 2, sealY + sealSize / 2 + Math.round(baseFontSize * 0.45));
  ctx.fillStyle = '#000000';
  drawStar(ctx, sealX + sealSize / 2, sealY + sealSize / 2, Math.round(baseFontSize * 0.25), Math.round(baseFontSize * 0.12), 5);
  ctx.restore();

  // Product info fields
  var fields = [];
  function addField(label, value) { fields.push({ label: label, value: value }); }
  addField('产品型号:', formData.productModel);
  addField('产品名称:', formData.productName);
  addField('品牌:', formData.brand === 'other' ? formData.customBrand : formData.brand);
  addField('品牌方:', getDisplayCompany());
  addField('品牌方地址:', getDisplayAddress());
  addField('生产工厂:', getDisplayFactory());
  addField('工厂地址:', getDisplayFactoryAddress());
  addField('执行标准:', getDisplayStandard());
  addField('服务电话:', formData.servicePhone);
  addField('产品材质:', formData.material);
  addField('产品尺寸:', formData.size);
  addField('产品净重:', formData.netWeight);
  addField('生产日期:', getDisplayProductionDate());
  addField('保质期限:', formData.shelfLife);
  addField('符合性声明:', formData.complianceDeclaration);

  var startY = Math.round(120 * scale);
  var lineHeight = Math.round(baseFontSize * 1.358);
  var labelWidth = Math.round(baseFontSize * 6.175);
  var startX = 30 * scale;

  for (var f = 0; f < fields.length; f++) {
    var field = fields[f];
    if (!field.value) continue;
    // Label - always bold
    ctx.font = 'bold ' + contentFontSize + 'px Arial, sans-serif';
    ctx.fillText(field.label, startX, startY);
    // Value - user fontWeight
    ctx.font = formData.fontWeight + ' ' + contentFontSize + 'px Arial, sans-serif';
    var valueX = startX + labelWidth;
    var valueMaxWidth = canvas.width - valueX - 40 * scale;
    var valueLines = wrapText(ctx, field.value, valueMaxWidth);
    for (var vi = 0; vi < valueLines.length; vi++) {
      ctx.fillText(valueLines[vi], valueX, startY + vi * lineHeight);
    }
    startY += lineHeight * valueLines.length;
  }

  // Barcode
  if (formData.barcode) {
    var userScale = formData.barcodeScale / 100;
    var barcodeHeight = Math.round(80 * 1.5 * scale * userScale);
    var barcodeWidth = Math.round(300 * 1.5 * scale * userScale);

    var tempCanvas = document.createElement('canvas');
    var tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCanvas.width = barcodeWidth;
      tempCanvas.height = barcodeHeight;
      try {
        JsBarcode(tempCanvas, formData.barcode, {
          format: 'EAN13',
          width: Math.round(2 * 1.5 * scale * userScale),
          height: Math.round(60 * 1.5 * scale * userScale),
          displayValue: true,
          fontSize: Math.round(baseFontSize * 0.78 * 1.5 * userScale),
          margin: Math.round(10 * 1.5 * scale * userScale),
          fontOptions: formData.fontWeight === 'bold' ? 'bold' : 'normal',
          font: 'Arial'
        });

        ctx.save();
        var borderPadding = 10 * scale;
        var targetX = canvas.width - borderPadding - formData.barcodeX * scale;
        var targetY = formData.barcodeY * scale;
        ctx.translate(targetX, targetY);
        ctx.rotate(-Math.PI / 2);
        ctx.drawImage(tempCanvas, 0, -barcodeHeight);
        ctx.restore();
      } catch(e) {
        console.error('Barcode error:', e);
      }
    }
  }

  $('labelgen_sizeHint').textContent = '当前尺寸: ' + imageWidth + ' x ' + imageHeight + ' 像素';
}

// ====== UI Update Functions ======
function updateUI() {
  var isOther = formData.brand === 'other';
  var factoryIsOther = formData.factory === '其他';

  // Brand sections
  $('labelgen_customBrandGroup').classList.toggle('hidden', !isOther);
  $('labelgen_brandInfoKnown').classList.toggle('hidden', isOther);
  $('labelgen_brandInfoOther').classList.toggle('hidden', !isOther);

  // Factory options
  var factorySel = $('labelgen_factory');
  factorySel.innerHTML = '';
  var options = getFactoryOptions();
  for (var i = 0; i < options.length; i++) {
    var opt = document.createElement('option');
    opt.value = options[i].name;
    opt.textContent = options[i].name;
    if (options[i].name === formData.factory) opt.selected = true;
    factorySel.appendChild(opt);
  }

  // Factory sections
  $('labelgen_factoryKnown').classList.toggle('hidden', factoryIsOther);
  $('labelgen_factoryOther').classList.toggle('hidden', !factoryIsOther);

  // Date picker
  $('labelgen_datePicker').classList.toggle('hidden', formData.productionDateType !== 'date');

  // Update disabled fields in known sections
  if (!isOther) {
    $('labelgen_company').value = formData.company;
    $('labelgen_address').value = formData.address;
  }
  if (!factoryIsOther) {
    $('labelgen_factoryAddress').value = formData.factoryAddress;
    $('labelgen_standard').value = formData.standard;
  }
}

// ====== Event Handlers ======
function handleBrandChange(value) {
  var config = value !== 'other' ? BRAND_CONFIG[value] : null;
  var firstFactory = config ? config.factories[0] : null;
  formData.brand = value;
  formData.customBrand = '';
  formData.customCompany = '';
  formData.customAddress = '';
  formData.customFactory = '';
  formData.customFactoryAddress = '';
  formData.customStandard = '';
  formData.factory = firstFactory ? firstFactory.name : '其他';
  formData.factoryAddress = firstFactory ? firstFactory.address : '';
  formData.standard = firstFactory ? firstFactory.standard : '';
  formData.company = config ? config.company : '';
  formData.address = config ? config.address : '';
  $('labelgen_customBrand').value = '';
  $('labelgen_customCompany').value = '';
  $('labelgen_customAddress').value = '';
  $('labelgen_customFactory').value = '';
  $('labelgen_customFactoryAddress').value = '';
  $('labelgen_customStandard').value = '';
  updateUI();
  renderLabel();
}

function handleFactoryChange(value) {
  formData.factory = value;
  formData.customFactory = '';
  formData.customFactoryAddress = '';
  formData.customStandard = '';
  var options = getFactoryOptions();
  var selected = null;
  for (var i = 0; i < options.length; i++) {
    if (options[i].name === value) { selected = options[i]; break; }
  }
  formData.factoryAddress = selected ? selected.address : '';
  formData.standard = selected ? selected.standard : '';
  $('labelgen_customFactory').value = '';
  $('labelgen_customFactoryAddress').value = '';
  $('labelgen_customStandard').value = '';
  updateUI();
  renderLabel();
}

// ====== Export & Reset ======
function exportImage() {
  renderLabel();
  var link = document.createElement('a');
  link.download = '标签_' + (formData.productName || '产品') + '_' + Date.now() + '.png';
  link.href = canvas.toDataURL('image/png', 1.0);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function resetForm() {
  formData = JSON.parse(JSON.stringify(resetData));
  imageWidth = 1200;
  imageHeight = 1000;
  // Sync all DOM fields
  syncFormToDom();
  updateUI();
  renderLabel();
}

function syncFormToDom() {
  $('labelgen_imageWidth').value = imageWidth;
  $('labelgen_imageHeight').value = imageHeight;
  $('labelgen_fontSize').value = formData.fontSize;
  $('labelgen_fontWeight').value = formData.fontWeight;
  $('labelgen_brand').value = formData.brand;
  $('labelgen_productModel').value = formData.productModel;
  $('labelgen_productName').value = formData.productName;
  $('labelgen_customBrand').value = formData.customBrand;
  $('labelgen_company').value = formData.company;
  $('labelgen_address').value = formData.address;
  $('labelgen_customCompany').value = formData.customCompany;
  $('labelgen_customAddress').value = formData.customAddress;
  $('labelgen_customFactory').value = formData.customFactory;
  $('labelgen_customFactoryAddress').value = formData.customFactoryAddress;
  $('labelgen_customStandard').value = formData.customStandard;
  $('labelgen_factoryAddress').value = formData.factoryAddress;
  $('labelgen_standard').value = formData.standard;
  $('labelgen_servicePhone').value = formData.servicePhone;
  $('labelgen_material').value = formData.material;
  $('labelgen_size').value = formData.size;
  $('labelgen_netWeight').value = formData.netWeight;
  $('labelgen_productionDateType').value = formData.productionDateType;
  $('labelgen_productionDate').value = formData.productionDate;
  $('labelgen_shelfLife').value = formData.shelfLife;
  $('labelgen_complianceDeclaration').value = formData.complianceDeclaration;
  $('labelgen_barcode').value = formData.barcode;
  $('labelgen_barcodeX').value = formData.barcodeX;
  $('labelgen_barcodeY').value = formData.barcodeY;
  $('labelgen_barcodeScale').value = formData.barcodeScale;
  updateUI();
}

// ====== Event Binding ======
function bindEvents() {
  $('labelgen_imageWidth').addEventListener('input', function() { imageWidth = parseInt(this.value) || 1200; renderLabel(); });
  $('labelgen_imageHeight').addEventListener('input', function() { imageHeight = parseInt(this.value) || 1000; renderLabel(); });
  $('labelgen_fontSize').addEventListener('input', function() { formData.fontSize = parseInt(this.value) || 35; renderLabel(); });
  $('labelgen_fontWeight').addEventListener('change', function() { formData.fontWeight = this.value; renderLabel(); });
  $('labelgen_brand').addEventListener('change', function() { handleBrandChange(this.value); });

  $('labelgen_customBrand').addEventListener('input', function() { formData.customBrand = this.value; renderLabel(); });
  $('labelgen_productModel').addEventListener('input', function() { formData.productModel = this.value; renderLabel(); });
  $('labelgen_productName').addEventListener('input', function() { formData.productName = this.value; renderLabel(); });
  $('labelgen_company').addEventListener('input', function() { formData.company = this.value; renderLabel(); });
  $('labelgen_address').addEventListener('input', function() { formData.address = this.value; renderLabel(); });
  $('labelgen_customCompany').addEventListener('input', function() { formData.customCompany = this.value; renderLabel(); });
  $('labelgen_customAddress').addEventListener('input', function() { formData.customAddress = this.value; renderLabel(); });

  $('labelgen_factory').addEventListener('change', function() { handleFactoryChange(this.value); });
  $('labelgen_factoryAddress').addEventListener('input', function() { formData.factoryAddress = this.value; renderLabel(); });
  $('labelgen_standard').addEventListener('input', function() { formData.standard = this.value; renderLabel(); });
  $('labelgen_customFactory').addEventListener('input', function() { formData.customFactory = this.value; renderLabel(); });
  $('labelgen_customFactoryAddress').addEventListener('input', function() { formData.customFactoryAddress = this.value; renderLabel(); });
  $('labelgen_customStandard').addEventListener('input', function() { formData.customStandard = this.value; renderLabel(); });

  $('labelgen_servicePhone').addEventListener('input', function() { formData.servicePhone = this.value; renderLabel(); });
  $('labelgen_material').addEventListener('input', function() { formData.material = this.value; renderLabel(); });
  $('labelgen_size').addEventListener('input', function() { formData.size = this.value; renderLabel(); });
  $('labelgen_netWeight').addEventListener('input', function() { formData.netWeight = this.value; renderLabel(); });
  $('labelgen_shelfLife').addEventListener('input', function() { formData.shelfLife = this.value; renderLabel(); });

  $('labelgen_productionDateType').addEventListener('change', function() {
    formData.productionDateType = this.value;
    $('labelgen_datePicker').classList.toggle('hidden', this.value !== 'date');
    renderLabel();
  });
  $('labelgen_productionDate').addEventListener('change', function() { formData.productionDate = this.value; renderLabel(); });

  $('labelgen_complianceDeclaration').addEventListener('input', function() { formData.complianceDeclaration = this.value; renderLabel(); });
  $('labelgen_barcode').addEventListener('input', function() { formData.barcode = this.value; renderLabel(); });
  $('labelgen_barcodeX').addEventListener('input', function() { formData.barcodeX = parseInt(this.value) || 0; renderLabel(); });
  $('labelgen_barcodeY').addEventListener('input', function() { formData.barcodeY = parseInt(this.value) || 0; renderLabel(); });
  $('labelgen_barcodeScale').addEventListener('input', function() { formData.barcodeScale = parseInt(this.value) || 100; renderLabel(); });

  $('labelgen_btnExport').addEventListener('click', exportImage);
  $('labelgen_btnReset').addEventListener('click', resetForm);
}

// ====== Init ======
updateUI();
bindEvents();
renderLabel();


}

function Tool_label_gen_deactivate() {
  // cleanup if needed
}
