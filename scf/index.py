# -*- coding: utf-8 -*-
"""
腾讯云函数 SCF Web 函数 — RunningHub 生图 API 代理
函数 URL 只支持根路径 /，通过 query 和 body 区分动作
"""
import json
import urllib.request
import ssl
import os

API_BASE = 'https://www.runninghub.cn/openapi/v2'
API_KEY = os.environ.get('RUNNINGHUB_API_KEY', '')

def main_handler(event, context):
    method = event.get('httpMethod', 'GET')
    qs = event.get('queryString', {}) or {}
    body_str = event.get('body', '{}') or '{}'
    try:
        body = json.loads(body_str) if isinstance(body_str, str) else body_str
    except:
        body = {}

    action = body.get('action') or qs.get('action', '')

    if method == 'OPTIONS':
        return _cors_resp()

    if action == 'health':
        return _resp({'status': 'ok'})

    if action == 'poll':
        task_id = qs.get('taskId') or body.get('taskId', '')
        return _poll(task_id) if task_id else _resp({'error': 'Missing taskId'}, 400)

    if method == 'POST' and action == 'generate':
        mode = body.get('mode', 'image-to-image')
        return _generate(body, mode)

    return _resp({'error': 'Unknown action', 'action': action}, 404)

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

def _cors_resp():
    return {'statusCode': 204, 'headers': _cors(), 'body': ''}

def _resp(data, code=200):
    return {
        'statusCode': code,
        'headers': {**_cors(), 'Content-Type': 'application/json; charset=utf-8'},
        'body': json.dumps(data, ensure_ascii=False),
    }
