# -*- coding: utf-8 -*-
"""
腾讯云函数 SCF Web 函数 — RunningHub 生图 API 代理
"""
import json
import urllib.request
import urllib.parse
import ssl
import os

API_BASE = 'https://www.runninghub.cn/openapi/v2'
API_KEY = os.environ.get('RUNNINGHUB_API_KEY', '')

def main_handler(event, context):
    """Web 函数入口 — 兼容多种事件格式"""
    # Web 函数 event 直接是请求体字典
    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    
    # 兼容不同格式：body 可能是字符串或已解析
    body_str = event.get('body', '{}')
    if body_str is None:
        body_str = '{}'
    
    try:
        body = json.loads(body_str) if isinstance(body_str, str) else body_str
    except:
        body = {}

    if method == 'GET' and path == '/health':
        return _resp({'status': 'ok'})

    if method == 'GET' and path.startswith('/api/task/'):
        task_id = path.split('/')[-1]
        return _poll(task_id)

    if method == 'POST' and path == '/api/generate':
        return _generate(body, 'image-to-image')

    if method == 'POST' and path == '/api/text2img':
        return _generate(body, 'text-to-image')

    if method == 'OPTIONS':
        return {'statusCode': 204, 'headers': _cors(), 'body': ''}

    return _resp({'error': 'Not found', 'path': path, 'method': method}, 404)

def _generate(body, mode):
    prompt = body.get('prompt', '')
    if not prompt:
        return _resp({'success': False, 'error': 'Missing prompt'}, 400)

    payload = {
        'prompt': prompt,
        'aspectRatio': body.get('aspectRatio', '1:1'),
        'resolution': body.get('resolution', '1k'),
    }
    if mode == 'image-to-image':
        payload['imageUrls'] = [body['imageData']] if body.get('imageData') else []

    result = _api('POST', f'{API_BASE}/rhart-image-g-2/{mode}', payload)
    if not result:
        return _resp({'success': False, 'error': 'API failed'}, 502)
    if result.get('errorCode'):
        return _resp({'success': False, 'taskId': '', 'error': result.get('errorMessage', 'API error')})
    return _resp({'success': True, 'taskId': result.get('taskId')})

def _poll(task_id):
    result = _api('POST', f'{API_BASE}/query', {'taskId': task_id})
    if not result:
        return _resp({'success': False, 'error': 'Query failed'}, 502)
    if result.get('errorCode'):
        return _resp({'success': False, 'error': result.get('errorMessage', 'Task error')})

    status = result.get('status')
    if status == 'SUCCESS':
        images = [{'url': r['url'], 'type': r.get('outputType', 'png')}
                  for r in result.get('results', [])
                  if r.get('url') and r.get('outputType') in ('png', 'jpg', 'jpeg', 'webp')]
        return _resp({'success': True, 'status': 'SUCCESS', 'images': images, 'taskId': task_id})
    if status in ('FAILED', 'ERROR'):
        return _resp({'success': False, 'error': result.get('errorMessage', 'Failed')})
    return _resp({'success': True, 'status': status or 'PENDING', 'taskId': task_id})

def _api(method, url, body=None):
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
        print(f'API error: {e}')
        return None

def _cors():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

def _resp(data, code=200):
    body_str = json.dumps(data, ensure_ascii=False)
    return {
        'statusCode': code,
        'headers': {
            'Content-Type': 'application/json; charset=utf-8',
            **_cors(),
        },
        'body': body_str,
    }
