# 🚀 كود الـ Colab المعدل (بأسمائك الجديدة)

انسخ الكود ده وحطه في Colab بدال الكود القديم، عشان يشتغل على الفيديوهات اللي أنت رفعتها (`.MOV` والأسماء العربي).

```python
# 1. Install Libraries
!pip install openai-whisper sentence-transformers mediapipe opencv-python

import cv2
import whisper
import numpy as np
import mediapipe as mp
from sentence_transformers import SentenceTransformer, util

# 2. Load Models
print("⏳ Loading AI Models...")
stt_model = whisper.load_model("base")
nlp_model = SentenceTransformer('all-MiniLM-L6-v2')
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(refine_landmarks=True, min_detection_confidence=0.5, min_tracking_confidence=0.5)
print("✅ Models Loaded!")

# 3. Define Functions

def analyze_audio_and_text(video_path, model_answer_text):
    try:
        # Transcribe
        result = stt_model.transcribe(video_path)
        student_text = result["text"]
        
        # Grading
        embedding_1 = nlp_model.encode(model_answer_text, convert_to_tensor=True)
        embedding_2 = nlp_model.encode(student_text, convert_to_tensor=True)
        score = util.pytorch_cos_sim(embedding_1, embedding_2).item() * 100
        
        return student_text, score
    except Exception as e:
        return f"Error: {e}", 0

def analyze_video_cheating(video_path):
    cap = cv2.VideoCapture(video_path)
    frame_count = 0
    look_away_count = 0
    total_frames = 0
    
    while cap.isOpened():
        success, image = cap.read()
        if not success:
            break
        
        total_frames += 1
        if total_frames % 5 != 0: continue
            
        image.flags.writeable = False
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(image_rgb)
        
        if results.multi_face_landmarks:
            for face_landmarks in results.multi_face_landmarks:
                h, w, _ = image.shape
                nose_tip = face_landmarks.landmark[1]
                x = nose_tip.x * w
                if x < w * 0.3 or x > w * 0.7: # Simplified gaze check
                    look_away_count += 1
        else:
            look_away_count += 1 # Face not found = Suspicious
            
        frame_count += 1
        
    cap.release()
    return (look_away_count / frame_count) * 100 if frame_count > 0 else 0

# 4. Run on Your Specific Files (بأسماء ملفاتك)
videos = [
    {"name": "جاوب صح.MOV",   "model_answer": "أنا اسمي أحمد طالب في حاسبات ومعلومات جامعة القاهرة مهتم بالذكاء الاصطناعي"},
    {"name": "جاوب غلط.MOV",  "model_answer": "أنا اسمي أحمد طالب في حاسبات ومعلومات جامعة القاهرة مهتم بالذكاء الاصطناعي"},
    {"name": "الغشاش.MOV",     "model_answer": "أنا اسمي أحمد طالب في حاسبات ومعلومات جامعة القاهرة مهتم بالذكاء الاصطناعي"}
]

print("\n📊 --- Final Report --- 📊\n")

for vid in videos:
    path = vid["name"]
    print(f"🎬 Analyzing: {path} ...")
    
    try:
        text, score = analyze_audio_and_text(path, vid["model_answer"])
        cheat_score = analyze_video_cheating(path)
        
        print(f"   📝 Transcript: {text[:100]}...")
        print(f"   ⭐️ Answer Score: {score:.1f}%")
        print(f"   ⚠️ Cheating Risk: {cheat_score:.1f}%")
        
        if cheat_score > 30:
            print("   🚨 FLAGGED: Suspicious Behavior!")
        else:
            print("   ✅ CLEAN: No cheating detected.")
            
    except Exception as e:
        print(f"   ❌ Error processing {path}: {e}")
        
    print("-" * 30)
```
