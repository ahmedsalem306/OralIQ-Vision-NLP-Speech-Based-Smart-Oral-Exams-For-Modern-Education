/** Grade bands — match the backend NLP grader (nlp_ai.py): 85 / 65 / 45. */
export type GradeKey = "excellent" | "good" | "partial" | "weak";
export type Tone = "neutral" | "pen" | "pass" | "warn" | "mark";

export interface GradeInfo {
    key: GradeKey;
    ar: string;
    en: string;
    tone: Tone;
}

export function gradeOf(score: number | null | undefined): GradeInfo | null {
    if (score == null || Number.isNaN(score)) return null;
    if (score >= 85) return { key: "excellent", ar: "ممتاز", en: "Excellent", tone: "pass" };
    if (score >= 65) return { key: "good", ar: "جيد", en: "Good", tone: "pen" };
    if (score >= 45) return { key: "partial", ar: "مقبول", en: "Fair", tone: "warn" };
    return { key: "weak", ar: "ضعيف", en: "Weak", tone: "mark" };
}

/** 91.5 → "91.5", 76 → "76" */
export function formatScore(score: number | null | undefined): string {
    if (score == null || Number.isNaN(score)) return "—";
    const rounded = Math.round(score * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
