import os
import re
import time
import traceback
import warnings
warnings.filterwarnings("ignore")

# ── Make ffmpeg available to Whisper ──────────────────────
try:
    if os.name == 'nt': # Windows only
        import imageio_ffmpeg, shutil
        ffmpeg_src = imageio_ffmpeg.get_ffmpeg_exe()
        ffmpeg_dst = os.path.join(os.path.dirname(ffmpeg_src), "ffmpeg.exe")
        if not os.path.exists(ffmpeg_dst):
            shutil.copy2(ffmpeg_src, ffmpeg_dst)
        os.environ["PATH"] = os.path.dirname(ffmpeg_dst) + os.pathsep + os.environ["PATH"]
except Exception:
    pass  # ffmpeg might already be on PATH
# ──────────────────────────────────────────────────────────

import numpy as np

# Arabic filler words / hesitation markers
ARABIC_FILLERS = [
    "اه", "آه", "إه", "اهه", "امم", "ام", "يعني", "مم", "ممم",
    "هم", "هممم", "طبع", "طبعا", "خلاص", "عارف",
    "كده", "كدا", "اللي هو", "بمعنى", "بالظبط", "بالضبط", "وكده", "وكدا",
    "بقا", "بقى", "تمام", "يا سيدي", "يا ستي",
]


