import whisper
import warnings
import os

# Suppress warnings for a cleaner output
warnings.filterwarnings("ignore")

def run_audio_test():
    print("\n--- Whisper Transcription Test ---")
    
    # Check if a test file exists, otherwise ask user to provide one
    test_file = "test_audio.wav"
    
    if not os.path.exists(test_file):
        print(f"Error: '{test_file}' not found.")
        print("Please place a short audio file named 'test_audio.wav' in this folder to test.")
        return

    print(f"Loading Whisper 'tiny' model (lightweight)...")
    model = whisper.load_model("tiny")
    
    print(f"Transcribing '{test_file}'...")
    result = model.transcribe(test_file)
    
    print("\n[AI Transcription Results]:")
    print("-" * 30)
    print(result["text"])
    print("-" * 30)

if __name__ == "__main__":
    run_audio_test()
