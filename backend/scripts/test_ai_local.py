import torch
from sentence_transformers import SentenceTransformer, util
# Note: Whisper requires 'openai-whisper' to be installed via pip
# For this demo, we will use the 'transformers' library for Whisper as it's already in requirements.txt
from transformers import pipeline

def test_nlp_similarity():
    print("\n--- Testing NLP Similarity (SBERT) ---")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    model_answer = "The capital of France is Paris."
    student_answers = [
        "Paris is the capital of France.", # Very similar
        "I think it's Lyon.",               # Wrong
        "The city of Paris is France's capital." # Different wording, same meaning
    ]
    
    embeddings1 = model.encode(model_answer, convert_to_tensor=True)
    
    for ans in student_answers:
        embeddings2 = model.encode(ans, convert_to_tensor=True)
        cosine_scores = util.cos_sim(embeddings1, embeddings2)
        print(f"Student: '{ans}'\nScore: {cosine_scores.item():.4f}\n")

def test_speech_to_text():
    print("\n--- Testing Speech-to-Text (Whisper) ---")
    print("Note: This requires an audio file or microphone input. Loading model...")
    # Using a small/tiny model for local testing speed
    try:
        pipe = pipeline("automatic-speech-recognition", model="openai/whisper-tiny")
        print("Whisper model loaded successfully!")
        print("To test recording, we'll need to implement an audio capture or use a file.")
    except Exception as e:
        print(f"Error loading Whisper: {e}")

if __name__ == "__main__":
    test_nlp_similarity()
    test_speech_to_text()
