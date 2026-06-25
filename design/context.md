# Context — 本地办公工具箱视觉重设计

## goal
将现有办公工具箱从"能用但简陋"提升到"专业美观、有品质感"，让用户（自己和同事）愿意日常使用，视觉上对标 Notion/Craft/Linear 等现代工具。

## user
- 办公人员，PC 浏览器 + 手机浏览器
- 非技术背景同事也能直观使用
- 对 WPS/夸克等商业工具有审美预期

## JTBD
找到需要的工具 → 一眼识别功能 → 流畅操作 → 获得结果，全程感觉"精致不廉价"

## constraints
- 纯前端单页应用，`index.html` + `css/style.css` + JS 工具模块
- 必须支持 PWA 离线 + 深色模式
- 不能引入构建工具或运行时依赖
- 体积不能显著膨胀（现有 lib ~3MB + opencv 10MB）
- card grid 布局保留（功能入口），workspace 保留（工具操作区）

## success criteria
- 视觉第一印象：现代、干净、专业（主观但目标明确）
- 卡片信息层级清晰，3 秒可定位目标工具
- 深色模式同样精致，不是简单反色
- 手机端布局不崩，操作舒适

## scope v1
- 重写 CSS 变量体系（颜色、阴影、圆角、间距）
- 重设计 header、tabs、cards、workspace、modals、toasts
- 添加微交互（hover/active 过渡、焦点状态）
- 统一图标系统（SVG 替代 emoji）
- 优化深色模式配色

## non-goals
- 不改 JS 逻辑（功能不变）
- 不添加新工具
- 不加动画框架
- 不改 PWA/service worker 逻辑

## open assumptions
- 假定用户偏好简洁现代而非花哨装饰风格
- 假定沿用 card grid 入口 + workspace 操作的两层结构

## ⚠ risks
- 如果 CSS 改动过大可能影响 JS 中动态创建的元素样式
- 深色模式变量重构可能引入不一致
