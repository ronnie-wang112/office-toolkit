#!/usr/bin/env python3
"""
RunningHub AI 生图代理 — 保护 API 密钥不在浏览器端暴露
所有请求: 网页 → localhost:8765 → RunningHub API
"""
import http.server
import urllib.request
import urllib.parse
import json
import ssl
import sys

PORT = 8765
API_BASE = 'https://www.runninghub.cn/openapi/v2'
# ⚠️ 密钥仅存储在服务器端，永不发送到浏览器
API_KEY = 'ba30994af7c94aa9b3da61c97b4c8263'

class ImageProxy(http.server.BaseHTTPRequestHandler):

    def do_GET(self):
        if self.path == '/health':
            return self._json({'status': 'ok', 'service': 'image-gen-proxy'})

        # Poll task result
        if self.path.startswith('/api/task/'):
            task_id = self.path.split('/')[-1]
            return self._poll_task(task_id)

        self._error(404, 'Unknown endpoint')

    def do_POST(self):
        content_len = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(content_len)) if content_len > 0 else {}

        if self.path == '/api/generate':
            return self._generate(body)
        elif self.path == '/api/upload':
            return self._error(400, 'Upload requires multipart, use /api/generate with base64')

        self._error(404, 'Unknown endpoint')

    def do_OPTIONS(self):
        self._cors_headers()
        self.send_response(204)
        self.end_headers()

    def _generate(self, body):
        """Submit image generation task"""
        prompt = body.get('prompt', '')
        aspect_ratio = body.get('aspectRatio', '1:1')
        resolution = body.get('resolution', '1k')
        image_data = body.get('imageData', None)  # base64 data URI

        if not prompt:
            return self._error(400, 'Missing prompt')

        # Build request payload
        payload = {
            'prompt': prompt,
            'imageUrls': [],
            'aspectRatio': aspect_ratio,
            'resolution': resolution,
        }

        if image_data:
            payload['imageUrls'] = [image_data]

        print(f'  → 提交生图: prompt={prompt[:50]}... ratio={aspect_ratio} res={resolution}')
        result = self._call_api('POST', f'{API_BASE}/rhart-image-g-2/image-to-image', payload)
        if result:
            return self._json({'success': True, 'taskId': result.get('taskId'), 'status': result.get('status')})
        return self._error(502, 'API request failed')

    def _poll_task(self, task_id):
        """Poll task status until complete"""
        max_retries = 60  # 60 * 3s = 3 min timeout
        for i in range(max_retries):
            result = self._call_api('GET', f'{API_BASE}/task/result?taskId={task_id}')
            if not result:
                return self._error(502, 'Task query failed')

            status = result.get('status')
            if status == 'SUCCESS':
                print(f'  ✅ 生图完成: {task_id}')
                # Extract result URLs
                results = result.get('results', [])
                images = []
                for r in results:
                    if r.get('url') and r.get('outputType') in ('png', 'jpg', 'jpeg', 'webp'):
                        images.append({'url': r['url'], 'type': r['outputType']})
                return self._json({'success': True, 'status': 'SUCCESS', 'images': images, 'taskId': task_id})

            if status in ('FAILED', 'ERROR'):
                print(f'  ❌ 生图失败: {task_id} - {result.get("errorMessage", "")}')
                return self._json({'success': False, 'status': status,
                    'error': result.get('errorMessage', 'Generation failed')})

            # Still running
            if i % 5 == 0:
                print(f'  ⏳ 等待中... ({i*3}s)')

        return self._json({'success': False, 'status': 'TIMEOUT', 'error': 'Task timed out after 3 minutes'})

    def _call_api(self, method, url, body=None):
        """Call RunningHub API"""
        try:
            data = json.dumps(body).encode('utf-8') if body else None
            req = urllib.request.Request(url, data=data, method=method)
            req.add_header('Content-Type', 'application/json')
            req.add_header('Authorization', f'Bearer {API_KEY}')
            req.add_header('User-Agent', 'KeoukeOfficeTool/1.0')

            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE

            with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except Exception as e:
            print(f'  API error: {e}', file=sys.stderr)
            return None

    def _cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _json(self, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self._cors_headers()
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)

    def _error(self, code, msg):
        body = json.dumps({'success': False, 'error': msg}, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self._cors_headers()
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        pass

if __name__ == '__main__':
    print(f'🎨 Image2.0 生图代理已启动: http://localhost:{PORT}')
    print(f'   API 密钥已内置，不会暴露到浏览器')
    print(f'   /api/generate  POST  - 提交生图任务')
    print(f'   /api/task/{id} GET   - 查询任务结果')
    print()
    httpd = http.server.HTTPServer(('0.0.0.0', PORT), ImageProxy)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n代理已停止')
        httpd.shutdown()
