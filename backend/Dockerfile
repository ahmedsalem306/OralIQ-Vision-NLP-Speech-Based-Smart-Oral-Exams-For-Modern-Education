FROM python:3.10-slim

WORKDIR /app

# HF Spaces run on shared CPU; "medium" gives better Arabic/English accuracy.
ENV WHISPER_MODEL=medium
ENV ACCESS_TOKEN_EXPIRE_MINUTES=10080
ENV HF_HOME=/tmp/huggingface
ENV TRANSFORMERS_CACHE=/tmp/huggingface/transformers
ENV INSIGHTFACE_HOME=/data/insightface
ENV INSIGHTFACE_MODEL=buffalo_sc
ENV GAZE_MODEL_DIR=/data/gaze_models

# Install system dependencies (ffmpeg is needed for Whisper)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    libgomp1 \
    build-essential \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire backend
COPY . .

# Expose port 7860 (required by Hugging Face Spaces)
EXPOSE 7860

# Run FastAPI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
