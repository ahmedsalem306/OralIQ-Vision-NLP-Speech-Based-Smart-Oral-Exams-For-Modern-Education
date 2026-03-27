# Mock Interview AI System 🧠

Welcome to the **Interview AI System** project repository. This system is designed to simulate a real job interview using advanced AI technology to analyze speech, facial expressions, and answer content.

## 🚀 Project Overview

**Live Demo:** [OralIQ Platform](https://oral-iq-vision-nlp-speech-based-sma.vercel.app/)
**API Documentation:** [Swagger UI](https://ahmed2552-oraliq-api.hf.space/docs)
**Backend Status:** [Health Check](https://ahmed2552-oraliq-api.hf.space/health)

The system evaluates candidates based on three key metrics:
1.  **Speech Analysis (30%)**: Confidence, tone, speed (WPM), and fluency.
2.  **Facial Expression Analysis (30%)**: Emotional state (confident, nervous, confused) via video feed.
3.  **Content Analysis (40%)**: Relevance and quality of the answer using NLP (BERT).

## 🛠️ Technology Stack

This project uses a modern, scalable architecture suitable for a high-level graduation project.

-   **Backend**: Python (FastAPI) - Fast, async, and perfect for AI integration.
-   **Frontend**: React.js (Vite) - For a premium, responsive user interface.
-   **Database**: SQLite (Development) / PostgreSQL (Production).
-   **AI Models**:
    -   **Face**: OpenCV, DeepFace / MediaPipe.
    -   **Voice**: SpeechRecognition, Librosa, PyAudioAnalysis.
    -   **NLP**: Sentence-Transformers (BERT), NLTK/Spacy.

## 📂 Project Structure

```bash
/interview-ai
├── /backend          # Python FastAPI Application
│   ├── /app
│   ├── /models       # AI Models & Database Schemas
│   └── requirements.txt
├── /frontend         # React Application
│   ├── /src
│   └── package.json
└── README.md         # Project Documentation
```

## ⚡ Getting Started

### Prerequisites
-   Python 3.9+
-   Node.js 16+ (for Frontend)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
