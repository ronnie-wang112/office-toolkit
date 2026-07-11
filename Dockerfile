FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1

CMD python3 -c "
import http.server, os
port = int(os.environ.get('PORT', 8080))
print(f'MINIMAL server on port {port}', flush=True)
http.server.HTTPServer(('0.0.0.0', port),
    lambda *a: http.server.SimpleHTTPRequestHandler(*a, directory='/')
).serve_forever()
"
