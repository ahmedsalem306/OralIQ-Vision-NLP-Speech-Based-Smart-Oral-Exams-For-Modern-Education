import os
import warnings
warnings.filterwarnings("ignore")

# ── Make ffmpeg available to Whisper ──────────────────────
# Whisper needs 'ffmpeg.exe' on PATH. imageio_ffmpeg bundles
# it under a different name, so we copy/symlink it.
import imageio_ffmpeg, shutil
ffmpeg_src = imageio_ffmpeg.get_ffmpeg_exe()
ffmpeg_dst = os.path.join(os.path.dirname(ffmpeg_src), "ffmpeg.exe")
if not os.path.exists(ffmpeg_dst):
    shutil.copy2(ffmpeg_src, ffmpeg_dst)
os.environ["PATH"] = os.path.dirname(ffmpeg_dst) + os.pathsep + os.environ["PATH"]
# ──────────────────────────────────────────────────────────

import whisper
import sounddevice as sd
import scipy.io.wavfile as wav
import numpy as np
from sentence_transformers import SentenceTransformer, util

# ─────────────────────────────────────────────────────────
#  OralIQ: Voice Answer Grading Demo
#  1. Record Arabic speech → Whisper STT
#  2. Compare answer with model answer → SBERT similarity
#  3. Output: Transcription + Score
# ─────────────────────────────────────────────────────────

# Sample exam questions with model answers (Arabic)
EXAM_QUESTIONS = [
    {
        "question": "ما هو الذكاء الاصطناعي؟",
        "model_answer": "الذكاء الاصطناعي هو فرع من علوم الحاسوب يهدف إلى بناء أنظمة قادرة على أداء مهام تتطلب ذكاء بشري مثل التعلم والاستدلال وحل المشكلات"
    },
    {
        "question": "ما هي قواعد البيانات؟",
        "model_answer": "قواعد البيانات هي مجموعة منظمة من البيانات المخزنة إلكترونيا تسمح بالوصول السريع وإدارة البيانات بكفاءة باستخدام نظام إدارة قواعد البيانات"
    },
    {
        "question": "ما الفرق بين الشبكات السلكية واللاسلكية؟",
        "model_answer": "الشبكات السلكية تستخدم كابلات لنقل البيانات وتوفر سرعة وأمان أعلى بينما الشبكات اللاسلكية تستخدم موجات الراديو وتوفر مرونة في التنقل لكنها أقل أمانا"
    },
]

RECORD_SECONDS = 10
SAMPLE_RATE    = 16000


def load_models():
    print("\n🔄 Loading Whisper model (medium — best Arabic accuracy)...")
    print("   (First time: ~1.5 GB download, then cached)")
    whisper_model = whisper.load_model("medium")
    print("✅ Whisper 'medium' loaded.")

    print("🔄 Loading SBERT model (multilingual — supports Arabic)...")
    sbert_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
    print("✅ SBERT loaded.\n")

    return whisper_model, sbert_model


def record_audio(duration=RECORD_SECONDS, fs=SAMPLE_RATE):
    print(f"🎤 Recording for {duration} seconds... SPEAK NOW!")
    audio = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype='float32')
    sd.wait()
    print("✅ Recording done.")

    # Volume check — verify mic is working
    peak = np.max(np.abs(audio))
    rms  = np.sqrt(np.mean(audio**2))
    print(f"📊 Audio level: peak={peak:.4f}, rms={rms:.4f}")
    if peak < 0.01:
        print("⚠️  WARNING: Volume is very low! Check your microphone.")
        print("    Make sure mic is not muted and speak closer to it.\n")
    else:
        print(f"✅ Audio captured OK (volume level: {'█' * min(int(peak*50), 30)})\n")

    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_answer.wav")
    wav.write(path, fs, audio)
    return path


def transcribe(whisper_model, audio_path, model_answer=""):
    print("📝 Transcribing with Whisper...")
    # initial_prompt primes Whisper with relevant Arabic vocabulary
    # This dramatically improves accuracy for domain-specific terms
    result = whisper_model.transcribe(
        audio_path,
        language="ar",
        initial_prompt=model_answer  # helps Whisper recognize these words
    )
    text = result["text"].strip()
    print(f"✅ Transcription: {text}\n")
    return text


