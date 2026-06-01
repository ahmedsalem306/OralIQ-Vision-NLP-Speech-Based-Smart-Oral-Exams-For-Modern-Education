import { motion, AnimatePresence } from "framer-motion";
import { useTTS, VoiceGender } from "../lib/useTTS";
import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface AvatarExaminerProps {
    /** Student's first name for personalized greeting */
    studentName: string;
    /** The question text to speak */
    questionText?: string;
    /** Question number (e.g. 1, 2, 3...) */
    questionNumber?: number;
    /** Total questions count */
    totalQuestions?: number;
    /** Whether this is the last question */
    isLastQuestion?: boolean;
    /** Preferred voice gender */
    voiceGender?: VoiceGender;
    /** Current mode: greeting, asking, waiting, transition, feedback, farewell */
    mode: "greeting" | "asking" | "waiting" | "transition" | "feedback" | "farewell";
    /** The dynamic AI feedback from Gemini */
    aiFeedbackText?: string;
    /** Called when the avatar finishes speaking */
    onSpeakingEnd?: () => void;
    /** Called when greeting finishes */
    onGreetingEnd?: () => void;
    /** Increment this to force the avatar to speak directSpeakText immediately */
    directSpeakKey?: number;
    /** Text to speak when directSpeakKey increments (used for conversational mode) */
    directSpeakText?: string;
}

// ─── Avatar SVG Component ────────────────────────────────────────────────────
function AvatarFace({ isSpeaking, isMouthOpen }: { isSpeaking: boolean; isMouthOpen: boolean }) {
    return (
        <div style={{ position: "relative", width: 200, height: 200 }}>
            {/* Outer glow ring when speaking */}
            <AnimatePresence>
                {isSpeaking && (
                    <>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: [0.15, 0.35, 0.15], scale: [1, 1.15, 1] }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                            style={{
                                position: "absolute", inset: -20,
                                borderRadius: "50%",
                                background: "radial-gradient(circle, rgba(207,163,85,0.25) 0%, transparent 70%)",
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.1, 0.2, 0.1] }}
                            exit={{ opacity: 0 }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.3 }}
                            style={{
                                position: "absolute", inset: -35,
                                borderRadius: "50%",
                                border: "1.5px solid rgba(207,163,85,0.15)",
                            }}
                        />
                    </>
                )}
            </AnimatePresence>

            {/* Main avatar SVG */}
            <svg viewBox="0 0 200 200" width="200" height="200" style={{ filter: "drop-shadow(0 8px 32px rgba(207,163,85,0.2))" }}>
                {/* Head circle */}
                <defs>
                    <linearGradient id="headGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#cfa355" />
                        <stop offset="50%" stopColor="#e8c97a" />
                        <stop offset="100%" stopColor="#cfa355" />
                    </linearGradient>
                    <linearGradient id="faceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#1a1a1a" />
                        <stop offset="100%" stopColor="#0f0f0f" />
                    </linearGradient>
                    <radialGradient id="cheekGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(207,163,85,0.15)" />
                        <stop offset="100%" stopColor="transparent" />
                    </radialGradient>
                </defs>

                {/* Head shadow */}
                <ellipse cx="100" cy="170" rx="55" ry="8" fill="rgba(0,0,0,0.3)" />

                {/* Head/face base circle */}
                <circle cx="100" cy="90" r="72" fill="url(#faceGrad)" stroke="url(#headGrad)" strokeWidth="2.5" />

                {/* Inner face circle (subtle depth) */}
                <circle cx="100" cy="88" r="62" fill="none" stroke="rgba(207,163,85,0.06)" strokeWidth="1" />

                {/* Cheek glow */}
                <circle cx="65" cy="100" r="15" fill="url(#cheekGlow)" />
                <circle cx="135" cy="100" r="15" fill="url(#cheekGlow)" />

                {/* Eyebrows */}
                <path d="M 62 62 Q 72 56, 82 62" stroke="#cfa355" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />
                <path d="M 118 62 Q 128 56, 138 62" stroke="#cfa355" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />

                {/* Left eye */}
                <ellipse cx="75" cy="78" rx="12" ry="10" fill="#1f1f1f" stroke="rgba(207,163,85,0.2)" strokeWidth="1" />
                <circle cx="75" cy="78" r="5" fill="#e8c97a" />
                <circle cx="75" cy="78" r="2.5" fill="#0a0a0a" />
                <circle cx="77" cy="76" r="1.5" fill="rgba(255,255,255,0.7)" />

                {/* Right eye */}
                <ellipse cx="125" cy="78" rx="12" ry="10" fill="#1f1f1f" stroke="rgba(207,163,85,0.2)" strokeWidth="1" />
                <circle cx="125" cy="78" r="5" fill="#e8c97a" />
                <circle cx="125" cy="78" r="2.5" fill="#0a0a0a" />
                <circle cx="127" cy="76" r="1.5" fill="rgba(255,255,255,0.7)" />

                {/* Nose (subtle) */}
                <path d="M 97 88 Q 100 95, 103 88" stroke="rgba(207,163,85,0.2)" strokeWidth="1.5" fill="none" strokeLinecap="round" />

                {/* Mouth — animated */}
                {isMouthOpen ? (
                    /* Open mouth (speaking) */
                    <ellipse cx="100" cy="112" rx="14" ry="9" fill="#1a1a1a" stroke="#cfa355" strokeWidth="1.5">
                        <animate attributeName="ry" values="9;7;9;11;9" dur="0.3s" repeatCount="indefinite" />
                    </ellipse>
                ) : (
                    /* Closed mouth (slight smile) */
                    <path d="M 85 110 Q 100 120, 115 110" stroke="#cfa355" strokeWidth="2" fill="none" strokeLinecap="round" />
                )}

                {/* Collar / neck hint */}
                <path d="M 72 155 Q 100 140, 128 155" stroke="rgba(207,163,85,0.15)" strokeWidth="1.5" fill="none" />
            </svg>

            {/* Name badge */}
            <div style={{
                position: "absolute",
                bottom: -8,
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(207,163,85,0.12)",
                border: "1px solid rgba(207,163,85,0.25)",
                borderRadius: "999px",
                padding: "0.25rem 1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                whiteSpace: "nowrap",
            }}>
                <div style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: isSpeaking ? "#5ec269" : "#cfa355",
                    boxShadow: isSpeaking ? "0 0 8px rgba(94,194,105,0.5)" : "none",
                }} />
                <span style={{
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    color: "#cfa355",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                }}>
                    AI Examiner
                </span>
            </div>
        </div>
    );
}

