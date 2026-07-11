FROM python:3.12-slim

WORKDIR /app
COPY . .

ENV PYTHONUNBUFFERED=1
ENV PORT=8080

EXPOSE 8080

RUN echo "=== Files in /app ===" && ls -la /app && echo "=== Python version ===" && python3 --version

CMD python3 -u -c "
import os, sys
print(f'PID={os.getpid()} PORT={os.environ.get(\"PORT\")} CWD={os.getcwd()}', flush=True)
print(f'Files: {os.listdir(\".\")}', flush=True)
sys.path.insert(0, '.')
import server
"
