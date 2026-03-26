import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Square, CheckCircle2, User, Hash, Camera, ArrowRight, Sparkles, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "../components/Logo";
import api from "../lib/api";
import { ObjectDetector, FilesetResolver } from "@mediapipe/tasks-vision";

// ─── Types ───────────────────────────────────────────────────────────────────
type Step = "auth_check" | "student_info" | "question_preview" | "recording" | "processing" | "submitted";

interface ExamQuestion {
    id: number;
    text: string;
    category: string;
    difficulty: string;
    timeLimit: number;
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: Step }) {
    const steps = [
        { key: "student_info", label: "Check-In", id: 1 },
        { key: "question_preview", label: "Question", id: 2 },
        { key: "recording", label: "Record", id: 3 },
        { key: "submitted", label: "Done", id: 4 },
    ];

    const getStatus = (stepKey: string, stepId: number) => {
        const stepOrder = ["auth_check", "student_info", "question_preview", "recording", "processing", "submitted"];
        const currentIndex = stepOrder.indexOf(currentStep);
        const targetIndex = stepOrder.indexOf(stepKey);

        if (currentIndex > targetIndex || (currentStep === "processing" && stepId <= 3) || (currentStep === "submitted" && stepId <= 4)) return "completed";
        if (currentIndex === targetIndex) return "active";
        return "pending";
    };

    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", marginBottom: "3rem", width: "100%", maxWidth: "600px" }}>
            {steps.map((s, i) => {
                const status = getStatus(s.key, s.id);
                return (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: i === steps.length - 1 ? "none" : 1 }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", position: "relative" }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700,
                                background: status === "completed" ? "#00D4AA" : status === "active" ? "#6C63FF" : "rgba(255,255,255,0.05)",
                                border: `2px solid ${status === "completed" ? "#00D4AA" : status === "active" ? "#6C63FF" : "rgba(255,255,255,0.1)"}`,
                                color: status === "pending" ? "#8888A8" : "#fff",
                                transition: "all 0.3s ease"
                            }}>
                                {status === "completed" ? <Check size={16} /> : s.id}
                            </div>
                            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: status === "active" ? "#6C63FF" : "#8888A8", position: "absolute", top: "100%", marginTop: "0.5rem", whiteSpace: "nowrap" }}>{s.label}</span>
                        </div>
                        {i < steps.length - 1 && (
                            <div style={{ flex: 1, height: 2, background: status === "completed" ? "#00D4AA" : "rgba(255,255,255,0.1)", margin: "0 0.5rem" }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ExamRoom() {
    const examToken = localStorage.getItem("pendingExamToken") || "";
    const navigate = useNavigate();

    // Step state
    const [step, setStep] = useState<Step>("auth_check");
    const [authLoading, setAuthLoading] = useState(true);
    const [question, setQuestion] = useState<ExamQuestion | null>(null);

    // Student info
    const [studentName, setStudentName] = useState("");
    const [studentId, setStudentId] = useState("");
    const [infoError, setInfoError] = useState("");

    // Recording
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [recording, setRecording] = useState(false);
    const recordingRef = useRef(false);
    useEffect(() => { recordingRef.current = recording; }, [recording]);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [timeLeft, setTimeLeft] = useState(120);
    const [startedAt, setStartedAt] = useState<string | null>(null);
    const startedAtRef = useRef<string | null>(null);

    // AI Monitoring
    const [liveAlert, setLiveAlert] = useState<string | null>(null);
    const antiCheatAlertsRef = useRef<Record<string, number>>({});
    const lastAlertTimeRef = useRef<number>(0);
    const lastFrameTimeRef = useRef<number>(performance.now());

    // ── Auth check + question fetch on mount ─────────────────────────────────
    useEffect(() => {
        if (step === "processing" || step === "submitted") return;
        const token_stored = localStorage.getItem("token");
        if (token_stored) {
            api.get("/users/me")
                .then(res => {
                    setStudentName(res.data.full_name || "");
                    if (examToken && examToken !== "") {
                        return api.get(`/questions/by-token/${examToken}`)
                            .then(qRes => {
                                const q = qRes.data;
                                const duration = (q.duration_minutes || 2) * 60;
                                setQuestion({
                                    id: q.id,
                                    text: q.text,
                                    category: q.category,
                                    difficulty: q.difficulty,
                                    timeLimit: duration,
                                });
                                setTimeLeft(duration);
                            })
                            .catch(() => console.error("Could not load exam question."));
                    }
                })
                .then(() => {
                    if (step === "auth_check") setStep("student_info");
                })
                .catch(() => {
                    localStorage.removeItem("token");
                    setStep("auth_check");
                })
                .finally(() => setAuthLoading(false));
        } else {
            setAuthLoading(false);
            setStep("auth_check");
        }
    }, [examToken, step]);

    // ── Countdown timer ───────────────────────────────────────────────────────
    useEffect(() => {
        if (step !== "recording" || !recording || timeLeft <= 0) return;
        const t = setInterval(() => setTimeLeft(p => {
            if (p <= 1) { handleSubmit(); return 0; }
            return p - 1;
        }), 1000);
        return () => clearInterval(t);
    }, [step, recording, timeLeft]);

    // ── Camera setup + FaceMesh ───────────────────────────────────────────────
    const setupCamera = async () => {
        try {
            const s = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user" },
                audio: true
            });
            setStream(s);
            if (videoRef.current) videoRef.current.srcObject = s;
            initFaceMesh();
        } catch {
            console.error("Camera access denied");
        }
    };

    const initFaceMesh = async () => {
        const { FaceMesh } = await import("@mediapipe/face_mesh");
        const faceMesh = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });
        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        const objectDetector = await ObjectDetector.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
                delegate: "GPU"
            },
            scoreThreshold: 0.5,
            runningMode: "VIDEO"
        });

        faceMesh.onResults((results) => {
            const now = performance.now();
            const dt = (now - lastFrameTimeRef.current) / 1000;
            // Only update time after BOTH detectors have run
            if (!recordingRef.current) return;

            if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
                accumulateDistraction("no_face", dt);
                return;
            }
            if (results.multiFaceLandmarks.length > 1) accumulateDistraction("multiple_people", dt);

            const landmarks = results.multiFaceLandmarks[0];
            const nose = landmarks[1];
            const leftEye = landmarks[33];
            const rightEye = landmarks[263];
            const mouth = landmarks[14]; // Upper lip

            // --- Head Pose (Nose vs Eyes) ---
            const headHorizontalRatio = (nose.x - leftEye.x) / (rightEye.x - leftEye.x);
            const eyeToNose = nose.y - leftEye.y;
            const noseToMouth = mouth.y - nose.y;
            const headVerticalRatio = eyeToNose / noseToMouth;

            // --- Pupil/Iris Tracking (Left Eye) ---
            const iris = landmarks[468]; // Center of left iris
            const eyeInner = landmarks[133];
            const eyeOuter = landmarks[33];
            const eyeTop = landmarks[159];
            const eyeBottom = landmarks[145];

            // Horizontal pupil position: 0.0 (looking far left/outer) to 1.0 (looking far right/inner)
            // (Note: camera feeds are often mirrored, so directions might feel flipped. We catch both extremes)
            const pupilHorizontalRatio = (iris.x - eyeOuter.x) / (eyeInner.x - eyeOuter.x);

            // Vertical pupil position: 0.0 (looking up) to 1.0 (looking down)
            const pupilVerticalRatio = (iris.y - eyeTop.y) / (eyeBottom.y - eyeTop.y);

            // Trigger alerts if EITHER the head is turned OR the pupils are darting (Increased sensitivity)
            if (headHorizontalRatio < 0.42 || pupilHorizontalRatio > 0.65) accumulateDistraction("gaze_left", dt);
            else if (headHorizontalRatio > 0.58 || pupilHorizontalRatio < 0.35) accumulateDistraction("gaze_right", dt);

            if (headVerticalRatio > 1.5 || pupilVerticalRatio > 0.65) accumulateDistraction("gaze_down", dt);
            else if (headVerticalRatio < 0.8 || pupilVerticalRatio < 0.35) accumulateDistraction("gaze_up", dt);

        });

        const runDetection = async () => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
                const now = performance.now();
                await faceMesh.send({ image: videoRef.current });

                if (recordingRef.current) {
                    const detections = objectDetector.detectForVideo(videoRef.current, now);
                    for (const detection of detections.detections) {
                        const label = detection.categories[0].categoryName;
                        if (label === 'cell phone') {
                            accumulateDistraction("phone_detected", (now - lastFrameTimeRef.current) / 1000);
                        } else if (label === 'book') {
                            accumulateDistraction("book_detected", (now - lastFrameTimeRef.current) / 1000);
                        }
                    }
                }
                lastFrameTimeRef.current = now;
            }
            requestAnimationFrame(runDetection);
        };
        requestAnimationFrame(runDetection);
    };

    const accumulateDistraction = (type: string, dt: number) => {
        antiCheatAlertsRef.current[type] = (antiCheatAlertsRef.current[type] || 0) + dt;
        const now = Date.now();
        if (now - lastAlertTimeRef.current > 4000) {
            const labels: Record<string, string> = {
                "gaze_left": "Looking away",
                "gaze_right": "Looking away",
                "gaze_down": "Looking down",
                "gaze_up": "Looking up",
                "no_face": "Face not detected",
                "multiple_people": "Multiple people detected",
                "phone_detected": "Phone detected",
                "book_detected": "Book detected"
            };
            setLiveAlert(`⚠️ ${labels[type] || type}! Please focus on the screen.`);
            lastAlertTimeRef.current = now;
            setTimeout(() => setLiveAlert(null), 3000);
        }
    };

    const handleReadyClick = async () => {
        const now = new Date().toISOString();
        setStep("recording");
        setStartedAt(now);
        startedAtRef.current = now;
        await setupCamera();
    };

    const startRecording = () => {
        if (!stream) return;
        audioChunksRef.current = [];
        const audioTracks = stream.getAudioTracks();
        const audioStream = new MediaStream(audioTracks);
        const recorder = new MediaRecorder(audioStream, {
            mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm',
        });
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        recorder.start(1000);
        mediaRecorderRef.current = recorder;
        setRecording(true);
    };

    const stopRecording = (): Promise<Blob> => {
        return new Promise((resolve) => {
            const recorder = mediaRecorderRef.current;
            if (!recorder || recorder.state === 'inactive') {
                resolve(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
                return;
            }
            recorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                resolve(blob);
            };
            recorder.stop();
            setRecording(false);
        });
    };

    const handleSubmit = async () => {
        setShowSubmitModal(false);
        const audioBlob = await stopRecording();
        const fAt = new Date().toISOString();

        stream?.getTracks().forEach(t => t.stop());
        setStep('processing');

        try {
            if (question) {
                const formData = new FormData();
                formData.append('question_id', String(question.id));
                formData.append('student_name', studentName);
                formData.append('student_number', studentId);
                formData.append('audio', audioBlob, 'answer.webm');
                formData.append('anti_cheat_alerts', JSON.stringify(antiCheatAlertsRef.current));

                const sAt = startedAtRef.current || startedAt;
                if (sAt) formData.append('started_at', sAt);
                formData.append('finished_at', fAt);

                await api.post('/exams/submit', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 120000,
                });
            }
        } catch (err) {
            console.error('Submit error:', err);
        }
        localStorage.removeItem('pendingExamToken');
        setStep('submitted');
    };

    const handleInfoSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentName.trim() || !studentId.trim()) {
            setInfoError("Please fill in all details.");
            return;
        }
        setStep("question_preview");
    };

    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const timeColor = timeLeft < 30 ? "#FF4D6D" : timeLeft < 60 ? "#FFB347" : "#00D4AA";

    return (
        <div style={{ minHeight: "100vh", background: "#0F0F1A", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
            <AnimatePresence mode="wait">
                {authLoading ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: 40, height: 40, border: "3px solid rgba(108,99,255,0.3)", borderTopColor: "#6C63FF", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    </motion.div>
                ) : step === "recording" ? (
                    <motion.div key="recording" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
                        <header style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2rem", background: "#1A1A2E", borderBottom: "1px solid rgba(108,99,255,0.1)" }}>
                            <Logo size={24} showText={true} />
                            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: timeColor, fontWeight: 800 }}>
                                    <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF4D6D" }} />
                                    {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
                                </div>
                                <motion.button whileHover={{ scale: 1.05 }} onClick={() => setShowSubmitModal(true)} style={{ padding: "0.5rem 1.5rem", background: "#6C63FF", color: "#fff", border: "none", borderRadius: "0.5rem", fontWeight: 700, cursor: "pointer" }}>Finish</motion.button>
                            </div>
                        </header>

                        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", position: "relative", background: "#000", margin: "1rem", borderRadius: "1.5rem", overflow: "hidden", border: "1px solid rgba(108,99,255,0.2)" }}>
                            <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", maxWidth: "900px", maxHeight: "100%", objectFit: "contain", transform: "scaleX(-1)" }} />

                            <AnimatePresence>
                                {liveAlert && (
                                    <motion.div initial={{ y: 20, opacity: 0, x: "-50%" }} animate={{ y: 0, opacity: 1, x: "-50%" }} exit={{ y: 20, opacity: 0, x: "-50%" }} style={{ position: "absolute", bottom: "2rem", left: "50%", background: "rgba(255,77,109,0.9)", color: "#fff", padding: "0.75rem 1.5rem", borderRadius: "1rem", fontWeight: 700, backdropFilter: "blur(10px)" }}>
                                        {liveAlert}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div style={{ position: "absolute", top: "1.5rem", left: "1.5rem", right: "1.5rem", background: "rgba(15,15,26,0.8)", backdropFilter: "blur(10px)", padding: "1.5rem", borderRadius: "1rem", border: "1px solid rgba(108,99,255,0.2)" }}>
                                <p style={{ fontSize: "0.65rem", color: "#6C63FF", fontWeight: 800, marginBottom: "0.25rem" }}>{question?.category}</p>
                                <p style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 600 }}>{question?.text}</p>
                            </div>

                            <div style={{ position: "absolute", bottom: "2rem", right: "2rem" }}>
                                {!recording ? (
                                    <button onClick={startRecording} style={{ width: 64, height: 64, borderRadius: "50%", background: "#FF4D6D", border: "none", cursor: "pointer" }} />
                                ) : (
                                    <motion.button animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2 }} onClick={() => setShowSubmitModal(true)} style={{ width: 64, height: 64, borderRadius: "50%", background: "#FF4D6D", border: "none", display: "flex", alignItems: "center", justifyContent: "center" }}><Square size={24} color="#fff" fill="#fff" /></motion.button>
                                )}
                            </div>
                        </div>

                        {showSubmitModal && (
                            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
                                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ background: "#1A1A2E", padding: "2.5rem", borderRadius: "1.5rem", textAlign: "center", maxWidth: 400, border: "1px solid rgba(108,99,255,0.3)" }}>
                                    <h2 style={{ color: "#fff", marginBottom: "1rem" }}>Submit Exam?</h2>
                                    <p style={{ color: "#8888A8", marginBottom: "2rem" }}>Are you sure you want to finish and submit your answer?</p>
                                    <div style={{ display: "flex", gap: "1rem" }}>
                                        <button onClick={() => setShowSubmitModal(false)} style={{ flex: 1, padding: "0.75rem", background: "none", border: "1px solid #333", color: "#8888A8", borderRadius: "0.5rem" }}>Cancel</button>
                                        <button onClick={handleSubmit} style={{ flex: 1, padding: "0.75rem", background: "#6C63FF", color: "#fff", border: "none", borderRadius: "0.5rem", fontWeight: 700 }}>Submit</button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </motion.div>
                ) : step === "processing" ? (
                    <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0F0F1A" }}>
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ width: 60, height: 60, borderRadius: "50%", border: "3px solid rgba(108,99,255,0.1)", borderTopColor: "#6C63FF", marginBottom: "2rem" }} />
                        <h2 style={{ color: "#fff" }}>AI Analysis in Progress</h2>
                        <p style={{ color: "#8888A8" }}>Evaluating your response...</p>
                    </motion.div>
                ) : (
                    <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="oiq-auth-bg" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>

                        <StepIndicator currentStep={step} />

                        {step === "auth_check" ? (
                            <div className="oiq-card" style={{ textAlign: "center" }}>
                                <div className="oiq-logo-mark">
                                    <h1>OralIQ <Sparkles size={14} color="#00D4AA" /></h1>
                                    <span>INTERVIEW & ORAL EXAM PLATFORM</span>
                                </div>
                                <h2 style={{ color: "#E8E8F0", margin: "1.5rem 0 0.5rem" }}>Exam Invitation</h2>
                                <p style={{ color: "#8888A8", fontSize: "0.9rem", marginBottom: "2rem" }}>Please sign in to continue your exam.</p>
                                <button onClick={() => navigate(`/login?redirect=/exam/start`)} className="oiq-btn" style={{ width: "100%" }}>Sign In</button>
                            </div>
                        ) : step === "student_info" ? (
                            <div className="oiq-card" style={{ maxWidth: 520, padding: "3rem" }}>
                                <div className="oiq-logo-mark">
                                    <h1>OralIQ</h1>
                                </div>
                                <h2 style={{ color: "#E8E8F0", marginTop: "1rem", fontSize: "1.75rem" }}>Check-In</h2>

                                <form onSubmit={handleInfoSubmit} style={{ marginTop: "2rem" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem", padding: "1.5rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(108,99,255,0.1)", borderRadius: "1rem" }}>
                                        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #6C63FF, #00D4AA)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "1.5rem", fontWeight: 800 }}>
                                            {studentName ? studentName[0] : <User />}
                                        </div>
                                        <div>
                                            <p style={{ color: "#8888A8", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>Student</p>
                                            <p style={{ color: "#E8E8F0", fontSize: "1.1rem", fontWeight: 700 }}>{studentName || "Identity Verification"}</p>
                                        </div>
                                    </div>

                                    <div className="oiq-field">
                                        <User size={18} />
                                        <input type="text" className="oiq-input" placeholder="Full Name" value={studentName} onChange={e => setStudentName(e.target.value)} required />
                                    </div>
                                    <div className="oiq-field">
                                        <Hash size={18} />
                                        <input type="text" className="oiq-input" placeholder="Student ID" value={studentId} onChange={e => setStudentId(e.target.value)} required />
                                    </div>

                                    {infoError && <p style={{ color: "#FF4D6D", fontSize: "0.85rem", marginTop: "1rem", textAlign: "center" }}>{infoError}</p>}

                                    <button type="submit" className="oiq-btn" style={{ marginTop: "1.5rem", height: "56px", fontSize: "1.1rem" }}>
                                        Continue <ArrowRight size={20} style={{ marginLeft: "0.5rem" }} />
                                    </button>
                                </form>
                            </div>
                        ) : step === "question_preview" ? (
                            <div className="oiq-card" style={{ maxWidth: 640, padding: "3rem" }}>
                                <div className="oiq-logo-mark"><h1>OralIQ</h1></div>

                                <div style={{ background: "rgba(108,99,255,0.05)", padding: "2rem", borderRadius: "1.25rem", border: "1px solid rgba(108,99,255,0.15)", margin: "2rem 0" }}>
                                    <p style={{ fontSize: "0.75rem", color: "#6C63FF", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>{question?.category || "GENERAL"}</p>
                                    <h3 style={{ color: "#E8E8F0", fontSize: "1.25rem", fontWeight: 700, lineHeight: 1.5 }}>
                                        The question will appear when you start.
                                    </h3>
                                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "1.5rem" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#8888A8", fontSize: "0.85rem" }}>
                                            <Sparkles size={14} color="#00D4AA" /> Duration: <strong>{(question?.timeLimit ?? 120) / 60} mins</strong>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ background: "rgba(0,212,170,0.05)", border: "1px solid rgba(0,212,170,0.2)", borderRadius: "1rem", padding: "1.25rem", marginBottom: "2.5rem" }}>
                                    <p style={{ color: "#00D4AA", fontSize: "0.9rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                        Read the question carefully. When you press "I'm Ready", your camera will open and the timer will start.
                                    </p>
                                </div>

                                <button onClick={handleReadyClick} className="oiq-btn" style={{ height: "64px", fontSize: "1.2rem", background: "linear-gradient(135deg, #6C63FF, #00D4AA)" }}>
                                    <Camera size={24} style={{ marginRight: "0.75rem" }} /> I'm Ready — Start Recording
                                </button>
                            </div>
                        ) : (
                            <div className="oiq-card" style={{ textAlign: "center", maxWidth: 480, padding: "3.5rem 2rem" }}>
                                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(0,212,170,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 2rem" }}>
                                    <CheckCircle2 size={40} color="#00D4AA" />
                                </div>
                                <h1 style={{ color: "#fff", fontSize: "2rem", fontWeight: 800 }}>Submitted!</h1>
                                <p style={{ color: "#8888A8", margin: "1rem 0 2.5rem", fontSize: "1rem" }}>Well done, {studentName}. Your oral exam has been recorded and sent for AI evaluation.</p>

                                <div style={{ background: "rgba(0,212,170,0.05)", padding: "2.5rem 2rem", borderRadius: "1.25rem", border: "1px solid rgba(0,212,170,0.25)", marginBottom: "2rem" }}>
                                    <h3 style={{ color: "#00D4AA", fontSize: "1.75rem", fontWeight: 900, marginBottom: "0.5rem" }}>تم بنجاح</h3>
                                    <p style={{ color: "#E8E8F0", fontSize: "1.1rem" }}>انتظر نتيجة الدكتور</p>
                                </div>

                                <button onClick={() => navigate("/dashboard")} style={{ padding: "0.9rem 2.5rem", background: "rgba(255,255,255,0.05)", color: "#E8E8F0", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.75rem", cursor: "pointer", fontWeight: 700, fontSize: "1rem" }}>
                                    Return to Dashboard
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