class SpeechAnalyzer:
    """Whisper-based Arabic STT + speech fluency analysis (fully lazy-loaded with retry)."""

    MAX_RETRIES = 3
    RETRY_DELAY = 2  # seconds

    def __init__(self):
        self._model = None
        self._load_failed = False
        # This prompt encourages Whisper to transcribe hesitation markers rather than cleaning them
        self.filler_prompt = "اه يعني اممم طيب بصراحة خلاص كدة تمام ممم إه"

    @property
    def model(self):
        if self._model is None:
            for attempt in range(1, self.MAX_RETRIES + 1):
                try:
                    print(f"[SpeechAI] Loading Whisper 'small' model (attempt {attempt}/{self.MAX_RETRIES})...")
                    import whisper
                    self._model = whisper.load_model("small")
                    self._load_failed = False
                    print("[SpeechAI] ✅ Whisper loaded successfully.")
                    break
                except Exception as e:
                    print(f"[SpeechAI] ❌ Load failed (attempt {attempt}): {e}")
                    traceback.print_exc()
                    if attempt < self.MAX_RETRIES:
                        print(f"[SpeechAI] Retrying in {self.RETRY_DELAY}s...")
                        time.sleep(self.RETRY_DELAY)
                    else:
                        self._load_failed = True
                        print("[SpeechAI] ❌ All retries exhausted. Model unavailable.")
                        raise RuntimeError(f"Failed to load Whisper after {self.MAX_RETRIES} attempts") from e
        return self._model

    def is_ready(self) -> bool:
        """Check if model is loaded without triggering a load."""
        return self._model is not None

    def transcribe_audio(self, audio_path: str, hint: str = "") -> str:
        """
        Transcribe an audio file to Arabic text.
        """
        prompt = (hint + " " + self.filler_prompt).strip()
        result = self.model.transcribe(
            audio_path,
            language="ar",
            initial_prompt=prompt,
        )
        return result["text"].strip()

    def analyze_fluency(self, audio_path: str, hint: str = "") -> dict:
        """
        Full analysis: transcribe + detect hesitation/stuttering.
        """
        # Encourage filler transcription via prompt
        prompt = (hint + " " + self.filler_prompt).strip()
        
        # Transcribe with word-level timestamps
        result = self.model.transcribe(
            audio_path,
            language="ar",
            initial_prompt=prompt,
            word_timestamps=True,
        )

        transcript = result["text"].strip()
        segments = result.get("segments", [])

        if not transcript or not segments:
            return {
                "transcript": transcript or "",
                "speech_score": 0.0,
                "fluency_report": "لم يتم الكشف عن كلام",
                "details": {
                    "wpm": 0, "filler_count": 0, "fillers_found": [],
                    "pause_count": 0, "repeat_count": 0, "total_duration": 0,
                },
            }

        # ─── 1. Calculate speech rate (WPM) ───
        # Collect Whisper's word-level tokens (for pause/repetition analysis)
        words_all = []
        for seg in segments:
            for w in seg.get("words", []):
                words_all.append(w)

        total_duration = segments[-1]["end"] - segments[0]["start"]

        # Count ACTUAL words from transcript (not Whisper tokens which split Arabic sub-words)
        actual_words = [w for w in transcript.split() if w.strip()]
        word_count = len(actual_words)
        wpm = (word_count / total_duration * 60) if total_duration > 0 else 0

        # ─── 2. Detect filler words ───
        filler_count = 0
        fillers_found = []
        words_text = [w["word"].strip() for w in words_all]

        # Improved regex to catch variations and elongated letters (tashkil/elongation)
        def normalize_arabic(text):
            # Remove non-arabic chars, but keep elongation (tatweel) for a moment then normalize
            text = re.sub(r'[\u064B-\u0652]', '', text) # remove harakat
            text = re.sub(r'(\u0627){2,}', 'ا', text)   # normalize repeated Alef
            return text

        for word in words_text:
            clean = normalize_arabic(word)
            # Simple check for ARABIC_FILLERS or if it's a known filler variation
            if clean in ARABIC_FILLERS:
                filler_count += 1
                if clean not in fillers_found:
                    fillers_found.append(clean)

        # ─── 3. Detect long pauses (gaps > 1.5s between words) ───
        pause_count = 0
        for i in range(1, len(words_all)):
            gap = words_all[i]["start"] - words_all[i - 1]["end"]
            if gap > 1.5:
                pause_count += 1

        # ─── 4. Detect word repetition (same word said 2+ times in a row) ───
        repeat_count = 0
        for i in range(1, len(words_text)):
            clean_prev = normalize_arabic(words_text[i - 1])
            clean_curr = normalize_arabic(words_text[i])
            if clean_prev and clean_curr and clean_prev == clean_curr:
                repeat_count += 1

        # ─── 5. Calculate fluency score ───
        # Start at 100, subtract penalties
        penalty = 0
        penalty += filler_count * 5       # each filler = -5 (Strict)
        penalty += pause_count * 8        # each long pause = -8 (Strict)
        penalty += repeat_count * 6       # each repetition = -6 (Strict)

        # Speech rate penalty (too slow or too fast)
        if wpm < 60:
            penalty += 10  # very slow = nervous
        elif wpm < 80:
            penalty += 5   # a bit slow
        elif wpm > 200:
            penalty += 5   # too fast

        speech_score = max(0.0, min(100.0, 100.0 - penalty))

        # ─── 6. Build Arabic fluency report ───
        report_lines = []

        if speech_score >= 85:
            report_lines.append("تحدث بطلاقة وثقة")
        elif speech_score >= 70:
            report_lines.append("تحدث بشكل مقبول مع بعض التردد")
        elif speech_score >= 50:
            report_lines.append("تردد ملحوظ أثناء الإجابة")
        else:
            report_lines.append("تلعثم واضح — لم يكن واثقاً من إجابته")

        details_lines = []
        if filler_count > 0:
            details_lines.append(
                f"كلمات تردد ({filler_count}): {', '.join(fillers_found)}"
            )
        if pause_count > 0:
            details_lines.append(f"توقفات طويلة: {pause_count} مرة")
        if repeat_count > 0:
            details_lines.append(f"تكرار كلمات: {repeat_count} مرة")

        speed_label = "بطيء جداً" if wpm < 60 else "بطيء" if wpm < 80 else "طبيعي" if wpm <= 160 else "سريع"
        details_lines.append(f"عدد الكلمات: {word_count} كلمة | سرعة الكلام: {wpm:.0f} كلمة/دقيقة ({speed_label})")

        if details_lines:
            report_lines.append("الملاحظات:")
            report_lines.extend(f"  • {d}" for d in details_lines)

        fluency_report = "\n".join(report_lines)

        return {
            "transcript": transcript,
            "speech_score": round(speech_score, 1),
            "fluency_report": fluency_report,
            "details": {
                "wpm": round(wpm, 1),
                "filler_count": filler_count,
                "fillers_found": fillers_found,
                "pause_count": pause_count,
                "repeat_count": repeat_count,
                "total_duration": round(total_duration, 1),
            },
        }


# Singleton instance (lazy — model loads on first use)
speech_analyzer = SpeechAnalyzer()
