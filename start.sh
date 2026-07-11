#!/bin/bash
# 克欧克办公工具 - 一键启动脚本
# 同时启动网页服务器(8080)和生图代理(8765)

PROXY_PORT=8765

PORT=8080

echo "=================================="
echo "  克欧克办公工具"
echo "=================================="
echo ""

LOCAL_IP=$(ifconfig 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

echo "🎨 生图代理: http://localhost:$PROXY_PORT (自动启动)"
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
  kill $WEB_PID $PROXY_PID 2>/dev/null
  exit 0
}
trap cleanup INT TERM

# Start image gen proxy
python3 proxy.py &
PROXY_PID=$!
sleep 1
if kill -0 $PROXY_PID 2>/dev/null; then
  echo "✅ 生图代理已启动 (PID: $PROXY_PID)"
else
  echo "⚠️  生图代理启动失败，image2.0生图功能将不可用"
fi

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
