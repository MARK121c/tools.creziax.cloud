# ==============================================================================
# Creziax Server Meeting Recorder - Production Dockerfile
# Headless 24/7 Meeting Recording Daemon with Xvfb, PulseAudio, FFmpeg & Playwright
# ==============================================================================

FROM python:3.11-slim-bookworm

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    DISPLAY=:99 \
    PULSE_SERVER=127.0.0.1 \
    PULSE_SINK_NAME=CreziaxVirtualSink

WORKDIR /app

# 1. Install OS packages: Xvfb, PulseAudio, FFmpeg, and Arabic/Unicode fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb \
    x11-utils \
    pulseaudio \
    pulseaudio-utils \
    ffmpeg \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    fonts-noto \
    fonts-noto-color-emoji \
    fonts-kacst \
    fonts-freefont-ttf \
    curl \
    procps \
    && rm -rf /var/lib/apt/lists/*

# 2. Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# 3. Install Playwright Chromium browser and its system dependencies
RUN playwright install chromium

# 4. Copy application source
COPY . .

# 5. Create storage and log directories with write permissions
RUN mkdir -p /app/recordings /app/logs && \
    chmod -R 777 /app/recordings /app/logs

# Create entrypoint runner script
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
echo "Starting PulseAudio..."\n\
pulseaudio -D --exit-idle-time=-1 --system=false --disallow-exit || true\n\
sleep 1\n\
\n\
echo "Loading Virtual Null-Sink..."\n\
pactl load-module module-null-sink sink_name=CreziaxVirtualSink sink_properties=device.description=CreziaxVirtualSink || true\n\
pactl set-default-sink CreziaxVirtualSink || true\n\
\n\
echo "Starting Xvfb virtual framebuffer on DISPLAY :99..."\n\
Xvfb :99 -screen 0 1920x1080x24 -ac +extension RANDR +extension RENDER +extension GLX -noreset &\n\
sleep 1\n\
\n\
echo "Starting Application Server..."\n\
exec python3 main.py\n\
' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/app/entrypoint.sh"]
