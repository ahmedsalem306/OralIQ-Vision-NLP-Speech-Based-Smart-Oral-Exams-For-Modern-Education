import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.services.speech_ai import speech_analyzer

def test_fillers():
    audio_path = "backend/temp_answer.wav"
    if not os.path.exists(audio_path):
        print(f"Error: {audio_path} not found.")
        return

    print(f"Analyzing {audio_path}...")
    result = speech_analyzer.analyze_fluency(audio_path)
    
    print("\n--- RESULTS ---")
    print(f"Transcript: {result['transcript']}")
    print(f"Speech Score: {result['speech_score']}")
    print(f"Filler Count: {result['details']['filler_count']}")
    print(f"Fillers Found: {result['details']['fillers_found']}")
    print(f"Fluency Report:\n{result['fluency_report']}")

if __name__ == "__main__":
    test_fillers()
