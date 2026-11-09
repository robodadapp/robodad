FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1

# Hugging Face Spaces runs containers as user 1000
RUN useradd -m -u 1000 robodad
WORKDIR /home/robodad/app

# Stockfish runs on the server for the two top chess tiers (never sent to phones)
RUN apt-get update \
    && apt-get install -y --no-install-recommends stockfish \
    && rm -rf /var/lib/apt/lists/*
ENV STOCKFISH_PATH=/usr/games/stockfish

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY --chown=robodad:robodad . .
# Train the intent classifier once at build time so start-up only loads it
RUN python -c "from app.nlp import RoboDadNLP; RoboDadNLP()" && chown -R robodad:robodad models
USER robodad

# Hugging Face uses 7860; Render/Railway pass their own $PORT
EXPOSE 7860
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860} --proxy-headers --forwarded-allow-ips='*'"]
