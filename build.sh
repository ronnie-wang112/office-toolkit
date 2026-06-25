#!/bin/bash
# 打包脚本 - 生成可分发的 ZIP 文件

cd "$(dirname "$0")"
NAME="办公工具箱_$(date +%Y%m%d)"

echo "📦 正在打包: ${NAME}.zip ..."

zip -r "${NAME}.zip" \
  index.html manifest.json sw.js start.sh build.sh \
  css/ js/ lib/ assets/ \
  -x "*.git*" "*.DS_Store" \
  -x "lib/opencv.js" \
  2>/dev/null

SIZE=$(du -h "${NAME}.zip" | cut -f1)
echo ""
echo "✅ 已生成: ${NAME}.zip (${SIZE})"
echo ""
echo "⚠️  注意: 未包含 OpenCV.js (10MB)。"
echo "   如需扫描仪「自动检测+矫正」功能，请单独把 lib/opencv.js 发给对方放入 lib/ 目录。"
echo "   基础扫描（拍照增强）不受影响。"
echo ""

# Also generate full version with opencv
read -p "是否同时生成包含 OpenCV 的完整版？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  zip -r "${NAME}_完整版.zip" \
    index.html manifest.json sw.js start.sh build.sh \
    css/ js/ lib/ assets/ \
    -x "*.git*" "*.DS_Store" \
    2>/dev/null
  FULLSIZE=$(du -h "${NAME}_完整版.zip" | cut -f1)
  echo "✅ 已生成: ${NAME}_完整版.zip (${FULLSIZE})"
fi
