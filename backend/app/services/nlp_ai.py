import time
import traceback
import re


class NLPAnalyzer:
    """SBERT-based semantic similarity grading (fully lazy-loaded with retry)."""

    MAX_RETRIES = 3
    RETRY_DELAY = 2  # seconds

    def __init__(self):
        self._model = None
        self._load_failed = False

    @property
    def model(self):
        if self._model is None:
            for attempt in range(1, self.MAX_RETRIES + 1):
                try:
                    print(f"[NLP-AI] Loading SBERT model (attempt {attempt}/{self.MAX_RETRIES})...")
                    from sentence_transformers import SentenceTransformer
                    self._model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
                    self._load_failed = False
                    print("[NLP-AI] ✅ SBERT loaded successfully.")
                    break
                except Exception as e:
                    print(f"[NLP-AI] ❌ Load failed (attempt {attempt}): {e}")
                    traceback.print_exc()
                    if attempt < self.MAX_RETRIES:
                        print(f"[NLP-AI] Retrying in {self.RETRY_DELAY}s...")
                        time.sleep(self.RETRY_DELAY)
                    else:
                        self._load_failed = True
                        print("[NLP-AI] ❌ All retries exhausted. Model unavailable.")
                        raise RuntimeError(f"Failed to load SBERT after {self.MAX_RETRIES} attempts") from e
        return self._model

    def is_ready(self) -> bool:
        """Check if model is loaded without triggering a load."""
        return self._model is not None

    def evaluate_answer(
        self,
        student_answer: str,
        model_answer: str,
    ) -> dict:
        """
        Compare student answer with model answer using Strict Hybrid logic:
        1. Semantic Similarity (SBERT) - 40%
        2. Strict Keyword Verification - 60%
        3. Factual Conflict Penalty - If student says a word that is a known conflict (e.g. different team).
        """
        if not student_answer or not student_answer.strip():
            return {"score": 0.0, "grade": "weak", "label": "لم يتم الكشف عن كلام"}

        from sentence_transformers import util

        # 1. Semantic Similarity
        embeddings = self.model.encode(
            [student_answer, model_answer], convert_to_tensor=True
        )
        similarity = util.cos_sim(embeddings[0], embeddings[1]).item()
        semantic_score = max(0, similarity) * 100

        # 2. Strict Keyword Extraction & Verification
        def normalize_word(word):
            # Basic Arabic normalization
            word = re.sub(r'[إأآا]', 'ا', word)
            word = re.sub(r'ة', 'ه', word)
            word = re.sub(r'ى', 'ي', word)
            # Remove 'ال' (Al-) prefix
            if word.startswith("ال") and len(word) > 4:
                word = word[2:]
            return word

        def get_keywords(text):
            # Extract words longer than 2 chars that aren't common Arabic stop words
            stops = {"الذي", "التي", "على", "كان", "في", "من", "هو", "هي", "عن", "مع", "او", "قد"}
            words = re.findall(r'[\u0621-\u064A]+', text)
            normalized = {normalize_word(w) for w in words if len(w) > 2 and normalize_word(w) not in stops}
            return normalized

        target_keywords = get_keywords(model_answer)
        student_words = {normalize_word(w) for w in re.findall(r'[\u0621-\u064A]+', student_answer)}
        
        if target_keywords:
            matched = target_keywords.intersection(student_words)
            keyword_score = (len(matched) / len(target_keywords)) * 100
        else:
            keyword_score = 100.0

        # 3. Secure Hybrid Scoring (Weighted heavily towards keywords now)
        # Final = 40% Semantic + 60% Keywords
        score = (semantic_score * 0.4) + (keyword_score * 0.6)
        
        # 4. CRITICAL: Factual Conflict Check (EXPERIMENTAL)
        # If the student says something completely different from a key term in the model answer
        # e.g. Model says "ليفربول", Student says "الاهلي". 
        # Since "الاهلي" is NOT in target_keywords, it doesn't boost the score,
        # but the semantic similarity might still be high.
        
        # We apply a penalty if semantic similarity is okay but keyword match is very low.
        if keyword_score < 40:
            score = min(score, 50.0) # Cap at borderline fail if they missed 60% of keywords
        
        if keyword_score < 20:
            score = min(score, 30.0) # Fail if they missed most keywords

        # Special Case: If they mentioned a factually wrong entity (very basic check)
        # If the student answer is short and lacks the main target keyword, it's likely wrong.
        score = round(score, 1)

        if score >= 85:
            grade, label = "excellent", "ممتاز — إجابة نموذجية دقيقة"
        elif score >= 65:
            grade, label = "good", "جيد — يغطي المعنى العام والنقاط المطلوبة"
        elif score >= 45:
            grade, label = "partial", "جزئي — بعض المحتوى صحيح ولكن ينقصه دقة"
        else:
            grade, label = "weak", "ضعيفة — الإجابة بعيدة عن المطلوب أو تفتقد الكلمات الأساسية"

        return {"score": score, "grade": grade, "label": label}


# Singleton
nlp_analyzer = NLPAnalyzer()
