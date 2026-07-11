#!/usr/bin/env python3
"""
Railway 统一服务入口：静态文件 + RunningHub API 代理
"""
import http.server
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from proxy import ImageProxy

PORT = int(os.environ.get('PORT', 8080))
STATIC_DIR = os.path.dirname(os.path.abspath(__file__))

CT_MAP = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.wasm': 'application/wasm',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.woff2': 'font/woff2',
    '.pdf': 'application/pdf',
}


class CombinedHandler(ImageProxy):

    def do_GET(self):
        # API routes → delegate to ImageProxy
        if self.path == '/health' or self.path.startswith('/api/task/'):
            return ImageProxy.do_GET(self)

        # Static file serving
        path = self.path.lstrip('/') or 'index.html'
        filepath = os.path.join(STATIC_DIR, path)

        if os.path.isfile(filepath):
            self.send_response(200)
            ext = os.path.splitext(path)[1].lower()
            self.send_header('Content-Type', CT_MAP.get(ext, 'application/octet-stream'))
            self.send_header('Cache-Control', 'public, max-age=3600')
            self.end_headers()
            with open(filepath, 'rb') as f:
                self.wfile.write(f.read())
        else:
            # SPA fallback
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            with open(os.path.join(STATIC_DIR, 'index.html'), 'rb') as f:
                self.wfile.write(f.read())

    def do_POST(self):
        return ImageProxy.do_POST(self)

    def do_OPTIONS(self):
        return ImageProxy.do_OPTIONS(self)


if __name__ == '__main__':
    print(f'🚀 克欧克办公工具启动: http://0.0.0.0:{PORT}')
    httpd = http.server.HTTPServer(('0.0.0.0', PORT), CombinedHandler)
    httpd.serve_forever()
