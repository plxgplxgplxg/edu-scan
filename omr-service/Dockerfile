FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    libxcb1 \
    libfreetype6 \
    libjpeg62-turbo \
    libtiff6 \
    libwebp7 \
    libharfbuzz0b \
    libfribidi0 \
    libpng16-16 \
    libopenjp2-7 \
    liblcms2-2 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
EXPOSE 50051

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
