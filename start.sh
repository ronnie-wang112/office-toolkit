#!/bin/bash
# 克欧克办公工具 - 一键启动脚本
# 同时启动网页服务器(8080)和抖音代理(8765)

WEB_PORT=8080
PROXY_PORT=8765

echo "=================================="
echo "  克欧克办公工具"
echo "=================================="
echo ""

LOCAL_IP=$(ifconfig 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

echo "🌐 网页访问: http://localhost:$WEB_PORT"
if [ -n "$LOCAL_IP" ]; then
  echo "📱 手机访问: http://$LOCAL_IP:$WEB_PORT"
fi
echo "🎬 抖音代理: http://localhost:$PROXY_PORT (自动启动)"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo ""

cleanup() {
  echo ""
  echo "正在停止服务..."
  kill $WEB_PID $PROXY_PID 2>/dev/null
  exit 0
}
trap cleanup INT TERM

# Start Douyin proxy
python3 proxy.py &
PROXY_PID=$!
sleep 1

# Verify proxy is running
if ! kill -0 $PROXY_PID 2>/dev/null; then
  echo "⚠️  抖音代理启动失败，下载功能将使用线上代理（可能不稳定）"
else
  echo "✅ 抖音代理已启动 (PID: $PROXY_PID)"
fi

# Start web server
if command -v python3 &> /dev/null; then
  python3 -m http.server $WEB_PORT &
  WEB_PID=$!
elif command -v python &> /dev/null; then
  python -m http.server $WEB_PORT &
  WEB_PID=$!
elif command -v npx &> /dev/null; then
  npx serve . -l $WEB_PORT &
  WEB_PID=$!
else
  echo "❌ 未找到 Python"
  kill $PROXY_PID 2>/dev/null
  exit 1
fi

echo "✅ 网页服务器已启动 (PID: $WEB_PID)"
echo ""

wait
