#!/bin/bash
# 克欧克办公工具 - 一键启动脚本

PORT=8080

echo "=================================="
echo "  克欧克办公工具"
echo "=================================="
echo ""

LOCAL_IP=$(ifconfig 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

echo "🌐 网页访问: http://localhost:$PORT"
if [ -n "$LOCAL_IP" ]; then
  echo "📱 手机访问: http://$LOCAL_IP:$PORT"
fi
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

cleanup() {
  echo ""
  echo "正在停止..."
  kill $WEB_PID 2>/dev/null
  exit 0
}
trap cleanup INT TERM

if command -v python3 &> /dev/null; then
  python3 -m http.server $PORT &
  WEB_PID=$!
elif command -v python &> /dev/null; then
  python -m http.server $PORT &
  WEB_PID=$!
else
  echo "❌ 未找到 Python"
  exit 1
fi

echo "✅ 服务器已启动"
wait
