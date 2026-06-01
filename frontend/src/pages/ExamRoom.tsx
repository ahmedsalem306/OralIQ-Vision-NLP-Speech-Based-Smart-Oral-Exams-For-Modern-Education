import { useState, useRef, useEffect, useCallback } from "react"; // useCallback kept for goToNextExam/startExam/startRecording/stopAndSubmit/forceStop
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Mic, MicOff, CheckCircle2, AlertCircle, Loader2,
    Sparkles, ArrowRight, Camera,
} from "lucide-react";
import Logo from "../components/Logo";
import api from "../lib/api";
import { useI18n } from "../i18n";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "loading" | "info" | "preview" | "recording" | "processing" | "done" | "failed";

interface ExamQuestion {
    id: number;
    text: string;
    exam_id: number | null;
    timeLimit: number;
    model_answer?: string;
}

interface ExamResult {
    transcript: string;
    nlp_score: number;
    speech_score: number;
    facial_score: number;
    overall_score: number;
}

type AlertKey = "gaze_left" | "gaze_right" | "gaze_up" | "gaze_down"
    | "no_face" | "multiple_people" | "phone_detected" | "book_detected";

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExamRoom() {
    const { t, dir } = useI18n();
    const navigate = useNavigate();
    const examToken = localStorage.getItem("pendingExamToken") || "";

    // ── UI state ──────────────────────────────────────────────────────────────
    const [phase, setPhase] = useState<Phase>("loading");
    const [question, setQuestion] = useState<ExamQuestion | null>(null);
    const [studentName, setStudentName] = useState("");
    const [studentId, setStudentId] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [timeLeft, setTimeLeft] = useState(120);
    const [result, setResult] = useState<ExamResult | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    // ── Stable refs ───────────────────────────────────────────────────────────
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const startedAtRef = useRef("");
    const phaseRef = useRef<Phase>("loading");

    // anti-cheat (exact names from original OralIQ repo)
    const antiCheatAlertsRef = useRef<Record<string, number>>({});
    const lastFrameTimeRef = useRef<number>(performance.now());
    const lastAlertTimeRef = useRef<number>(0);

    // live alert popup (single string, 4s throttle — same as original)
    const [liveAlert, setLiveAlert] = useState<string | null>(null);

    // Remaining pending assignments
    const [remainingExams, setRemainingExams] = useState<{ exam_token: string; question_text: string }[]>([]);

    // keep phaseRef in sync
    useEffect(() => { phaseRef.current = phase; }, [phase]);

    // ── Move on to the next assigned exam (if any) ───────────────────────────
    const goToNextExam = useCallback(async () => {
        try {
            const { data } = await api.get("/exams/my-assignments");
            const remaining = (data || []).filter((a: any) => a.exam_token && a.exam_token !== examToken);
            if (remaining.length === 0) {
                navigate("/dashboard");
                return;
            }
            const next = remaining[0];
            localStorage.setItem("pendingExamToken", next.exam_token);
            // Hard reload so state resets cleanly
            window.location.assign("/exam/start");
        } catch {
            navigate("/dashboard");
        }
    }, [examToken, navigate]);

    // ── Connect stream to video element whenever stream changes ───────────────
    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
        }
    }, [stream]);

    // ── Auth + question load ──────────────────────────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { navigate("/login"); return; }

        const buildQ = (q: any): ExamQuestion => ({
            id: q.id,
            text: q.text,
            exam_id: q.exam_id ?? null,
            timeLimit: (q.duration_minutes || 2) * 60,
            model_answer: q.model_answer || "",
        });

        api.get("/users/me")
            .then(async res => {
                setStudentName(res.data.full_name || "");
                // Fetch remaining assignments in parallel (used after submit to chain questions)
                api.get("/exams/my-assignments")
                    .then(r => setRemainingExams(
                        (r.data || []).map((a: any) => ({
                            exam_token: a.exam_token,
                            question_text: a.question_text || "",
                        })).filter((a: any) => a.exam_token)
                    ))
                    .catch(() => {});

                if (!examToken) {
                setErrorMsg(t("exam.noQuestion"));
                    setPhase("info");
                    return;
                }
                try {
                    const { data } = await api.get(`/questions/by-token/${examToken}`);
                    setQuestion(buildQ(data));
                } catch {
                    setErrorMsg(t("exam.noQuestion"));
                }
            })
            .then(() => setPhase("info"))
            .catch((err) => {
                const status = err?.response?.status;
                if (status === 401 || status === 403) {
                    localStorage.removeItem("token");
                    navigate("/login", { replace: true });
                    return;
                }
                setErrorMsg(t("exam.noQuestion"));
                setPhase("info");
            });
    }, []);

    // ── Timer (recording only) ────────────────────────────────────────────────
    useEffect(() => {
        if (phase !== "recording" || timeLeft <= 0) return;
        const id = setInterval(() => {
            setTimeLeft(p => {
                if (p <= 1) { forceStop(); return 0; }
                return p - 1;
            });
        }, 1000);
        return () => clearInterval(id);
    }, [phase, timeLeft]);

    useEffect(() => { if (question) setTimeLeft(question.timeLimit); }, [question]);

    // ── accumulateDistraction: exact copy from original OralIQ repo ─────────
    const accumulateDistraction = (type: string, dt: number) => {
        antiCheatAlertsRef.current[type] = (antiCheatAlertsRef.current[type] || 0) + dt;
        const now = Date.now();
        if (now - lastAlertTimeRef.current > 4000) {
            const labels: Record<string, string> = {
                "gaze_left": "⚠️ نظرت لليسار",
                "gaze_right": "⚠️ نظرت لليمين",
                "gaze_down": "⚠️ نظرت للأسفل",
                "gaze_up": "⚠️ نظرت للأعلى",
                "no_face": "⚠️ الوجه مش ظاهر",
                "multiple_people": "⚠️ أكتر من شخص",
                "phone_detected": "⚠️ تليفون ظاهر",
                "book_detected": "⚠️ ورق/كتاب ظاهر",
            };
            setLiveAlert(labels[type] || `⚠️ ${type}`);
            lastAlertTimeRef.current = now;
            setTimeout(() => setLiveAlert(null), 3000);
        }
    };

    const initFaceMesh = async () => {
        // ── hidden canvas for CLAHE-like preprocessing ────────────────────────
        const procCanvas = document.createElement("canvas");
        procCanvas.width  = 640;
        procCanvas.height = 480;
        const procCtx = procCanvas.getContext("2d")!;

        // Smaller smoothing makes iris movement feel immediate on mobile.
        const SMOOTH_N = 2;
        const bufHH: number[] = [], bufHV: number[] = [];
        const bufPH: number[] = [], bufPV: number[] = [];
        const gazeCenter = { samples: 0, h: 0.5, v: 0.5 };
        const smooth = (buf: number[], val: number) => {
            buf.push(val);
            if (buf.length > SMOOTH_N) buf.shift();
            return buf.reduce((a, b) => a + b, 0) / buf.length;
        };
        const normalizeBetween = (value: number, a: number, b: number) => {
            const min = Math.min(a, b);
            const max = Math.max(a, b);
            return (value - min) / Math.max(max - min, 1e-6);
        };

        const { FaceMesh } = await import("@mediapipe/face_mesh");
        const faceMesh = new FaceMesh({
            locateFile: (file: string) =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });
        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });

        // ObjectDetector is optional — if it fails (no WASM/network), face detection still works
        let objectDetector: any = null;
        try {
            const { ObjectDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
            );
            objectDetector = await ObjectDetector.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath:
                        "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite",
                    delegate: "CPU",
                },
                scoreThreshold: 0.5,
                runningMode: "VIDEO",
            });
        } catch (e) {
            console.warn("[ObjectDetector] load failed, phone/book detection disabled:", e);
        }

        faceMesh.onResults((results: any) => {
            const now = performance.now();
            const dt = (now - lastFrameTimeRef.current) / 1000;
            if (phaseRef.current !== "recording") return;

            if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
                accumulateDistraction("no_face", dt);
                bufHH.length = 0; bufHV.length = 0; bufPH.length = 0; bufPV.length = 0;
                gazeCenter.samples = 0;
                gazeCenter.h = 0.5;
                gazeCenter.v = 0.5;
                return;
            }
            if (results.multiFaceLandmarks.length > 1) accumulateDistraction("multiple_people", dt);

            const lm = results.multiFaceLandmarks[0];

            // ── head pose ─────────────────────────────────────────────────────
            const nose = lm[1], leftEye = lm[33], rightEye = lm[263], mouth = lm[14];
            const rawHH = (nose.x - leftEye.x)  / Math.max(rightEye.x - leftEye.x,  1e-6);
            const rawHV = (nose.y - leftEye.y)  / Math.max(mouth.y    - nose.y,      1e-6);

            // ── dual iris average (left + right) — more robust ────────────────
            // left iris: 468 center, outer 33, inner 133, top 159, bot 145
            // right iris: 473 center, outer 263, inner 362, top 386, bot 374
            const liris = lm[468], lOuter = lm[33],  lInner = lm[133], lTop = lm[159], lBot = lm[145];
            const riris = lm[473], rOuter = lm[263], rInner = lm[362], rTop = lm[386], rBot = lm[374];

            const pHL = normalizeBetween(liris.x, lOuter.x, lInner.x);
            const pVL = normalizeBetween(liris.y, lTop.y, lBot.y);
            const pHR = normalizeBetween(riris.x, rOuter.x, rInner.x);
            const pVR = normalizeBetween(riris.y, rTop.y, rBot.y);

            const rawPH = (pHL + pHR) / 2;
            const rawPV = (pVL + pVR) / 2;

            // ── temporal smoothing ────────────────────────────────────────────
            const hH = smooth(bufHH, rawHH);
            const hV = smooth(bufHV, rawHV);
            const pH = smooth(bufPH, rawPH);
            const pV = smooth(bufPV, rawPV);

            // ── gaze classification ───────────────────────────────────────────
            // Calibrate the first centered frames, then measure iris deviation
            // from that student's own neutral eye position.
            if (gazeCenter.samples < 14 && hH > 0.42 && hH < 0.58 && hV > 0.85 && hV < 1.55) {
                gazeCenter.h = ((gazeCenter.h * gazeCenter.samples) + pH) / (gazeCenter.samples + 1);
                gazeCenter.v = ((gazeCenter.v * gazeCenter.samples) + pV) / (gazeCenter.samples + 1);
                gazeCenter.samples += 1;
            }

            const relH = pH - gazeCenter.h;
            const relV = pV - gazeCenter.v;
            const calibrated = gazeCenter.samples >= 6;

            // Iris drives eye-only movement; strong head pose remains a fallback.
            const irisLeft  = calibrated ? relH > 0.075 : pH > 0.58;
            const irisRight = calibrated ? relH < -0.075 : pH < 0.42;
            const irisDown  = calibrated ? relV > 0.18  : pV > 0.70;
            const irisUp    = calibrated ? relV < -0.18 : pV < 0.28;

            const gazeLeft  = irisLeft  || hH < 0.34;
            const gazeRight = irisRight || hH > 0.66;
            const gazeDown  = irisDown  || hV > 2.15;
            const gazeUp    = irisUp    || hV < 0.42;

            if      (gazeLeft)  accumulateDistraction("gaze_left",  dt);
            else if (gazeRight) accumulateDistraction("gaze_right", dt);
            if      (gazeDown)  accumulateDistraction("gaze_down",  dt);
            else if (gazeUp)    accumulateDistraction("gaze_up",    dt);

            // ── canvas overlay ────────────────────────────────────────────────
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    const W = canvas.width, H = canvas.height;
                    ctx.clearRect(0, 0, W, H);
                    const totalAcc = Object.values(antiCheatAlertsRef.current).reduce((a, b) => a + b, 0);
                    const color = totalAcc > 3 ? "#e05555" : totalAcc > 0.5 ? "#e8c97a" : "#5ec269";
                    ctx.fillStyle = color;
                    ctx.globalAlpha = 0.65;
                    for (const p of lm) {
                        ctx.beginPath();
                        ctx.arc(p.x * W, p.y * H, 1.2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.globalAlpha = 1;
                    [468, 473].forEach((i: number) => {
                        const p = lm[i]; if (!p) return;
                        ctx.beginPath(); ctx.arc(p.x * W, p.y * H, 5, 0, Math.PI * 2);
                        ctx.fillStyle = "#fff"; ctx.fill();
                        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
                    });
                    [
                        { iris: liris, outer: lOuter, inner: lInner, top: lTop, bot: lBot },
                        { iris: riris, outer: rOuter, inner: rInner, top: rTop, bot: rBot },
                    ].forEach(({ iris, outer, inner, top, bot }) => {
                        const minX = Math.min(outer.x, inner.x) * W;
                        const maxX = Math.max(outer.x, inner.x) * W;
                        const minY = Math.min(top.y, bot.y) * H;
                        const maxY = Math.max(top.y, bot.y) * H;
                        const neutralX = minX + gazeCenter.h * (maxX - minX);
                        const neutralY = minY + gazeCenter.v * (maxY - minY);
                        const irisX = iris.x * W;
                        const irisY = iris.y * H;
                        const active = Math.abs(irisX - neutralX) > (maxX - minX) * 0.075;

                        ctx.strokeStyle = active ? "#ff4d5d" : "#5ec269";
                        ctx.lineWidth = 2.5;
                        ctx.beginPath();
                        ctx.moveTo(neutralX, neutralY);
                        ctx.lineTo(irisX, irisY);
                        ctx.stroke();

                        ctx.beginPath();
                        ctx.arc(irisX, irisY, 6.5, 0, Math.PI * 2);
                        ctx.fillStyle = active ? "#ff4d5d" : "#ffffff";
                        ctx.fill();
                        ctx.strokeStyle = "#0a0a0a";
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                    });
                }
            }
        });

        const runDetection = async () => {
            try {
                const video = videoRef.current;
                if (video && video.readyState >= 2) {
                    const now = performance.now();

                    // ── CLAHE-like preprocessing: boost contrast/brightness ────
                    procCanvas.width  = video.videoWidth  || 640;
                    procCanvas.height = video.videoHeight || 480;
                    procCtx.filter = "contrast(1.25) brightness(1.05)";
                    procCtx.drawImage(video, 0, 0);
                    procCtx.filter = "none";

                    await faceMesh.send({ image: procCanvas });

                    if (phaseRef.current === "recording" && objectDetector) {
                        const detections = objectDetector.detectForVideo(video, now);
                        for (const detection of detections.detections) {
                            const label = (detection.categories[0]?.categoryName || "").toLowerCase();
                            const dt2 = (now - lastFrameTimeRef.current) / 1000;
                            if (["cell phone", "mobile phone", "phone"].includes(label)) {
                                accumulateDistraction("phone_detected", dt2);
                            } else if (["book", "notebook"].includes(label)) {
                                accumulateDistraction("book_detected", dt2);
                            }
                        }
                    }
                    lastFrameTimeRef.current = now;
                }
            } catch (e) {
                console.warn("[runDetection] frame error:", e);
            }
            requestAnimationFrame(runDetection);
        };
        requestAnimationFrame(runDetection);
    };

    // ── START EXAM: info → preview ────────────────────────────────────────────
    const startExam = useCallback(async () => {
        if (!studentName.trim() || !studentId.trim()) {
            setErrorMsg(t("exam.needData"));
            return;
        }
        if (!question) { setErrorMsg(t("exam.noQuestion")); return; }
        setErrorMsg("");

        let s: MediaStream;
        try {
            try {
                s = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: "user",
                        width: { ideal: 960 },
                        height: { ideal: 960 },
                    },
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                });
            } catch {
                s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            }
        } catch {
            setErrorMsg(t("exam.permission"));
            return;
        }

        setStream(s);
        if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().catch(() => {});
        }
        setPhase("preview");

        // Reset anti-cheat counters
        antiCheatAlertsRef.current = {};
        lastFrameTimeRef.current = performance.now();
        lastAlertTimeRef.current = 0;

        // Start FaceMesh + ObjectDetector (exact original pattern: not awaited)
        initFaceMesh();
    }, [studentName, studentId, question]);

    // ── START RECORDING: preview → recording ─────────────────────────────────
    const startRecording = useCallback(() => {
        if (!stream) return;
        setErrorMsg("");
        startedAtRef.current = new Date().toISOString();
        chunksRef.current = [];

        const audioOnly = new MediaStream(stream.getAudioTracks());
        const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus" : "audio/webm";
        const rec = new MediaRecorder(audioOnly, { mimeType: mime });
        rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        rec.start(100);
        recorderRef.current = rec;
        setPhase("recording");
    }, [stream]);

    // ── STOP + SUBMIT ─────────────────────────────────────────────────────────
    const stopAndSubmit = useCallback(() => {
        const rec = recorderRef.current;
        if (!rec || rec.state !== "recording") return;

        rec.onstop = async () => {
            // Stop camera (RAF loop stops itself when video disappears)
            stream?.getTracks().forEach(t => t.stop());
            setStream(null);

            const blob = new Blob(chunksRef.current, { type: "audio/webm" });
            if (blob.size < 500) {
                setErrorMsg("التسجيل قصير جداً — اضغط التسجيل وتكلم أكتر.");
                setPhase("preview");
                return;
            }
            setPhase("processing");
            await submitToBackend(blob);
        };
        rec.stop();
    }, [stream]);

    const forceStop = useCallback(() => {
        if (recorderRef.current?.state === "recording") stopAndSubmit();
    }, [stopAndSubmit]);

    // ── Submit to backend ─────────────────────────────────────────────────────
    // Submits the answer; only marks the exam as "done" on a real success
    // (response carries an id). Anything else -> "failed" with the actual error.
    const submitToBackend = async (blob: Blob) => {
        if (!question?.id) {
            setErrorMsg("مفيش سؤال محمّل — تأكد من الرابط.");
            setPhase("failed");
            return;
        }
        const fd = new FormData();
        fd.append("question_id", String(question.id));
        fd.append("student_name", studentName);
        fd.append("student_number", studentId);
        fd.append("audio", blob, "answer.webm");
        fd.append("anti_cheat_alerts", JSON.stringify(antiCheatAlertsRef.current));
        fd.append("started_at", startedAtRef.current);
        fd.append("finished_at", new Date().toISOString());

        try {
            const res = await api.post("/exams/submit", fd, {
                headers: { "Content-Type": "multipart/form-data" },
                timeout: 300_000, // 5 minutes — Whisper + SBERT can be slow on first call
            });
            if (res.data?.id) {
                setResult({
                    transcript: res.data.transcript || "",
                    nlp_score: res.data.nlp_score ?? 0,
                    speech_score: res.data.speech_score ?? 0,
                    facial_score: res.data.facial_score ?? 100,
                    overall_score: res.data.overall_score ?? 0,
                });
                localStorage.removeItem("pendingExamToken");
                setPhase("done");
            } else {
                setErrorMsg("السيرفر رجع رد غير متوقع.");
                setPhase("failed");
            }
        } catch (e: any) {
            const detail = e?.response?.data?.detail;
            const status = e?.response?.status;
            const msg = (typeof detail === "string" ? detail : null)
                || (status ? `خطأ ${status} من السيرفر` : null)
                || e?.message
                || "تعذّر الاتصال بالسيرفر";
            console.error("[ExamRoom] submit error:", status, e?.response?.data, e);
            setErrorMsg(msg);
            setPhase("failed");
        }
    };

    // ── Cleanup on unmount ────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            stream?.getTracks().forEach(t => t.stop());
        };
    }, [stream]);

    // ─── Helpers ──────────────────────────────────────────────────────────────
    const scoreColor = (s: number) => s >= 75 ? "#5ec269" : s >= 50 ? "#e0a030" : "#e05555";
    const scoreLabel = (s: number) => s >= 85 ? "ممتاز" : s >= 65 ? "جيد" : s >= 45 ? "مقبول" : "ضعيف";
    const fmt = (s: number) => String(Math.floor(s)).padStart(2, "0");
    const alertLabel = (k: AlertKey): string => ({
        gaze_left: "نظر يسار",
        gaze_right: "نظر يمين",
        gaze_up: "نظر فوق",
        gaze_down: "نظر تحت",
        no_face: "الوجه مش ظاهر",
        multiple_people: "أكثر من شخص",
        phone_detected: "📱 موبايل",
        book_detected: "📖 كتاب/ورق",
    }[k]);

    // ═════════════════════════════════════════════════════════════════════════
    //  UI
    // ═════════════════════════════════════════════════════════════════════════

    if (phase === "loading") return (
        <div style={C.center}>
            <Loader2 size={36} color="#cfa355" style={{ animation: "spin 1s linear infinite" }} />
        </div>
    );

    if (phase === "info") return (
        <div style={{ ...C.center, padding: "2rem" }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                style={{ width: "100%", maxWidth: 460, background: "#141414", borderRadius: "1.5rem", border: "1px solid rgba(207,163,85,0.15)", padding: "2.5rem" }}>
                <Logo size={28} showText style={{ marginBottom: "1.5rem" }} />

                <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.3rem 0.85rem", borderRadius: "999px", background: "rgba(207,163,85,0.08)", border: "1px solid rgba(207,163,85,0.18)", marginBottom: "1rem" }}>
                    <Sparkles size={12} color="#cfa355" />
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#cfa355", letterSpacing: "0.05em" }}>{t("exam.badge")}</span>
                </div>

                <h2 style={{ color: "#e5e5e0", fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.4rem" }}>{t("exam.welcome")}</h2>
                <p style={{ color: "#8b8b73", fontSize: "0.875rem", marginBottom: "1.75rem", lineHeight: 1.7 }} dir={dir}>
                    {t("exam.info")}
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                    <input value={studentName} onChange={e => setStudentName(e.target.value)}
                        placeholder={t("exam.namePlaceholder")} dir={dir} style={C.input} />
                    <input value={studentId} onChange={e => setStudentId(e.target.value)}
                        placeholder={t("exam.idPlaceholder")} dir={dir} style={C.input} />

                    {errorMsg && (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#e05555", fontSize: "0.85rem" }} dir={dir}>
                            <AlertCircle size={16} /> {errorMsg}
                        </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "0.875rem", background: "rgba(207,163,85,0.04)", border: "1px solid rgba(207,163,85,0.08)", borderRadius: "0.75rem" }} dir={dir}>
                        {[t("exam.ruleMic"), t("exam.ruleCamera"), t("exam.ruleNoPhone")].map(r => (
                            <div key={r} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.78rem", color: "#8b8b73" }}>
                                <CheckCircle2 size={13} color="#cfa355" /> {r}
                            </div>
                        ))}
                    </div>

                    <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                        onClick={startExam}
                        style={{ padding: "1rem", background: "linear-gradient(135deg, #cfa355, #e0b86b)", border: "none", borderRadius: "0.75rem", color: "#0a0a0a", fontWeight: 800, fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
                        <ArrowRight size={18} /> {t("exam.start")}
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );

    if (phase === "processing") return (
        <div style={C.center}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: "center", padding: "3rem", maxWidth: 480 }}>
                <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto 2rem" }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                        style={{ position: "absolute", inset: 0, border: "3px solid rgba(207,163,85,0.15)", borderTopColor: "#cfa355", borderRadius: "50%" }} />
                    <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                        style={{ position: "absolute", inset: 16, background: "linear-gradient(135deg, #cfa355, #e8c97a)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Sparkles size={22} color="#0a0a0a" />
                    </motion.div>
                </div>
                <h2 style={{ color: "#e5e5e0", fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.75rem" }} dir="rtl">
                    {t("exam.processing")}
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", textAlign: "right", padding: "1rem", background: "#141414", border: "1px solid rgba(207,163,85,0.1)", borderRadius: "0.875rem" }}>
                    {[
                        dir === "rtl" ? "تحويل الصوت إلى نص (Whisper)..." : "Transcribing speech (Whisper)...",
                        dir === "rtl" ? "تحليل محتوى الإجابة (SBERT/NLP)..." : "Analyzing answer content (SBERT/NLP)...",
                        dir === "rtl" ? "تقييم نزاهة الامتحان (Vision AI)..." : "Checking exam integrity (Vision AI)...",
                        dir === "rtl" ? "حساب الدرجة النهائية..." : "Calculating final score...",
                    ].map((step, i) => (
                        <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.5 }}
                            style={{ display: "flex", alignItems: "center", gap: "0.625rem", fontSize: "0.82rem", color: "#cfa355" }} dir={dir}>
                            <Loader2 size={12} style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
                            {step}
                        </motion.div>
                    ))}
                </div>
                <p style={{ color: "#3a3a2a", fontSize: "0.7rem", marginTop: "1rem" }} dir={dir}>
                    {dir === "rtl" ? "في المرة الأولى قد يأخذ دقيقة لتحميل نموذج Whisper" : "The first run may take a minute while Whisper loads."}
                </p>
            </motion.div>
        </div>
    );

    if (phase === "failed") return (
        <div style={C.center}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                style={{ textAlign: "center", padding: "3rem", maxWidth: 440, background: "#141414", borderRadius: "1.5rem", border: "1px solid rgba(224,85,85,0.25)" }}>
                <AlertCircle size={48} color="#e05555" style={{ margin: "0 auto 1rem" }} />
                <h2 style={{ color: "#e5e5e0", fontSize: "1.3rem", fontWeight: 800, marginBottom: "0.5rem" }} dir={dir}>
                    {t("exam.failed")}
                </h2>
                <p style={{ color: "#8b8b73", marginBottom: errorMsg ? "0.5rem" : "1.5rem" }} dir={dir}>
                    {dir === "rtl" ? "مشكلة في الاتصال بالسيرفر، الإجابة لم ترسل." : "Server connection problem. The answer was not submitted."}
                </p>
                {errorMsg && (
                    <p style={{ color: "#e05555", fontSize: "0.75rem", background: "rgba(224,85,85,0.1)", padding: "0.75rem", borderRadius: "0.5rem", marginBottom: "1.5rem", wordBreak: "break-all", textAlign: "left" }}>
                        {errorMsg}
                    </p>
                )}
                <button onClick={() => navigate("/dashboard")}
                    style={{ padding: "0.85rem 2rem", background: "linear-gradient(135deg, #cfa355, #e0b86b)", border: "none", borderRadius: "0.75rem", color: "#0a0a0a", cursor: "pointer", fontWeight: 800, fontSize: "0.95rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                    {t("exam.backDashboard")} <ArrowRight size={16} />
                </button>
            </motion.div>
        </div>
    );

    if (phase === "done") return (
        <div style={{ ...C.center, padding: "1.5rem" }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 180, damping: 20 }}
                style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", gap: "1rem" }}>

                {/* Header */}
                <div style={{ textAlign: "center" }}>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
                        style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(94,194,105,0.1)", border: "2px solid rgba(94,194,105,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                        <CheckCircle2 size={40} color="#5ec269" />
                    </motion.div>
                    <h2 style={{ color: "#e5e5e0", fontSize: "1.5rem", fontWeight: 800 }} dir={dir}>{t("exam.done")}</h2>
                    <p style={{ color: "#8b8b73", fontSize: "0.85rem", marginTop: "0.25rem" }} dir={dir}>
                        {dir === "rtl" ? "هتلاقي نتيجتك النهائية في درجاتي لما الدكتور يعرضها" : "Your final result appears in My Grades once the lecturer publishes it."}
                    </p>
                </div>

                {result && (
                  <>
                    {/* Overall score */}
                    <div style={{ background: "#141414", border: `2px solid ${scoreColor(result.overall_score)}44`, borderRadius: "1.25rem", padding: "1.5rem", textAlign: "center" }}>
                        <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.15em", color: "#5a5a4a", marginBottom: "0.5rem" }}>
                            {t("exam.finalScore")}
                        </p>
                        <div style={{ fontSize: "3.5rem", fontWeight: 900, color: scoreColor(result.overall_score), fontFamily: "'Orbitron', monospace", lineHeight: 1 }}>
                            {Math.round(result.overall_score)}
                        </div>
                        <div style={{ color: scoreColor(result.overall_score), fontWeight: 700, marginTop: "0.25rem" }}>
                            {scoreLabel(result.overall_score)}
                        </div>
                        <p style={{ fontSize: "0.65rem", color: "#3a3a2a", marginTop: "0.5rem" }} dir="rtl">
                            {dir === "rtl" ? "80% محتوى + 10% طلاقة + 10% نزاهة" : "80% content + 10% fluency + 10% integrity"}
                        </p>
                    </div>

                    {/* Score breakdown */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                        {[
                            { label: t("exam.content"), value: result.nlp_score, note: "NLP/SBERT" },
                            { label: t("exam.fluency"), value: result.speech_score, note: "Whisper" },
                            { label: t("exam.integrity"), value: result.facial_score, note: "Vision AI" },
                        ].map(({ label, value, note }) => (
                            <div key={label} style={{ background: "#141414", border: `1px solid ${scoreColor(value)}33`, borderRadius: "1rem", padding: "1rem", textAlign: "center" }}>
                                <p style={{ fontSize: "0.6rem", color: "#5a5a4a", marginBottom: "0.4rem" }}>{label}</p>
                                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: scoreColor(value) }}>
                                    {Math.round(value)}
                                </div>
                                <p style={{ fontSize: "0.55rem", color: "#3a3a2a", marginTop: "0.2rem" }}>{note}</p>
                            </div>
                        ))}
                    </div>
                  </>
                )}

                {/* Transcript */}
                {result?.transcript && (
                    <div style={{ background: "#141414", border: "1px solid rgba(207,163,85,0.1)", borderRadius: "1.25rem", padding: "1.25rem" }}>
                        <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", color: "#5a5a4a", marginBottom: "0.75rem" }} dir="rtl">
                            {dir === "rtl" ? "إجابتك - نص Whisper" : "Your Answer - Whisper transcript"}
                        </p>
                        <p style={{ color: "#d0d0c0", fontSize: "0.9rem", lineHeight: 1.8 }} dir={dir}>
                            {result.transcript}
                        </p>
                    </div>
                )}

                {/* Next-exam CTA: only shows if there are MORE pending assignments
                    for this student (lecturer assigned multiple questions). */}
                {remainingExams.filter(r => r.exam_token !== examToken).length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                        <button onClick={goToNextExam}
                            style={{ padding: "1rem 2rem", background: "linear-gradient(135deg, #1a6e1a, #2a8a2a)", border: "none", borderRadius: "0.75rem", color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                            dir="rtl">
                            <ArrowRight size={18} style={{ transform: "scaleX(-1)" }} /> {dir === "rtl" ? `السؤال التالي (${remainingExams.filter(r => r.exam_token !== examToken).length} متبقي)` : `Next question (${remainingExams.filter(r => r.exam_token !== examToken).length} left)`}
                        </button>
                        <button onClick={() => navigate("/dashboard")}
                            style={{ padding: "0.7rem 2rem", background: "transparent", border: "1px solid rgba(207,163,85,0.3)", borderRadius: "0.75rem", color: "#cfa355", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                            {t("exam.backDashboard")}
                        </button>
                    </div>
                ) : (
                    <button onClick={() => navigate("/dashboard")}
                        style={{ padding: "0.85rem 2rem", background: "linear-gradient(135deg, #cfa355, #e0b86b)", border: "none", borderRadius: "0.75rem", color: "#0a0a0a", cursor: "pointer", fontWeight: 800, fontSize: "0.95rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                        {t("exam.backDashboard")} <ArrowRight size={16} />
                    </button>
                )}
            </motion.div>
        </div>
    );

    // ═══════════════════════════════════════════════════════════════════════════
    //  Main exam screen: preview + recording
    //  (video element is always mounted here so the ref is always valid)
    // ═══════════════════════════════════════════════════════════════════════════
    return (
        <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", flexDirection: "column" }}>

            {/* Header */}
            <header className="oiq-exam-header" style={{ height: 60, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2rem", background: "#141414", borderBottom: "1px solid rgba(207,163,85,0.1)" }}>
                <Logo size={22} showText />

                {/* Timer — only in recording */}
                <AnimatePresence>
                    {phase === "recording" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: timeLeft < 30 ? "#e05555" : "#e8c97a", fontWeight: 800, fontFamily: "monospace", fontSize: "1.1rem" }}>
                            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }}
                                style={{ width: 8, height: 8, borderRadius: "50%", background: timeLeft < 30 ? "#e05555" : "#5ec269" }} />
                            {fmt(timeLeft / 60)}:{fmt(timeLeft % 60)}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* MediaPipe status — preview only */}
                {phase === "preview" && (
                    <span style={{ fontSize: "0.72rem", color: "#5ec269" }}>✅ المراقبة شغّالة</span>
                )}

                <span style={{ color: "#8b8b73", fontSize: "0.8rem" }}>{studentName}</span>
            </header>

            {/* Body — centered layout: small square camera + question (recording only) + controls */}
            <div className="oiq-exam-body" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem", gap: "1.5rem", overflow: "auto" }}>

                {/* Camera — small square in a framed card; red glow if any violation is active */}
                <div style={{
                    position: "relative", width: "min(440px, calc(100vw - 2rem))", aspectRatio: "1 / 1", borderRadius: "1.25rem",
                    overflow: "hidden", background: "#000",
                    border: liveAlert ? "2px solid rgba(224,85,85,0.85)" : "2px solid rgba(207,163,85,0.25)",
                    boxShadow: liveAlert
                        ? "0 0 40px rgba(224,85,85,0.35)"
                        : "0 0 30px rgba(207,163,85,0.08)",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                }}>
                    {/* video always rendered — srcObject set via useEffect([stream]) */}
                    <video ref={videoRef} muted playsInline
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: stream ? "block" : "none", transform: "scaleX(-1)" }} />

                    {/* Landmark overlay — drawn by drawLandmarks() each MediaPipe frame.
                        Mirrored (scaleX(-1)) to align with the mirrored video. */}
                    <canvas
                        ref={canvasRef}
                        width={440}
                        height={440}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", transform: "scaleX(-1)" }}
                    />

                    {!stream && (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Camera size={42} color="#2a2a2a" />
                        </div>
                    )}

                    {/* Student name overlay */}
                    <div style={{ position: "absolute", bottom: "0.6rem", left: "0.6rem", background: "rgba(0,0,0,0.65)", color: "#cfa355", fontSize: "0.65rem", padding: "0.2rem 0.55rem", borderRadius: "0.25rem", fontWeight: 700 }}>
                        {studentName}
                    </div>

                    {/* REC badge */}
                    {phase === "recording" && (
                        <div style={{ position: "absolute", top: "0.6rem", right: "0.6rem", display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.25rem 0.6rem", background: "rgba(224,85,85,0.9)", borderRadius: "999px" }}>
                            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}
                                style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />
                            <span style={{ color: "#fff", fontSize: "0.68rem", fontWeight: 800 }}>REC</span>
                        </div>
                    )}

                    {/* Live alert popup — same style as original repo */}
                    <AnimatePresence>
                        {liveAlert && (
                            <motion.div
                                initial={{ y: 20, opacity: 0, x: "-50%" }}
                                animate={{ y: 0, opacity: 1, x: "-50%" }}
                                exit={{ y: 20, opacity: 0, x: "-50%" }}
                                style={{ position: "absolute", bottom: "1.5rem", left: "50%", background: "rgba(224,85,85,0.92)", color: "#fff", padding: "0.6rem 1.2rem", borderRadius: "0.75rem", fontWeight: 700, fontSize: "0.82rem", backdropFilter: "blur(8px)", whiteSpace: "nowrap" }}>
                                {liveAlert}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Accumulated cheat seconds debug strip */}
                    <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.7rem", fontFamily: "monospace", color: "#8b8b73", flexWrap: "wrap", justifyContent: "center" }}>
                    {["gaze_left","gaze_right","gaze_up","gaze_down","no_face","phone_detected","book_detected"].map(k => {
                        const v = antiCheatAlertsRef.current[k] || 0;
                        return v > 0 ? (
                            <span key={k} style={{ padding: "0.2rem 0.55rem", background: "#141414", borderRadius: "0.35rem" }}>
                                {k.replace("gaze_","")}:<span style={{ color: v > 2 ? "#e05555" : "#e8c97a" }}>{v.toFixed(1)}s</span>
                            </span>
                        ) : null;
                    })}
                </div>

                {/* Question — ONLY visible while actively recording */}
                {phase === "recording" && question && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                        style={{ width: "100%", maxWidth: 600, background: "rgba(207,163,85,0.06)", border: "1px solid rgba(207,163,85,0.2)", borderRadius: "1rem", padding: "1.25rem" }}
                        dir="rtl">
                        <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#cfa355", marginBottom: "0.5rem" }}>
                            {t("exam.question")}
                        </p>
                        <p style={{ fontSize: "1rem", color: "#e5e5e0", lineHeight: 1.8, fontWeight: 500 }}>
                            {question.text}
                        </p>
                    </motion.div>
                )}

                {/* Preview hint — only when ready to start recording */}
                {phase === "preview" && (
                    <p style={{ color: "#8b8b73", fontSize: "0.85rem", maxWidth: 480, textAlign: "center", lineHeight: 1.7 }} dir={dir}>
                        {t("exam.previewHint")}
                    </p>
                )}

                {/* Error */}
                {errorMsg && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#e05555", fontSize: "0.8rem", background: "rgba(224,85,85,0.1)", padding: "0.75rem 1rem", borderRadius: "0.5rem" }}
                        dir={dir}>
                        <AlertCircle size={14} /> {errorMsg}
                    </motion.div>
                )}

                {/* Controls */}
                <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {phase === "preview" && (
                        <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            onClick={startRecording}
                            style={{ width: "100%", padding: "1.1rem", background: "linear-gradient(135deg, #1a6e1a, #145514)", border: "none", borderRadius: "1rem", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", fontSize: "1rem", fontWeight: 700, boxShadow: "0 0 20px rgba(26,110,26,0.4)" }}>
                            <Mic size={22} /> {t("exam.start")}
                        </motion.button>
                    )}

                    {phase === "recording" && (
                        <>
                            <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                onClick={stopAndSubmit}
                                style={{ width: "100%", padding: "1.1rem", background: "linear-gradient(135deg, #e05555, #c04444)", border: "none", borderRadius: "1rem", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", fontSize: "1rem", fontWeight: 700, boxShadow: "0 0 24px rgba(224,85,85,0.5)" }}>
                                <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
                                    <MicOff size={22} />
                                </motion.div>
                                {t("exam.stop")}
                            </motion.button>
                            <p style={{ textAlign: "center", fontSize: "0.72rem", color: "#e05555" }} dir={dir}>
                                {t("exam.recording")}
                            </p>
                        </>
                    )}
                </div>

                {/* Rules */}
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
                    {[t("exam.ruleCamera"), t("exam.ruleMic"), t("exam.ruleNoPhone")].map(r => (
                        <span key={r} style={{ fontSize: "0.65rem", color: "#8b8b73", background: "rgba(255,255,255,0.04)", padding: "0.25rem 0.6rem", borderRadius: "0.35rem" }}>
                            {r}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Style constants ──────────────────────────────────────────────────────────

const C = {
    center: {
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    } as React.CSSProperties,

    input: {
        padding: "0.875rem 1rem",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(207,163,85,0.18)",
        borderRadius: "0.75rem",
        color: "#e5e5e0",
        fontSize: "0.95rem",
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "inherit",
    } as React.CSSProperties,
};
