# Design Audit — 本地办公工具箱

target: index.html + css/style.css   goal: 提升视觉品质到专业工具水准

| # | area       | issue                                                   | sev  | fix                                    | eff |
|---|------------|---------------------------------------------------------|------|----------------------------------------|-----|
| 1 | hierarchy  | 卡片用 emoji 图标，大小不一、风格不统一，视觉噪音大      | HIGH | 统一 SVG 图标系统，24px 线性图标       | M   |
| 2 | hierarchy  | 页面无 hero/引导区，开屏就是密集网格，无呼吸感           | MED  | 增加页面顶部标题+描述区               | S   |
| 3 | clarity    | 卡片只有图标+标题+描述，信息密度低，无视觉层次            | HIGH | 图标上色、标题区加重、描述弱化         | S   |
| 4 | visual     | 色彩体系过于保守（单色 indigo），缺少个性                | HIGH | 采用渐变色系 + 每个分类独立强调色      | M   |
| 5 | visual     | 阴影系统过于平淡（Tailwind 默认），缺乏深度感            | MED  | 增加柔和彩色阴影、毛玻璃效果           | S   |
| 6 | visual     | Header 纯白+单线边框，无品牌感                          | MED  | 渐变背景 or 毛玻璃 + 加粗 logo 字重    | S   |
| 7 | visual     | Tab 按钮是基础 pill，与卡片风格割裂                      | MED  | 统一圆角语言 + 激活态下划线/填充       | S   |
| 8 | visual     | 深色模式配色生硬（直接取反色），缺少暖调                  | HIGH | 使用蓝灰基调 + 降低对比度              | M   |
| 9 | clarity    | 工具 workspace 内返回按钮样式简陋，back-btn 仅文字+箭头  | LOW  | 改为 breadcrumb 或固定顶栏             | S   |
| 10| consistency| 圆角不统一：卡片 12px / tabs 20px / 按钮 6px            | MED  | 建立圆角 scale：4-8-12-16              | S   |
| 11| delight    | 零微交互：hover 仅 translateY + box-shadow，体验呆板    | MED  | 增加 hover 缩放、颜色过渡、加载微动   | M   |
| 12| a11y       | 聚焦样式缺失（:focus-visible 无 ring）                  | MED  | 全局 focus-visible ring                | S   |
| 13| layout     | 手机端卡片 2 列太密，触摸目标偏小                        | MED  | 手机端改为单列列表 + 更大触摸区域      | M   |

verdict: 3 HIGH + 7 MED + 1 LOW 问题；核心问题是 **视觉系统缺乏设计语言**（色彩、阴影、圆角、图标均不成体系）。
修复前3个 HIGH + 3-4 个 MED 即可显著提升品质感。
