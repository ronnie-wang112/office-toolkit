#!/bin/bash
# 克欧克办公工具 - 一键启动脚本
# 启动后可在同一 WiFi 下的手机浏览器访问

PORT=8080

echo "=================================="
echo "  克欧克办公工具"
echo "=================================="
echo ""

# Get local IP
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

echo "🌐 本地访问: http://localhost:$PORT"
if [ -n "$LOCAL_IP" ]; then
  echo "📱 手机访问: http://$LOCAL_IP:$PORT"
fi
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

# Try Python 3 first
if command -v python3 &> /dev/null; then
  python3 -m http.server $PORT
elif command -v python &> /dev/null; then
  python -m http.server $PORT
elif command -v npx &> /dev/null; then
  npx serve . -l $PORT
else
  echo "❌ 未找到 Python 或 Node.js，请安装其中之一"
  exit 1
fi
