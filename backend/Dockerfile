FROM python:3.9-slim

WORKDIR /app

# Install system dependencies (for Pillow/Fonts)
RUN apt-get update && apt-get install -y \
    libfreetype6-dev \
    libfribidi-dev \
    libharfbuzz-dev \
    libjpeg-dev \
    libopenjp2-7-dev \
    libtiff5-dev \
    libxcb1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements FIRST to cache dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the app
COPY . .

# Expose port
EXPOSE 8000

# Run with Gunicorn/Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
