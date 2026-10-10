import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, CheckCircle2, AlertCircle, Loader2, ShieldCheck, X, RefreshCw, ScanFace, Camera } from "lucide-react";
import api from "../lib/api";
import { buildFaceEnrollForm } from "../lib/faceBiometrics";
import { getApiErrorMessage } from "../lib/apiErrors";

interface VoiceEnrollmentModalProps {
    isOpen: boolean;
    onClose?: () => void;
    onSuccess: () => void;
    isRequired?: boolean;
}

type Step = "idle" | "recording" | "uploading" | "success" | "error";
type EnrollPhase = "face" | "voice";

const RECORD_SECONDS = 6;

const PHRASES = [
    "أنا أؤكد هويتي الآن من خلال بصمة صوتي لأداء الامتحان بأمانة ومصداقية.",
    "التعليم هو السلاح الأقوى الذي يمكنك استخدامه لتغيير العالم من حولك.",
    "العلم نور والجهل ظلام ومن طلب العلا سهر الليالي واجتهد في طلب المعرفة.",
];

export default function VoiceEnrollmentModal({
    isOpen,
    onClose,
    onSuccess,
    isRequired = false,
}: VoiceEnrollmentModalProps) {
    const [enrollPhase, setEnrollPhase] = useState<EnrollPhase>("face");
    const [step, setStep] = useState<Step>("idle");
    const [phraseIndex, setPhraseIndex] = useState(0);
    const [recordingTime, setRecordingTime] = useState(0);
    const [errorMsg, setErrorMsg] = useState("");
    const [recordedBlobs, setRecordedBlobs] = useState<Blob[]>([]);
    const [faceScanProgress, setFaceScanProgress] = useState(0);
    const [faceScanning, setFaceScanning] = useState(false);
    const [faceModelsLoading, setFaceModelsLoading] = useState(false);
    const [faceModelsReady, setFaceModelsReady] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const faceVideoRef = useRef<HTMLVideoElement>(null);
    const stoppingRef = useRef(false);

    // ── Cleanup on close / unmount ───────────────────────────────────────────
    const cleanup = () => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        stoppingRef.current = false;
    };

    useEffect(() => {
        if (!isOpen) {
            cleanup();
            setEnrollPhase("face");
            setStep("idle"); setErrorMsg(""); setRecordingTime(0);
            setPhraseIndex(0); setRecordedBlobs([]);
            setFaceScanProgress(0); setFaceScanning(false);
            setFaceModelsLoading(false); setFaceModelsReady(false);
        }
        return () => cleanup();
    }, [isOpen]);

    // Face ID runs on the server (InsightFace) — no heavy browser models to preload
    useEffect(() => {
        if (!isOpen || enrollPhase !== "face") return;
        let cancelled = false;
        setFaceModelsLoading(true);
        setFaceModelsReady(false);
        api.get("/face/status")
            .then(() => {
                if (!cancelled) {
                    setFaceModelsReady(true);
                    setFaceModelsLoading(false);
                }
            })
            .catch(() => {
                // Still allow scan — enroll endpoint will load models lazily
                if (!cancelled) {
                    setFaceModelsReady(true);
                    setFaceModelsLoading(false);
                }
            });
        return () => { cancelled = true; };
    }, [isOpen, enrollPhase]);

    // Face ID camera
    useEffect(() => {
        if (!isOpen || enrollPhase !== "face") return;

        let cancelled = false;
        (async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "user", width: 640, height: 480 },
                    audio: false,
                });
                if (cancelled) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
                streamRef.current = stream;
                if (faceVideoRef.current) {
                    faceVideoRef.current.srcObject = stream;
                    await faceVideoRef.current.play().catch(() => {});
                }
            } catch {
                if (!cancelled) {
                    setErrorMsg("تعذّر الوصول للكاميرا — اسمح بالكاميرا لمسح Face ID");
                    setStep("error");
                }
            }
        })();

        return () => { cancelled = true; };
    }, [isOpen, enrollPhase]);

    if (!isOpen) return null;

    const totalPhrases = PHRASES.length;

    const startFaceScan = async () => {
        const video = faceVideoRef.current;
        if (!video) return;
        setErrorMsg("");
        setFaceScanning(true);
        setFaceScanProgress(0);

        const progressTimer = setInterval(() => {
            setFaceScanProgress(p => Math.min(p + 12, 95));
        }, 350);

        try {
            await api.get("/users/me");

            const fd = await buildFaceEnrollForm(video, 5, 380);
            await api.post("/face/enroll", fd, {
                headers: { "Content-Type": "multipart/form-data" },
                timeout: 120_000,
            });
            clearInterval(progressTimer);
            setFaceScanProgress(100);
            streamRef.current?.getTracks().forEach(t => t.stop());
            streamRef.current = null;
            setTimeout(() => {
                setFaceScanning(false);
                setEnrollPhase("voice");
                setStep("idle");
            }, 600);
        } catch (err: any) {
            clearInterval(progressTimer);
            setFaceScanning(false);
            setFaceScanProgress(0);
            setErrorMsg(getApiErrorMessage(err, "فشل مسح Face ID — حاول مرة أخرى"));
            setStep("error");
        }
    };

    // ── Start recording ──────────────────────────────────────────────────────
    const startRecording = async () => {
        setErrorMsg("");
        setRecordingTime(0);
        chunksRef.current = [];
        stoppingRef.current = false;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus"
                : "audio/webm";
            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                streamRef.current?.getTracks().forEach(t => t.stop());
                streamRef.current = null;
                const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
                onPhraseRecorded(audioBlob);
            };

            recorder.start(100);
            setStep("recording");

            let seconds = 0;
            timerRef.current = setInterval(() => {
                seconds += 1;
                setRecordingTime(seconds);
                if (seconds >= RECORD_SECONDS) {
                    stopRecording();
                }
            }, 1000);

        } catch (err) {
            console.error("Mic access error:", err);
            setErrorMsg("تعذّر الوصول إلى الميكروفون. يُرجى السماح بالوصول وإعادة المحاولة.");
            setStep("error");
        }
    };

    // ── Stop recording ───────────────────────────────────────────────────────
    const stopRecording = () => {
        if (stoppingRef.current) return;
        stoppingRef.current = true;
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        const rec = mediaRecorderRef.current;
        if (rec && rec.state === "recording") {
            rec.stop();
        } else {
            stoppingRef.current = false;
        }
    };

    // ── Handle each phrase recording completion ──────────────────────────────
    const onPhraseRecorded = (blob: Blob) => {
        if (blob.size < 1000) {
            setErrorMsg("التسجيل قصير جداً. يُرجى التحدث بصوت واضح وإعادة المحاولة.");
            setStep("error");
            return;
        }

        const newBlobs = [...recordedBlobs, blob];
        setRecordedBlobs(newBlobs);

        if (newBlobs.length < totalPhrases) {
            // More phrases to record
            setPhraseIndex(newBlobs.length);
            setStep("idle");
            setRecordingTime(0);
            stoppingRef.current = false;
        } else {
            // All phrases recorded — upload combined
            handleUpload(newBlobs);
        }
    };

    // ── Upload all recordings ────────────────────────────────────────────────
    const handleUpload = async (blobs: Blob[]) => {
        setStep("uploading");
        setErrorMsg("");

        const formData = new FormData();
        blobs.forEach((blob, i) => {
            formData.append("audio_files", blob, `voiceprint_${i}.webm`);
        });

        try {
            const res = await api.post("/voice/enroll-multi", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (res.data?.ok) {
                setStep("success");
                setTimeout(() => onSuccess(), 1400);
            } else {
                setErrorMsg("فشل تسجيل بصمة الصوت. يُرجى إعادة المحاولة.");
                setStep("error");
            }
        } catch (err: any) {
            console.error("Voice enrollment error:", err);
            const detail = err.response?.data?.detail;
            setErrorMsg(detail || "حدث خطأ أثناء حفظ بصمة الصوت. يُرجى إعادة المحاولة.");
            setStep("error");
        }
    };

    const resetToIdle = () => {
        cleanup();
        setEnrollPhase("face");
        setStep("idle");
        setErrorMsg("");
        setRecordingTime(0);
        setPhraseIndex(0);
        setRecordedBlobs([]);
        setFaceScanProgress(0);
        setFaceScanning(false);
        setFaceModelsReady(false);
    };

    const progress = Math.min((recordingTime / RECORD_SECONDS) * 100, 100);
    const completedCount = recordedBlobs.length;

    return (
        <AnimatePresence>
            <div
                onClick={!isRequired && onClose ? onClose : undefined}
                style={{
                    position: "fixed", inset: 0, zIndex: 9999,
                    background: "rgba(0,0,0,0.88)", backdropFilter: "blur(10px)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "1rem",
                    cursor: !isRequired && onClose ? "pointer" : "default",
                }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.94, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: 12 }}
                    onClick={e => e.stopPropagation()}
                    style={{
                        background: "#0d0d0d",
                        border: "1px solid rgba(255,255,255,0.13)",
                        borderRadius: "1.5rem",
                        padding: "2.5rem",
                        maxWidth: 540, width: "100%",
                        boxShadow: "0 30px 60px -15px rgba(0,0,0,0.8)",
                        position: "relative",
                        color: "#fff",
                        cursor: "default",
                    }}
                >
                    {/* Close button */}
                    {!isRequired && onClose && step !== "uploading" && (
                        <button
                            onClick={onClose}
                            style={{
                                position: "absolute", top: "1.25rem", left: "1.25rem",
                                background: "rgba(255,255,255,0.06)", border: "none", color: "#888",
                                borderRadius: "50%", width: 36, height: 36,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                cursor: "pointer", transition: "all 0.2s",
                            }}
                        >
                            <X size={18} />
                        </button>
                    )}

                    {/* Header */}
                    <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: "50%",
                            background: step === "success" ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.05)",
                            border: `1px solid ${step === "success" ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.12)"}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            margin: "0 auto 1rem", transition: "all 0.4s",
                        }}>
                            {step === "success"
                                ? <CheckCircle2 size={32} color="#4ade80" />
                                : <ShieldCheck size={32} color="#ffffff" />
                            }
                        </div>
                        <h2 style={{
                            fontFamily: "'Antonio', sans-serif", fontSize: "1.75rem", fontWeight: 700,
                            letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "0.4rem",
                        }}>
                            {step === "success"
                            ? "تم تسجيل الهوية البيومترية! ✅"
                            : enrollPhase === "face"
                                ? "Face ID — مسح الوجه"
                                : "بصمة الصوت"}
                        </h2>
                        <p style={{ fontSize: "0.84rem", color: "rgba(255,255,255,0.5)", lineHeight: "1.6" }}>
                            {step === "success"
                                ? "تم حفظ Face ID وبصمة صوتك. سيتم التحقق منهما تلقائياً أثناء الامتحانات."
                                : enrollPhase === "face"
                                    ? "انظر للكاميرا مباشرة — مثل Face ID في الآيفون — لمسح وجهك."
                                    : "اقرأ 3 جمل مختلفة لتسجيل بصمة صوت دقيقة وموثوقة."}
                        </p>
                    </div>

                    {/* Face ID scan */}
                    {enrollPhase === "face" && step !== "success" && (
                        <div style={{ marginBottom: "1.5rem" }}>
                            <div style={{
                                position: "relative", width: "100%", maxWidth: 280, margin: "0 auto",
                                aspectRatio: "1", borderRadius: "50%", overflow: "hidden",
                                border: faceScanning ? "3px solid #4ade80" : "2px solid rgba(255,255,255,0.2)",
                                boxShadow: faceScanning ? "0 0 30px rgba(74,222,128,0.35)" : "none",
                            }}>
                                <video ref={faceVideoRef} muted playsInline
                                    style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
                                {faceScanning && (
                                    <div style={{
                                        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                                        background: "rgba(0,0,0,0.35)",
                                    }}>
                                        <ScanFace size={48} color="#4ade80" style={{ animation: "pulse 1s infinite" }} />
                                    </div>
                                )}
                            </div>
                            {faceScanning && (
                                <div style={{ marginTop: "1rem", maxWidth: 280, marginInline: "auto" }}>
                                    <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 999 }}>
                                        <div style={{ height: "100%", width: `${faceScanProgress}%`, background: "#4ade80", borderRadius: 999, transition: "width 0.3s" }} />
                                    </div>
                                    <p style={{ textAlign: "center", fontSize: "0.75rem", color: "#4ade80", marginTop: "0.5rem" }}>جاري مسح الوجه...</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Progress Steps — voice only */}
                    {enrollPhase === "voice" && step !== "success" && (
                        <div style={{
                            display: "flex", alignItems: "center", justifyContent: "center",
                            gap: "0.5rem", marginBottom: "1.5rem",
                        }}>
                            {PHRASES.map((_, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: "50%",
                                        background: i < completedCount
                                            ? "rgba(74,222,128,0.15)"
                                            : i === phraseIndex
                                                ? "rgba(255,255,255,0.1)"
                                                : "rgba(255,255,255,0.03)",
                                        border: `2px solid ${i < completedCount
                                            ? "#4ade80"
                                            : i === phraseIndex
                                                ? "rgba(255,255,255,0.4)"
                                                : "rgba(255,255,255,0.08)"}`,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: "0.75rem", fontWeight: 700,
                                        color: i < completedCount ? "#4ade80" : i === phraseIndex ? "#fff" : "#555",
                                        transition: "all 0.3s",
                                    }}>
                                        {i < completedCount ? "✓" : i + 1}
                                    </div>
                                    {i < totalPhrases - 1 && (
                                        <div style={{
                                            width: 40, height: 2,
                                            background: i < completedCount ? "#4ade80" : "rgba(255,255,255,0.08)",
                                            borderRadius: 999, transition: "background 0.3s",
                                        }} />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Passphrase card */}
                    {enrollPhase === "voice" && step !== "success" && step !== "uploading" && (
                        <div style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px dashed rgba(255,255,255,0.14)",
                            borderRadius: "1rem", padding: "1.25rem",
                            textAlign: "center", marginBottom: "1.5rem",
                        }}>
                            <p style={{ fontSize: "0.72rem", color: "#aaa", marginBottom: "0.5rem", fontWeight: 600 }}>
                                📢 الجملة {phraseIndex + 1} من {totalPhrases} — اقرأ بصوت واضح:
                            </p>
                            <p style={{
                                fontSize: "1rem", fontWeight: 700, color: "#fff", lineHeight: "1.65",
                                background: "rgba(255,255,255,0.04)",
                                padding: "0.875rem", borderRadius: "0.75rem",
                                direction: "rtl",
                            }}>
                                "{PHRASES[phraseIndex]}"
                            </p>
                        </div>
                    )}

                    {/* Error banner */}
                    <AnimatePresence>
                        {step === "error" && errorMsg && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                style={{
                                    background: "rgba(255,77,77,0.08)",
                                    border: "1px solid rgba(255,77,77,0.28)",
                                    color: "#ff6b6b", borderRadius: "0.75rem",
                                    padding: "0.75rem 1rem", fontSize: "0.82rem",
                                    marginBottom: "1.25rem",
                                    display: "flex", alignItems: "center", gap: "0.5rem",
                                }}
                            >
                                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                                <span>{errorMsg}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Controls */}
                    <div style={{ textAlign: "center" }}>
                        {enrollPhase === "face" && faceModelsLoading && (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", color: "#aaa" }}>
                                <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
                                <span style={{ fontSize: "0.85rem" }}>جاري تحميل موديل Face ID (~6MB)...</span>
                            </div>
                        )}

                        {enrollPhase === "face" && !faceScanning && !faceModelsLoading && faceModelsReady && step !== "error" && (
                            <button
                                onClick={startFaceScan}
                                style={{
                                    background: "#4ade80", color: "#0a0a0a", border: "none",
                                    borderRadius: "1rem", padding: "1rem 2.25rem",
                                    fontSize: "1rem", fontWeight: 800, cursor: "pointer",
                                    display: "inline-flex", alignItems: "center", gap: "0.625rem",
                                }}
                            >
                                <Camera size={20} /> مسح Face ID
                            </button>
                        )}

                        {enrollPhase === "voice" && step === "idle" && (
                            <button
                                onClick={startRecording}
                                style={{
                                    background: "#ffffff", color: "#000000", border: "none",
                                    borderRadius: "1rem", padding: "1rem 2.25rem",
                                    fontSize: "1rem", fontFamily: "'Antonio', sans-serif",
                                    fontWeight: 700, letterSpacing: "0.05em",
                                    cursor: "pointer",
                                    display: "inline-flex", alignItems: "center", gap: "0.625rem",
                                    transition: "transform 0.15s, box-shadow 0.15s",
                                    boxShadow: "0 4px 20px rgba(255,255,255,0.12)",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
                            >
                                <Mic size={20} />
                                {completedCount === 0 ? `بدء التسجيل (${RECORD_SECONDS} ثوانٍ)` : `تسجيل الجملة ${phraseIndex + 1}`}
                            </button>
                        )}

                        {step === "recording" && (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                                <motion.div
                                    animate={{ scale: [1, 1.12, 1], boxShadow: ["0 0 0px rgba(255,77,77,0)", "0 0 24px rgba(255,77,77,0.5)", "0 0 0px rgba(255,77,77,0)"] }}
                                    transition={{ repeat: Infinity, duration: 1.2 }}
                                    style={{
                                        width: 72, height: 72, borderRadius: "50%",
                                        background: "rgba(255,77,77,0.12)",
                                        border: "2px solid #ff4d4d",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}
                                >
                                    <Mic size={32} color="#ff4d4d" />
                                </motion.div>
                                <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ff4d4d" }}>
                                    جاري التسجيل... ({RECORD_SECONDS - recordingTime}s)
                                </p>
                                <div style={{
                                    width: "100%", maxWidth: 300, height: 6,
                                    background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden",
                                }}>
                                    <motion.div
                                        style={{
                                            height: "100%", background: "#ff4d4d",
                                            borderRadius: 999, width: `${progress}%`,
                                        }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </div>
                            </div>
                        )}

                        {step === "uploading" && (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", color: "#aaa" }}>
                                <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
                                <span style={{ fontSize: "0.9rem" }}>جاري حفظ بصمة الصوت...</span>
                            </div>
                        )}

                        {step === "success" && (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", color: "#4ade80" }}
                            >
                                <CheckCircle2 size={28} />
                                <span style={{ fontSize: "1.05rem", fontWeight: 700 }}>تم الحفظ بنجاح!</span>
                            </motion.div>
                        )}

                        {step === "error" && (
                            <button
                                onClick={resetToIdle}
                                style={{
                                    background: "rgba(255,255,255,0.06)",
                                    color: "#ffffff", border: "1px solid rgba(255,255,255,0.2)",
                                    borderRadius: "1rem", padding: "0.875rem 1.75rem",
                                    fontSize: "0.9rem", fontFamily: "'Antonio', sans-serif",
                                    fontWeight: 700, letterSpacing: "0.04em",
                                    cursor: "pointer",
                                    display: "inline-flex", alignItems: "center", gap: "0.5rem",
                                }}
                            >
                                <RefreshCw size={17} />
                                إعادة التسجيل من البداية
                            </button>
                        )}
                    </div>

                    {isRequired && step !== "success" && (
                        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.72rem", color: "rgba(255,160,0,0.7)" }}>
                            ⚠️ Face ID + بصمة الصوت مطلوبان للمتابعة
                        </p>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
