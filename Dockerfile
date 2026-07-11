FROM python:3.12-slim

WORKDIR /app
COPY . .

ENV PYTHONUNBUFFERED=1
ENV PORT=8080

EXPOSE 8080

RUN echo "BUILD: files in /app:" && ls /app/server.py /app/index.html

CMD sh -c 'echo "START: pid=$$ port=$PORT" && exec python3 -u server.py'
