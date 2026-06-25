# Design Ideate — 本地办公工具箱

Goal: 提升到专业工具品质   User: 办公人群 PC+手机   JTBD: 快速找到工具 → 流畅操作

---

## Direction A — "Soft Glass" (柔和毛玻璃)
principle: 通过半透明、模糊、柔和阴影营造轻盈高级感，类似 macOS / iOS 原生应用
layout: 卡片保留网格，但材质改为毛玻璃 + 微渐变背景，header 固定毛玻璃
colors: 柔和渐变（蓝紫→粉），低饱和度，通透感
type: SF Pro / 苹方，大标题 thin weight
optimizes: 现代感、轻盈、亲近感
sacrifices: 功能感偏弱，毛玻璃在低端手机上性能差
fits goal: 中等 — 美观但可能不够"工具感"

## Direction B — "Vibrant System" (活力系统) ★ 推荐
principle: 清晰几何、大胆色彩、系统字体的专业工具感，对标 Linear / Notion
layout: 每分类独立强调色（PDF=蓝、图片=绿、扫描=橙、工具=紫），卡片 hover 时背景色微变
colors: 高对比度，深色模式下蓝灰基调 + 降低饱和
type: 系统无衬线，粗体标题、等宽代码区
optimizes: 信息层级清晰、功能区分明显、专业可信赖
sacrifices: 需要精心调色避免花哨
fits goal: 强 — 直接服务"快速定位工具"这个 JTBD

## Direction C — "Warm Paper" (暖纸质感)
principle: 模拟纸张/笔记本质感，温暖中性色 + 微妙纹理，类似 Craft
layout: 卡片加细微边框阴影模拟纸张叠层，背景暖灰
colors: cream/beige 基调，accent 为深棕/暗红
type: 标题可混入衬线体
optimizes: 温暖、长时使用不疲劳
sacrifices: 不够"科技感"，暗色模式难以模拟纸张
fits goal: 弱 — 办公工具用纸张隐喻合理但可能显得过时

---

## 推荐：Direction B — "Vibrant System"

理由：
1. 分类色系统直接解决审计中"视觉噪音大、信息层级弱"的问题（issue #1 #3）
2. 高对比度 + 系统字体的策略最适合 PC+手机双端
3. 深色模式蓝灰基调解决 issue #8（深色配色生硬）
4. 与 Linear/Notion 同级审美，给同事的专业印象最好
5. 纯 CSS 可实现，不增体积

是否按 Direction B 推进实施？
