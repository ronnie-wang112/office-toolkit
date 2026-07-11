#!/usr/bin/env python3
"""
RunningHub 生图代理 — 可部署到 Railway/Render 等云服务
API 密钥通过环境变量 RUNNINGHUB_API_KEY 设置
"""
import http.server
import urllib.request
import urllib.parse
import json
import ssl
import sys
import os

PORT = int(os.environ.get('PORT', 8765))
API_BASE = 'https://www.runninghub.cn/openapi/v2'
API_KEY = os.environ.get('RUNNINGHUB_API_KEY', '')

if not API_KEY:
    print('❌ 请设置环境变量 RUNNINGHUB_API_KEY', file=sys.stderr)
    API_KEY = ''

class ImageProxy(http.server.BaseHTTPRequestHandler):

    def do_GET(self):
        if self.path == '/health':
            return self._json({'status': 'ok'})
        if self.path.startswith('/api/task/'):
            return self._poll_task(self.path.split('/')[-1])
        self._error(404, 'Unknown endpoint')

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(length)) if length > 0 else {}
        if self.path == '/api/generate':
            return self._generate(body)
        self._error(404, 'Unknown endpoint')

    def do_OPTIONS(self):
        self._cors()
        self.send_response(204)
        self.end_headers()

    def _generate(self, body):
        prompt = body.get('prompt', '')
        if not prompt:
            return self._error(400, 'Missing prompt')

        payload = {
            'prompt': prompt,
            'imageUrls': [body['imageData']] if body.get('imageData') else [],
            'aspectRatio': body.get('aspectRatio', '1:1'),
            'resolution': body.get('resolution', '1k'),
        }
        print(f'→ 生图: {prompt[:60]}...')
        result = self._api('POST', f'{API_BASE}/rhart-image-g-2/image-to-image', payload)
        if result:
            return self._json({'success': True, 'taskId': result.get('taskId')})
        return self._error(502, 'API failed')

    def _poll_task(self, task_id):
        for i in range(80):  # ~4 min timeout
            result = self._api('GET', f'{API_BASE}/task/result?taskId={task_id}')
            if not result:
                return self._error(502, 'Query failed')
            status = result.get('status')
            if status == 'SUCCESS':
                images = [{'url': r['url'], 'type': r.get('outputType', 'png')}
                          for r in result.get('results', [])
                          if r.get('url') and r.get('outputType') in ('png', 'jpg', 'jpeg', 'webp')]
                print(f'✅ 完成: {task_id}')
                return self._json({'success': True, 'status': 'SUCCESS', 'images': images, 'taskId': task_id})
            if status in ('FAILED', 'ERROR'):
                return self._json({'success': False, 'error': result.get('errorMessage', 'Failed')})
            if i % 10 == 0:
                print(f'⏳ 等待... ({i*3}s)')
        return self._json({'success': False, 'error': 'Timeout'})

    def _api(self, method, url, body=None):
        try:
            data = json.dumps(body).encode() if body else None
            req = urllib.request.Request(url, data=data, method=method)
            req.add_header('Content-Type', 'application/json')
            req.add_header('Authorization', f'Bearer {API_KEY}')
            req.add_header('User-Agent', 'KeoukeOfficeTool/1.0')
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except Exception as e:
            print(f'API error: {e}', file=sys.stderr)
            return None

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _json(self, data):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self._cors()
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)

    def _error(self, code, msg):
        body = json.dumps({'success': False, 'error': msg}, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self._cors()
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        pass

if __name__ == '__main__':
    print(f'🎨 生图代理启动: port={PORT}')
    httpd = http.server.HTTPServer(('0.0.0.0', PORT), ImageProxy)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        httpd.shutdown()
