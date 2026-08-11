FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend_keyword_demo ./backend_keyword_demo
COPY filter_rules ./filter_rules
COPY translation_rules ./translation_rules
COPY processed_data ./processed_data

ENV APP_HOST=0.0.0.0 \
    APP_PORT=5002 \
    PYTHONUNBUFFERED=1

EXPOSE 5002

CMD ["gunicorn", "--bind", "0.0.0.0:5002", "--workers", "2", "backend_keyword_demo.app:app"]