def grade_answer(sbert_model, student_answer, model_answer):
    embeddings = sbert_model.encode([student_answer, model_answer], convert_to_tensor=True)
    similarity = util.cos_sim(embeddings[0], embeddings[1]).item()
    percentage = round(similarity * 100, 1)
    return percentage


def get_grade_label(score):
    if score >= 85:
        return "🟢 EXCELLENT — Very close to model answer"
    elif score >= 70:
        return "🟡 GOOD — Covers main points"
    elif score >= 50:
        return "🟠 PARTIAL — Some relevant content"
    else:
        return "🔴 WEAK — Answer is far from expected"


def run_voice_grading_demo():
    print("═" * 50)
    print("  OralIQ: Voice Answer Grading Demo")
    print("  Arabic Speech → Text → Semantic Score")
    print("═" * 50)

    whisper_model, sbert_model = load_models()

    print("📋 Available Questions:")
    print("-" * 40)
    for i, q in enumerate(EXAM_QUESTIONS, 1):
        print(f"  {i}. {q['question']}")
    print(f"  {len(EXAM_QUESTIONS)+1}. 🆕 Enter your own question + model answer")
    print("-" * 40)

    while True:
        choice = input(f"\nChoose question (1-{len(EXAM_QUESTIONS)+1}) or 'q' to quit: ").strip()
        if choice.lower() == 'q':
            break

        try:
            idx = int(choice)
        except ValueError:
            print("❌ Invalid choice."); continue

        if idx == len(EXAM_QUESTIONS) + 1:
            question     = input("Enter your question: ").strip()
            model_answer = input("Enter the model answer: ").strip()
        elif 1 <= idx <= len(EXAM_QUESTIONS):
            question     = EXAM_QUESTIONS[idx-1]["question"]
            model_answer = EXAM_QUESTIONS[idx-1]["model_answer"]
        else:
            print("❌ Invalid choice."); continue

        print(f"\n{'='*50}")
        print(f"📌 Question: {question}")
        print(f"{'='*50}")

        input("Press Enter when ready to answer (you have 10 seconds)...")

        # Record
        audio_path = record_audio()

        # Transcribe (pass model_answer as hint)
        student_text = transcribe(whisper_model, audio_path, model_answer)

        # Grade
        score = grade_answer(sbert_model, student_text, model_answer)
        label = get_grade_label(score)

        # Results
        print("╔" + "═"*48 + "╗")
        print("║           📊 GRADING RESULTS                  ║")
        print("╠" + "═"*48 + "╣")
        print(f"║ 📌 Question:                                   ║")
        print(f"║   {question[:45]:45s}  ║")
        print(f"║                                                ║")
        print(f"║ 🎤 Your Answer (transcribed):                  ║")

        ans = student_text if student_text else "(no speech detected)"
        while len(ans) > 45:
            print(f"║   {ans[:45]:45s}  ║")
            ans = ans[45:]
        print(f"║   {ans:45s}  ║")

        print(f"║                                                ║")
        print(f"║ 📖 Model Answer:                               ║")
        ma = model_answer
        while len(ma) > 45:
            print(f"║   {ma[:45]:45s}  ║")
            ma = ma[45:]
        print(f"║   {ma:45s}  ║")

        print(f"║                                                ║")
        print(f"║ 🏆 Similarity Score: {score:5.1f}%                    ║")
        print(f"║ {label:47s}║")
        print("╚" + "═"*48 + "╝")

        # Cleanup
        if os.path.exists(audio_path):
            os.remove(audio_path)

        print(f"\n{'—'*50}")
        cont = input("Try another question? (y/n): ").strip().lower()
        if cont != 'y':
            break

    print("\n👋 Demo finished. Goodbye!")


if __name__ == "__main__":
    try:
        run_voice_grading_demo()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback; traceback.print_exc()
        print("Make sure you have a microphone connected.")
