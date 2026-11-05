FROM python:3.11-slim

# Create a non-root user with UID 1000 required by Hugging Face Spaces
RUN useradd -m -u 1000 user

WORKDIR /home/user/app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application files and pre-trained models
COPY --chown=user . .

# Pre-train baseline models into the Docker image
RUN python train_all.py

# Switch to non-root user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1

# Hugging Face Spaces uses port 7860 by default
EXPOSE 7860

# Start FastAPI application with models pre-trained
CMD ["sh", "-c", "python train_all.py && uvicorn app.main:app --host 0.0.0.0 --port 7860"]