// ─── Audio Waveform (shown when speaking) ────────────────────────────────────
function SpeakingWaveform() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "3px",
                padding: "0.6rem 1.2rem",
                background: "rgba(207,163,85,0.06)",
                borderRadius: "999px",
                border: "1px solid rgba(207,163,85,0.12)",
            }}
        >
            {[...Array(16)].map((_, i) => (
                <motion.div
                    key={i}
                    animate={{ height: [3, Math.random() * 18 + 4, 3] }}
                    transition={{ repeat: Infinity, duration: 0.4 + Math.random() * 0.3, delay: i * 0.04 }}
                    style={{
                        width: 2.5,
                        background: "linear-gradient(to top, #cfa355, #e8c97a)",
                        borderRadius: 4,
                        minHeight: 3,
                    }}
                />
            ))}
            <span style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "#cfa355",
                marginLeft: "0.5rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
            }}>
                Speaking...
            </span>
        </motion.div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AvatarExaminer({
    studentName,
    questionText,
    questionNumber = 1,
    totalQuestions = 1,
    isLastQuestion = false,
    voiceGender = "male",
    mode,
    aiFeedbackText,
    onSpeakingEnd,
    onGreetingEnd,
    directSpeakKey,
    directSpeakText,
}: AvatarExaminerProps) {
    const { speak, stop, isSpeaking, isMouthOpen, isReady } = useTTS({ gender: voiceGender, rate: 0.9 });
    const [subtitle, setSubtitle] = useState("");
    const hasSpokenRef = useRef<string>("");

    // ── Direct speak: fires when directSpeakKey increments ───────────────────
    const prevDirectKeyRef = useRef<number | undefined>(undefined);
    useEffect(() => {
        if (directSpeakKey === undefined || directSpeakKey === prevDirectKeyRef.current) return;
        if (!directSpeakText?.trim()) return;
        prevDirectKeyRef.current = directSpeakKey;
        setSubtitle(directSpeakText);
        const t = setTimeout(() => speak(directSpeakText), 300);
        return () => clearTimeout(t);
    }, [directSpeakKey, directSpeakText, speak]);

    // ── Build speech text based on mode ──────────────────────────────────────
    const getSpeechText = useCallback(() => {
        const firstName = studentName.split(" ")[0];

        switch (mode) {
            case "greeting":
                return `أهلاً بيك يا ${firstName}! أنا هكون المُمتحِن بتاعك النهاردة. الامتحان ده مكوّن من ${totalQuestions} ${totalQuestions === 1 ? "سؤال" : totalQuestions === 2 ? "سؤالين" : "أسئلة"}. خليك مرتاح واتكلم بوضوح. يلا نبدأ!`;

            case "asking":
                if (!questionText) return "";
                const prefix = totalQuestions > 1
                    ? `السؤال ${questionNumber === 1 ? "الأول" : questionNumber === 2 ? "التاني" : questionNumber === 3 ? "التالت" : `رقم ${questionNumber}`}. `
                    : "";
                return `${prefix}${questionText}`;

            case "transition":
                return `تمام، هبعت إجابتك للدكتور. ${isLastQuestion ? "" : "يلا ننتقل للسؤال اللي بعده."}`;

            case "feedback":
                return aiFeedbackText || `تمام، هبعت إجابتك للدكتور. ${isLastQuestion ? "" : "يلا ننتقل للسؤال اللي بعده."}`;

            case "farewell":
                return `كده خلاص يا ${firstName}، كل إجاباتك اتبعتت للدكتور. بالتوفيق!`;

            default:
                return "";
        }
    }, [mode, studentName, questionText, questionNumber, totalQuestions, isLastQuestion, aiFeedbackText]);

    // ── Auto-speak when mode changes ─────────────────────────────────────────
    useEffect(() => {
        if (!isReady) return;

        const text = getSpeechText();
        if (!text) return;

        // Prevent re-speaking the same text
        const key = `${mode}-${questionNumber}-${text.slice(0, 30)}`;
        if (hasSpokenRef.current === key) return;
        setSubtitle(text);

        // Small delay for smooth transition
        const timer = setTimeout(() => {
            hasSpokenRef.current = key;
            speak(text);
        }, 600);

        return () => clearTimeout(timer);
    }, [mode, questionNumber, isReady, getSpeechText, speak]);

    // ── Handle speaking end ──────────────────────────────────────────────────
    const prevSpeakingRef = useRef(isSpeaking);
    useEffect(() => {
        // Detect transition from speaking → not speaking
        if (prevSpeakingRef.current && !isSpeaking) {
            // Give a brief pause after speech ends
            const delay = setTimeout(() => {
                if (mode === "greeting") {
                    onGreetingEnd?.();
                } else if (mode === "asking" || mode === "transition" || mode === "farewell" || mode === "feedback") {
                    onSpeakingEnd?.();
                }
            }, 800);
            return () => clearTimeout(delay);
        }
        prevSpeakingRef.current = isSpeaking;
    }, [isSpeaking, mode, onSpeakingEnd, onGreetingEnd]);

    // ── Cleanup ──────────────────────────────────────────────────────────────
    useEffect(() => {
        return () => stop();
    }, [stop]);

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1.5rem",
                padding: "2rem",
            }}
        >
            {/* Avatar head */}
            <motion.div
                animate={isSpeaking ? { y: [0, -3, 0] } : {}}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
                <AvatarFace isSpeaking={isSpeaking} isMouthOpen={isMouthOpen} />
            </motion.div>

            {/* Speaking waveform */}
            <AnimatePresence>
                {isSpeaking && <SpeakingWaveform />}
            </AnimatePresence>

            {/* Subtitle / speech bubble */}
            <AnimatePresence mode="wait">
                {subtitle && (
                    <motion.div
                        key={subtitle.slice(0, 20)}
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.4 }}
                        style={{
                            maxWidth: 460,
                            background: "rgba(207,163,85,0.05)",
                            border: "1px solid rgba(207,163,85,0.15)",
                            borderRadius: "1.25rem",
                            padding: "1.25rem 1.75rem",
                            position: "relative",
                            textAlign: "center",
                        }}
                    >
                        {/* Speech bubble arrow */}
                        <div style={{
                            position: "absolute",
                            top: -8,
                            left: "50%",
                            transform: "translateX(-50%) rotate(45deg)",
                            width: 16,
                            height: 16,
                            background: "rgba(207,163,85,0.05)",
                            borderTop: "1px solid rgba(207,163,85,0.15)",
                            borderLeft: "1px solid rgba(207,163,85,0.15)",
                        }} />

                        {/* Question badge */}
                        {mode === "asking" && totalQuestions > 1 && (
                            <div style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.3rem",
                                marginBottom: "0.75rem",
                                padding: "0.2rem 0.6rem",
                                background: "rgba(207,163,85,0.12)",
                                borderRadius: "999px",
                                fontSize: "0.65rem",
                                fontWeight: 800,
                                color: "#cfa355",
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                            }}>
                                Q{questionNumber}/{totalQuestions}
                            </div>
                        )}

                        <p style={{
                            color: "#e5e5e0",
                            fontSize: mode === "asking" ? "1rem" : "0.9rem",
                            fontWeight: mode === "asking" ? 700 : 500,
                            lineHeight: 1.7,
                            direction: "rtl",
                            margin: 0,
                        }}>
                            {mode === "asking" ? "المُمتحِن بيطرح السؤال... ركز مع الصوت!" : subtitle}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mode status indicator */}
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "#8b8b73",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
            }}>
                <motion.div
                    animate={{
                        background: isSpeaking
                            ? ["rgba(94,194,105,0.8)", "rgba(94,194,105,0.3)", "rgba(94,194,105,0.8)"]
                            : mode === "waiting"
                                ? ["rgba(207,163,85,0.8)", "rgba(207,163,85,0.3)", "rgba(207,163,85,0.8)"]
                                : "rgba(139,139,115,0.4)",
                    }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    style={{ width: 8, height: 8, borderRadius: "50%" }}
                />
                {isSpeaking
                    ? "المُمتحِن بيتكلم..."
                    : mode === "waiting"
                        ? "بيسمعك..."
                        : mode === "farewell"
                            ? "تم الامتحان ✓"
                            : "جاهز"
                }
            </div>
        </motion.div>
    );
}
