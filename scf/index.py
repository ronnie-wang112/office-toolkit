# -*- coding: utf-8 -*-
"""
腾讯云函数 SCF — RunningHub 生图 API 代理
通过 API 网关触发，国内低延迟访问
"""
import json
import urllib.request
import urllib.parse
import ssl
import os

API_BASE = 'https://www.runninghub.cn/openapi/v2'
API_KEY = os.environ.get('RUNNINGHUB_API_KEY', '')

def main_handler(event, context):
    """SCF 入口"""
    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    headers = event.get('headers', {})
    body_str = event.get('body', '{}') or '{}'

    try:
        body = json.loads(body_str) if body_str else {}
    except:
        body = {}

    if method == 'GET' and path == '/health':
        return _resp(200, {'status': 'ok'})

    if method == 'GET' and path.startswith('/api/task/'):
        task_id = path.split('/')[-1]
        return _poll(task_id)

    if method == 'POST' and path in ('/api/generate', '/api/text2img'):
        mode = 'image-to-image' if path == '/api/generate' else 'text-to-image'
        return _generate(body, mode)

    if method == 'OPTIONS':
        return {'statusCode': 204, 'headers': _cors(), 'body': ''}

    return _resp(404, {'success': False, 'error': 'Not found'})

def _generate(body, mode):
    prompt = body.get('prompt', '')
    if not prompt:
        return _resp(400, {'success': False, 'error': 'Missing prompt'})

    payload = {
        'prompt': prompt,
        'aspectRatio': body.get('aspectRatio', '1:1'),
        'resolution': body.get('resolution', '1k'),
    }
    if mode == 'image-to-image':
        payload['imageUrls'] = [body['imageData']] if body.get('imageData') else []

    result = _api('POST', f'{API_BASE}/rhart-image-g-2/{mode}', payload)
    if not result:
        return _resp(502, {'success': False, 'error': 'API failed'})
    if result.get('errorCode'):
        return _resp(200, {'success': False, 'taskId': '', 'error': result.get('errorMessage', 'API error')})
    return _resp(200, {'success': True, 'taskId': result.get('taskId')})

def _poll(task_id):
    result = _api('POST', f'{API_BASE}/query', {'taskId': task_id})
    if not result:
        return _resp(502, {'success': False, 'error': 'Query failed'})
    if result.get('errorCode'):
        return _resp(200, {'success': False, 'error': result.get('errorMessage', 'Task error')})

    status = result.get('status')
    if status == 'SUCCESS':
        images = [{'url': r['url'], 'type': r.get('outputType', 'png')}
                  for r in result.get('results', [])
                  if r.get('url') and r.get('outputType') in ('png', 'jpg', 'jpeg', 'webp')]
        return _resp(200, {'success': True, 'status': 'SUCCESS', 'images': images, 'taskId': task_id})
    if status in ('FAILED', 'ERROR'):
        return _resp(200, {'success': False, 'error': result.get('errorMessage', 'Failed')})
    return _resp(200, {'success': True, 'status': status or 'PENDING', 'taskId': task_id})

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

def _resp(code, data):
    body = json.dumps(data, ensure_ascii=False)
    headers = _cors()
    headers['Content-Type'] = 'application/json; charset=utf-8'
    return {
        'statusCode': code,
        'headers': headers,
        'body': body,
    }
