FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if required (e.g. gcc for psycopg2 if building from source, 
# but psycopg2-binary has precompiled wheels)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
