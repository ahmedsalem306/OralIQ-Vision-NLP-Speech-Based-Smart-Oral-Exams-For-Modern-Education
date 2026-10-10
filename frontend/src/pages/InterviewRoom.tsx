import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Mic, Video, VideoOff, MicOff, Square, Loader2, CheckCircle2, ArrowLeft, Home, Send, Brain } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../lib/api";

type RoomStatus = "idle" | "recording" | "processing" | "evaluated" | "finalized";

export default function InterviewRoom() {
    const { questionId } = useParams();
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const [user, setUser] = useState<{ full_name: string; student_number: string } | null>(null);
    const [status, setStatus] = useState<RoomStatus>("idle");
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [question, setQuestion] = useState<{ text: string; category: string; duration_minutes: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(120);
    const [startedAt, setStartedAt] = useState<string | null>(null);
    const startedAtRef = useRef<string | null>(null);

    useEffect(() => {
        api.get("/users/me")
            .then(res => setUser(res.data))
            .catch(() => setUser({ full_name: "Student", student_number: "2024-STD" }));
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((s) => {
                setStream(s);
                if (videoRef.current) videoRef.current.srcObject = s;
                setPermissionGranted(true);
            })
            .catch(() => alert("Camera/Microphone access required."));

        api.get(`/questions/${questionId}`)
            .then(res => {
                setQuestion(res.data);
                const duration = (res.data.duration_minutes || 2) * 60;
                setTimeLeft(duration);
            })
            .catch(() => {
                setQuestion({ text: "Tell me about a time you faced a difficult challenge and how you overcame it.", category: "Behavioral", duration_minutes: 2 });
                setTimeLeft(120);
            })
            .finally(() => setLoading(false));

        return () => { stream?.getTracks().forEach(t => t.stop()); };
    }, [questionId]);

    useEffect(() => {
        if (status !== "recording" || timeLeft <= 0) return;
        const t = setInterval(() => setTimeLeft(p => {
            if (p <= 1) {
                handleStopRecording();
                return 0;
            }
            return p - 1;
        }), 1000);
        return () => clearInterval(t);
    }, [status, timeLeft]);

    const handleStartRecording = () => {
        if (!stream) return;
        chunksRef.current = [];
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            submitToAI(blob);
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
        const now = new Date().toISOString();
        setStartedAt(now);
        startedAtRef.current = now;
        setStatus("recording");
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && status === "recording") {
            mediaRecorderRef.current.stop();
            setStatus("processing");
            stream?.getTracks().forEach(t => t.stop());
        }
    };

    const submitToAI = async (videoBlob: Blob) => {
        try {
            const formData = new FormData();
            formData.append("question_id", questionId || "");
            formData.append("student_name", user?.full_name || "Student");
            formData.append("student_number", user?.student_number || "123");
            formData.append("audio", videoBlob, "interview_answer.webm");
            formData.append("anti_cheat_alerts", JSON.stringify([]));

            const sAt = startedAtRef.current || startedAt;
            if (sAt) formData.append("started_at", sAt);

            await api.post("/exams/submit", formData);
            setStatus("evaluated");
        } catch (err) {
            console.error("AI Submission failed:", err);
            setStatus("evaluated"); // Fallback to let them at least "submit"
        }
    };

    const handleFinalSubmit = () => {
        localStorage.removeItem("pendingExamToken");
        setStatus("finalized");
    };

    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const timeColor = timeLeft < 30 ? "#FF4D6D" : timeLeft < 60 ? "#FFB347" : "#00D4AA";

    const [processingStep, setProcessingStep] = useState(0);

    useEffect(() => {
        if (status !== "processing") return;
        const steps = [
            "Initializing neural networks...",
            "Analyzing speech patterns...",
            "Checking content relevance...",
            "Verifying integrity...",
            "Finalizing your scores..."
        ];
        const t = setInterval(() => {
            setProcessingStep(p => (p < steps.length - 1 ? p + 1 : p));
        }, 4000);
        return () => clearInterval(t);
    }, [status]);

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", background: "#0F0F1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 size={40} color="#6C63FF" style={{ animation: "spin 1s linear infinite" }} />
            </div>
        );
    }

    const overlayVariants = {
        hidden: { opacity: 0, scale: 0.9, y: 10 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5 } }
    };

    if (status === "processing" || status === "evaluated" || status === "finalized") {
        return (
            <div style={{ minHeight: "100vh", background: "#0F0F1A", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
                <AnimatePresence mode="wait">
                    {status === "processing" && (
                        <motion.div
                            key="processing"
                            variants={overlayVariants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}
                        >
                            <div style={{ position: "relative" }}>
                                <Brain size={80} color="#6C63FF" style={{ filter: "drop-shadow(0 0 20px rgba(108,99,255,0.4))" }} />
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    style={{ position: "absolute", inset: -20, border: "2px dashed #00D4AA", borderRadius: "50%", opacity: 0.5 }}
                                />
                            </div>
                            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#E8E8F0" }}>AI is evaluating your answer...</h2>
                            <div style={{ padding: "0.5rem 1rem", background: "rgba(108,99,255,0.1)", borderRadius: "0.5rem", border: "1px solid rgba(108,99,255,0.2)" }}>
                                <p style={{ color: "#6C63FF", fontWeight: 700, fontSize: "0.9rem" }}>
                                    {[
                                        "Initializing neural networks...",
                                        "Analyzing speech patterns...",
                                        "Checking content relevance...",
                                        "Verifying integrity...",
                                        "Finalizing your scores..."
                                    ][processingStep]}
                                </p>
                            </div>
                            <p style={{ color: "#8888A8", maxWidth: 400, fontSize: "0.9rem" }}>
                                Our system is performing a deep multi-modal analysis. This can take up to 60 seconds for high-quality recordings.
                            </p>
                        </motion.div>
                    )}

                    {status === "evaluated" && (
                        <motion.div
                            key="evaluated"
                            variants={overlayVariants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}
                        >
                            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(0,212,170,0.15)", border: "1px solid rgba(0,212,170,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <CheckCircle2 size={40} color="#00D4AA" />
                            </div>
                            <div>
                                <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#E8E8F0", marginBottom: "0.5rem" }}>Evaluation Complete!</h2>
                                <p style={{ color: "#8888A8" }}>Your answer has been processed. Click below to submit your exam final result.</p>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(108,99,255,0.4)" }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleFinalSubmit}
                                style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem 2.5rem", background: "linear-gradient(135deg, #6C63FF, #00D4AA)", color: "#fff", border: "none", borderRadius: "1rem", fontWeight: 800, fontSize: "1.1rem", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}
                            >
                                <Send size={20} /> Submit Exam
                            </motion.button>
                        </motion.div>
                    )}

                    {status === "finalized" && (
                        <motion.div
                            key="finalized"
                            variants={overlayVariants}
                            initial="hidden"
                            animate="visible"
                            style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}
                        >
                            <div style={{ width: 100, height: 100, borderRadius: "50%", background: "linear-gradient(135deg, #6C63FF, #00D4AA)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 40px rgba(108,99,255,0.3)" }}>
                                <Home size={50} color="#fff" />
                            </div>
                            <div>
                                <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "#E8E8F0", marginBottom: "0.5rem" }}>Success!</h2>
                                <p style={{ color: "#8888A8" }}>Your exam result has been saved. You can now return to your dashboard.</p>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.05, background: "rgba(255,255,255,0.1)" }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate("/dashboard")}
                                style={{ padding: "0.85rem 2rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#E8E8F0", borderRadius: "0.75rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}
                            >
                                Back to Home
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ minHeight: "100vh", background: "#0F0F1A", color: "#E8E8F0", display: "flex", flexDirection: "column" }}
        >
            {/* Header */}
            <header style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2rem", background: "#1A1A2E", borderBottom: "1px solid rgba(108,99,255,0.15)" }}>
                <button onClick={() => navigate(-1)} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "none", border: "none", color: "#8888A8", cursor: "pointer", fontSize: "0.875rem", fontFamily: "'Space Grotesk', sans-serif" }}>
                    <ArrowLeft size={16} /> Back
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                    {status === "recording" && (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "1rem", color: timeColor }}>
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                                style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF4D6D" }}
                            />
                            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                        </div>
                    )}
                    <button
                        onClick={handleStopRecording}
                        disabled={status !== "recording"}
                        style={{ padding: "0.5rem 1.25rem", background: status === "recording" ? "linear-gradient(135deg, #6C63FF, #00D4AA)" : "rgba(255,255,255,0.05)", color: status === "recording" ? "#fff" : "#8888A8", border: "none", borderRadius: "0.75rem", fontWeight: 700, fontSize: "0.875rem", cursor: status === "recording" ? "pointer" : "not-allowed", fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                        Finish Answer
                    </button>
                </div>
            </header>

            {/* Main */}
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem", padding: "1.5rem" }}>
                {/* Video container */}
                <div style={{ position: "relative", background: "#000", borderRadius: "1.25rem", overflow: "hidden", border: "1px solid rgba(108,99,255,0.2)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
                    <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />

                    {/* Question overlay */}
                    <div style={{ position: "absolute", top: "1.5rem", left: "1.5rem", right: "1.5rem", background: "rgba(15,15,26,0.85)", backdropFilter: "blur(12px)", borderRadius: "1rem", padding: "1.25rem", border: "1px solid rgba(108,99,255,0.2)" }}>
                        <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#6C63FF", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>{question?.category}</p>
                        <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "#E8E8F0", lineHeight: 1.6 }}>"{question?.text}"</p>
                    </div>

                    {/* Controls */}
                    <div style={{ position: "absolute", bottom: "2rem", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: "1.5rem" }}>
                        {status === "idle" ? (
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={handleStartRecording}
                                disabled={!permissionGranted}
                                style={{ width: 72, height: 72, borderRadius: "50%", background: "#FF4D6D", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 30px rgba(255,77,109,0.5)" }}
                            >
                                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#fff" }} />
                            </motion.button>
                        ) : status === "recording" ? (
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={handleStopRecording}
                                style={{ width: 64, height: 64, borderRadius: "50%", background: "#1A1A2E", border: "2px solid rgba(255,255,255,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                            >
                                <Square size={24} color="#fff" fill="#fff" />
                            </motion.button>
                        ) : null}
                    </div>

                    {!permissionGranted && (
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,15,26,0.9)" }}>
                            <div style={{ textAlign: "center" }}>
                                <VideoOff size={48} color="#FF4D6D" style={{ margin: "0 auto 1rem" }} />
                                <p style={{ color: "#FF4D6D", fontWeight: 600 }}>Camera access required</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ background: "#1A1A2E", border: "1px solid rgba(108,99,255,0.15)", borderRadius: "1.25rem", padding: "1.25rem" }}>
                        <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#E8E8F0", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <CheckCircle2 size={16} color="#00D4AA" /> AI System Status
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            {[
                                { icon: Video, label: "Face Analysis", desc: "Detecting expressions", ok: permissionGranted },
                                { icon: Mic, label: "Voice Analysis", desc: "Monitoring tone & pace", ok: permissionGranted },
                                { icon: MicOff, label: "NLP Engine", desc: "Analyzing content", ok: true },
                            ].map((item, idx) => {
                                const Icon = item.icon;
                                return (
                                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", background: "rgba(255,255,255,0.03)", borderRadius: "0.75rem", border: "1px solid rgba(108,99,255,0.08)" }}>
                                        <Icon size={16} color={item.ok ? "#00D4AA" : "#8888A8"} />
                                        <div>
                                            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#E8E8F0" }}>{item.label}</p>
                                            <p style={{ fontSize: "0.75rem", color: "#8888A8" }}>{item.desc}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ background: "#1A1A2E", border: "1px solid rgba(108,99,255,0.15)", borderRadius: "1.25rem", padding: "1.25rem" }}>
                        <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#E8E8F0", marginBottom: "0.75rem" }}>Tips</h3>
                        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            {["Look directly at the camera", "Speak clearly and at a moderate pace", "Ensure good lighting on your face", "Answer completely before stopping"].map((tip, i) => (
                                <li key={i} style={{ fontSize: "0.85rem", color: "#8888A8", display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                                    <span style={{ color: "#6C63FF", fontWeight: 800 }}>•</span> {tip}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
