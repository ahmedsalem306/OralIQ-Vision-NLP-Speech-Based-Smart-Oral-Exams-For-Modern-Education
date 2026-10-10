import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.services.nlp_ai import nlp_analyzer

def test_nlp():
    model_answer = "هو عميد كلية الذكاء الاصطناعي بجامعة الدلتا للعلوم والتكنولوجيا"
    
    # CASE 1: Completely wrong context (Medicine instead of AI)
    student_wrong = "هو الدكتور عميد كلية الطب البشري"
    
    print("\nAnalyzing Case 2: Messy but Correct Subject")
    res2 = nlp_analyzer.evaluate_answer(student_correct_messy, model_answer)
    print(f"Score: {res2['score']}, Grade: {res2['grade']}, Label: {res2['label']}")
    
    # CASE 3: Perfectly correct answer
    student_perfect = "هو عميد كلية الذكاء الاصطناعي بجامعة الدلتا للعلوم والتكنولوجيا"
    
    print("\nAnalyzing Case 3: Perfectly Correct Answer")
    res3 = nlp_analyzer.evaluate_answer(student_perfect, model_answer)
    print(f"Score: {res3['score']}, Grade: {res3['grade']}, Label: {res3['label']}")

if __name__ == "__main__":
    test_nlp()
