def calculate_overall(nlp, speech, facial):
    # New Weighted Logic: 80% NLP + 10% Fluency + 10% Integrity
    raw_overall = (nlp * 0.8) + (speech * 0.1) + (facial * 0.1)
    
    # FAIL-FAST: If NLP < 50, overall capped at 49.9
    if nlp < 50:
        overall = min(raw_overall, 49.9)
    else:
        overall = round(raw_overall, 1)
    
    return overall

# Test cases
print(f"CASE 1 (Confident but Wrong): NLP=40, Speech=95, Facial=100 -> Overall: {calculate_overall(40, 95, 100)}")
print(f"CASE 2 (Correct but Hesitant): NLP=85, Speech=60, Facial=100 -> Overall: {calculate_overall(85, 60, 100)}")
print(f"CASE 3 (Correct but Cheating): NLP=85, Speech=95, Facial=20 -> Overall: {calculate_overall(85, 95, 20)}")
