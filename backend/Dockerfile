FROM python:3.10-slim

WORKDIR /app

# Install system dependencies (ffmpeg is needed for Whisper)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
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
