#!/usr/bin/env python3
"""
本地抖音代理服务器
启动方式: python3 proxy.py
监听端口: 8765
用途: 转发抖音 API 请求，绕过浏览器 CORS 限制
"""
import http.server
import urllib.request
import urllib.parse
import json
import ssl
import re
import sys
import os

PORT = 8765
ALLOWED_ORIGIN = os.environ.get('PROXY_ORIGIN', '*')

class DouyinProxy(http.server.BaseHTTPRequestHandler):
    
    def do_GET(self):
        # Health check
        if self.path == '/health':
            return self._json({'status': 'ok', 'service': 'douyin-proxy'})
        
        # API: /api/video?id=VIDEO_ID
        if self.path.startswith('/api/video'):
            return self._handle_video()
        
        # API: /api/resolve?url=SHORT_URL
        if self.path.startswith('/api/resolve'):
            return self._handle_resolve()
        
        self._error(404, 'Unknown endpoint. Try /api/video?id=XXX or /api/resolve?url=XXX')

    def _handle_video(self):
        """Get video info by video ID"""
        params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        video_id = params.get('id', [None])[0]
        
        if not video_id:
            return self._error(400, 'Missing parameter: id')
        
        # Try multiple Douyin API endpoints
        api_urls = [
            f'https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids={video_id}',
            f'https://www.douyin.com/aweme/v1/web/aweme/detail/?aweme_id={video_id}',
        ]
        
        for api_url in api_urls:
            try:
                data = self._fetch(api_url)
                if data and data.get('item_list'):
                    item = data['item_list'][0]
                    video = item.get('video', {})
                    play_addr = video.get('play_addr', {})
                    cover = video.get('cover', {})
                    
                    # Get watermark-free URL
                    video_url = ''
                    if play_addr.get('url_list'):
                        video_url = play_addr['url_list'][0].replace('playwm', 'play')
                    
                    author = item.get('author', {})
                    return self._json({
                        'success': True,
                        'video_id': video_id,
                        'title': item.get('desc', ''),
                        'author': author.get('nickname', ''),
                        'thumbnail': cover.get('url_list', [''])[0] if cover.get('url_list') else '',
                        'video_url': video_url,
                        'duration': video.get('duration', 0),
                    })
            except Exception as e:
                print(f'  API error: {e}', file=sys.stderr)
                continue
        
        return self._error(502, 'Failed to fetch video info from all endpoints')

    def _handle_resolve(self):
        """Resolve short link to video ID"""
        params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        url = params.get('url', [None])[0]
        
        if not url:
            return self._error(400, 'Missing parameter: url')
        
        # Follow redirect to get final URL
        try:
            req = urllib.request.Request(url, method='HEAD')
            req.add_header('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)')
            
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            
            resp = urllib.request.urlopen(req, context=ctx, timeout=10)
            final_url = resp.geturl()
            
            # Extract video ID
            video_id = None
            m = re.search(r'/video/(\d+)', final_url)
            if m:
                video_id = m[1]
            else:
                # Try from HTML
                m = re.search(r'video/(\d+)', url)
                if m:
                    video_id = m[1]
            
            if video_id:
                return self._json({'success': True, 'video_id': video_id, 'url': final_url})
            
            return self._error(404, 'Could not extract video ID')
            
        except Exception as e:
            return self._error(502, f'Resolve failed: {str(e)}')

    def _fetch(self, url):
        """Fetch URL with proper headers"""
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15')
        req.add_header('Referer', 'https://www.douyin.com/')
        
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            return json.loads(resp.read().decode('utf-8'))

    def _json(self, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)

    def _error(self, code, msg):
        body = json.dumps({'success': False, 'error': msg}, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Max-Age', '86400')
        self.end_headers()

    def log_message(self, format, *args):
        # Quiet logging
        pass

if __name__ == '__main__':
    print(f'🎬 抖音代理已启动: http://localhost:{PORT}')
    print(f'   /health      - 健康检查')
    print(f'   /api/video?id=VIDEO_ID  - 获取视频信息')
    print(f'   /api/resolve?url=URL    - 解析短链接')
    print()
    httpd = http.server.HTTPServer(('0.0.0.0', PORT), DouyinProxy)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n代理已停止')
        httpd.shutdown()
