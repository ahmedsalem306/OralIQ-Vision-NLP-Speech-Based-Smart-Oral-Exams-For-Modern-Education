import whisper
import sounddevice as sd
import numpy as np
import scipy.io.wavfile as wav
import os
import warnings

warnings.filterwarnings("ignore")

def record_and_transcribe(duration=5, fs=16000):
    print(f"\n--- Live Voice Demo ---")
    print(f"I will record your voice for {duration} seconds. Ready?")
    input("Press Enter to start recording...")
    
    print("Recording... Speak now!")
    recording = sd.rec(int(duration * fs), samplerate=fs, channels=1)
    sd.wait()  # Wait until recording is finished
    print("Recording finished.")
    
    # Save as temporary file
    temp_file = "temp_recording.wav"
    wav.write(temp_file, fs, recording)
    
    print("Loading Whisper 'tiny' model...")
    model = whisper.load_model("tiny")
    
    print("Transcribing...")
    result = model.transcribe(temp_file)
    
    print("\n[You said]:")
    print("-" * 30)
    print(result["text"])
    print("-" * 30)
    
    # Clean up
    if os.path.exists(temp_file):
        os.remove(temp_file)

if __name__ == "__main__":
    try:
        record_and_transcribe()
    except Exception as e:
        print(f"An error occurred: {e}")
        print("Make sure you have a microphone connected.")
