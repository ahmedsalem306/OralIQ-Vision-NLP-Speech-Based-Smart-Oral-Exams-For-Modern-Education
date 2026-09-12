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
import { captureFaceDescriptor, faceSimilarityPercent, aggregateFaceScores, loadFaceModels } from "../lib/faceBiometrics";
import { estimatePupilFromPixels, type PupilHit } from "../lib/pupilGaze";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "loading" | "voice_required" | "info" | "preview" | "recording" | "processing" | "done" | "failed";

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
    | "no_face" | "multiple_people" | "phone_detected" | "book_detected" | "face_mismatch";

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExamRoom() {
    const { t, dir } = useI18n();
    const navigate = useNavigate();
    const examToken = localStorage.getItem("pendingExamToken") || "";

    // ── UI state ──────────────────────────────────────────────────────────────
    const [phase, setPhase] = useState<Phase>("loading");
    const [question, setQuestion] = useState<ExamQuestion | null>(null);
    const [allQuestions, setAllQuestions] = useState<ExamQuestion[]>([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
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
    const detectionGenRef = useRef(0);
    const faceMeshWarmRef = useRef<any>(null);
    const faceMeshWarmPromiseRef = useRef<Promise<void> | null>(null);
    const objectDetectorRef = useRef<any>(null);
    const storedFaceEmbRef = useRef<number[] | null>(null);
    const faceScoresRef = useRef<number[]>([]);

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

        const loadExam = async () => {
            try {
                const res = await api.get("/users/me");
                setStudentName(res.data.full_name || "");

                api.get("/exams/my-assignments")
                    .then(r => setRemainingExams(
                        (r.data || []).map((a: any) => ({
                            exam_token: a.exam_token,
                            question_text: a.question_text || "",
                        })).filter((a: any) => a.exam_token)
                    ))
                    .catch(() => {});

                try {
                    const vr = await api.get("/voice/status");
                    if (!vr.data.biometrics_complete) {
                        setPhase("voice_required");
                        return;
                    }
                    loadFaceModels().catch(() => {});
                    api.get("/face/descriptor")
                        .then(r => { storedFaceEmbRef.current = r.data.embedding; })
                        .catch(() => {});
                } catch {
                    setPhase("voice_required");
                    return;
                }

                if (!examToken) {
                    setErrorMsg(t("exam.noQuestion"));
                    setPhase("info");
                    return;
                }

                try {
                    const { data: groupData } = await api.get(`/questions/by-group/${examToken}`).catch(() => ({ data: null }));
                    if (groupData && Array.isArray(groupData) && groupData.length > 0) {
                        const built = groupData.map(buildQ);
                        setAllQuestions(built);
                        setQuestion(built[0]);
                        setCurrentQIndex(0);
                    } else {
                        const { data } = await api.get(`/questions/by-token/${examToken}`);
                        const built = buildQ(data);
                        setAllQuestions([built]);
                        setQuestion(built);
                        setCurrentQIndex(0);
                    }
                } catch {
                    setErrorMsg(t("exam.noQuestion"));
                }

                setPhase("info");
            } catch (err: any) {
                const status = err?.response?.status;
                if (status === 401 || status === 403) {
                    localStorage.removeItem("token");
                    navigate("/login", { replace: true });
                    return;
                }
                setErrorMsg(t("exam.noQuestion"));
                setPhase("info");
            }
        };

        loadExam();
    }, []);

    // Preload FaceMesh WASM while student is on the info screen — landmarks ready instantly
    const warmFaceMesh = useCallback(async () => {
        if (faceMeshWarmRef.current) return;
        const { FaceMesh } = await import("@mediapipe/face_mesh");
        const fm = new FaceMesh({
            locateFile: (file: string) =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });
        fm.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });
        const warm = document.createElement("canvas");
        warm.width = 64;
        warm.height = 64;
        warm.getContext("2d")?.fillRect(0, 0, 64, 64);
        await fm.send({ image: warm });
        faceMeshWarmRef.current = fm;
    }, []);

    useEffect(() => {
        if (!faceMeshWarmPromiseRef.current) {
            faceMeshWarmPromiseRef.current = warmFaceMesh().catch(() => {
                faceMeshWarmPromiseRef.current = null;
            });
        }
    }, [warmFaceMesh]);

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
                "face_mismatch": "⚠️ Face ID — شخص مختلف",
            };
            setLiveAlert(labels[type] || `⚠️ ${type}`);
            lastAlertTimeRef.current = now;
            setTimeout(() => setLiveAlert(null), 3000);
        }
    };

    const initFaceMesh = async () => {
        const gen = ++detectionGenRef.current;

        // Use pre-warmed instance if available (WASM already loaded)
        try {
            if (faceMeshWarmPromiseRef.current) await faceMeshWarmPromiseRef.current;
        } catch { /* fall through to fresh create */ }

        const procCanvas = document.createElement("canvas");
        procCanvas.width  = 640;
        procCanvas.height = 480;
        const procCtx = procCanvas.getContext("2d")!;

        const SMOOTH_N = 3;
        const bufHH: number[] = [], bufHV: number[] = [];
        const bufPH: number[] = [], bufPV: number[] = [];
        const gazeCenter = { samples: 0, h: 0.5, v: 0.5 };
        // Sustained look-away — like a human proctor ignoring blinks/glances
        const gazeHold = { left: 0, right: 0, up: 0, down: 0 };
        const HOLD_SEC = 0.7;
        let framePixels: ImageData | null = null;
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

        let faceMesh = faceMeshWarmRef.current;
        if (!faceMesh) {
            const { FaceMesh } = await import("@mediapipe/face_mesh");
            faceMesh = new FaceMesh({
                locateFile: (file: string) =>
                    `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
            });
            faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5,
            });
            faceMeshWarmRef.current = faceMesh;
        }

        // Phone/book detector — background only, NEVER blocks landmarks
        if (!objectDetectorRef.current) {
            (async () => {
                try {
                    const { ObjectDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
                    const vision = await FilesetResolver.forVisionTasks(
                        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
                    );
                    objectDetectorRef.current = await ObjectDetector.createFromOptions(vision, {
                        baseOptions: {
                            modelAssetPath:
                                "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite",
                            delegate: "CPU",
                        },
                        scoreThreshold: 0.5,
                        runningMode: "VIDEO",
                    });
                } catch (e) {
                    console.warn("[ObjectDetector] load failed:", e);
                }
            })();
        }

        faceMesh.onResults((results: any) => {
            const phase = phaseRef.current;
            if (phase !== "recording") return;

            const now = performance.now();
            // Cap delta — prevents preview idle time from inflating alerts on first frame
            const dt = Math.min(Math.max((now - lastFrameTimeRef.current) / 1000, 0), 0.12);

            if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
                gazeHold.left = gazeHold.right = gazeHold.up = gazeHold.down = 0;
                if (dt >= 0.08) accumulateDistraction("no_face", dt * 0.5);
                bufHH.length = 0; bufHV.length = 0; bufPH.length = 0; bufPV.length = 0;
                const canvas = canvasRef.current;
                if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
                return;
            }
            if (results.multiFaceLandmarks.length > 1) {
                accumulateDistraction("multiple_people", dt);
            }

            const lm = results.multiFaceLandmarks[0];

            const nose = lm[1], leftEye = lm[33], rightEye = lm[263], mouth = lm[14];
            const rawHH = (nose.x - leftEye.x)  / Math.max(rightEye.x - leftEye.x,  1e-6);
            const rawHV = (nose.y - leftEye.y)  / Math.max(mouth.y    - nose.y,      1e-6);

            const lOuter = lm[33],  lInner = lm[133], lTop = lm[159], lBot = lm[145];
            const rOuter = lm[263], rInner = lm[362], rTop = lm[386], rBot = lm[374];
            const lirisMp = lm[468], ririsMp = lm[473];

            // Pixel pupil (tracks real up/down) — fallback to MediaPipe iris
            let pupilL: PupilHit | null = null;
            let pupilR: PupilHit | null = null;
            if (framePixels) {
                pupilL = estimatePupilFromPixels(framePixels, lOuter, lInner, lTop, lBot);
                pupilR = estimatePupilFromPixels(framePixels, rOuter, rInner, rTop, rBot);
            }
            if (!pupilL && lirisMp) {
                pupilL = {
                    h: normalizeBetween(lirisMp.x, lOuter.x, lInner.x),
                    v: normalizeBetween(lirisMp.y, lTop.y, lBot.y),
                    x: lirisMp.x,
                    y: lirisMp.y,
                };
            }
            if (!pupilR && ririsMp) {
                pupilR = {
                    h: normalizeBetween(ririsMp.x, rOuter.x, rInner.x),
                    v: normalizeBetween(ririsMp.y, rTop.y, rBot.y),
                    x: ririsMp.x,
                    y: ririsMp.y,
                };
            }
            if (!pupilL && !pupilR) return;

            // Per-eye gaze relative to eye corners (nose↔temple) — not raw image X
            const hParts: number[] = [];
            const vParts: number[] = [];
            if (pupilL) {
                hParts.push(normalizeBetween(pupilL.x, lOuter.x, lInner.x));
                vParts.push(normalizeBetween(pupilL.y, lTop.y, lBot.y));
            }
            if (pupilR) {
                hParts.push(normalizeBetween(pupilR.x, rOuter.x, rInner.x));
                vParts.push(normalizeBetween(pupilR.y, rTop.y, rBot.y));
            }
            const rawPH = hParts.reduce((a, b) => a + b, 0) / hParts.length;
            const rawPV = vParts.reduce((a, b) => a + b, 0) / vParts.length;

            const hH = smooth(bufHH, rawHH);
            const hV = smooth(bufHV, rawHV);
            const pH = smooth(bufPH, rawPH);
            const pV = smooth(bufPV, rawPV);

            // Calibrate while looking roughly forward (first ~1s)
            if (gazeCenter.samples < 24 && hH > 0.32 && hH < 0.68 && hV > 0.55 && hV < 2.0) {
                gazeCenter.h = ((gazeCenter.h * gazeCenter.samples) + pH) / (gazeCenter.samples + 1);
                gazeCenter.v = ((gazeCenter.v * gazeCenter.samples) + pV) / (gazeCenter.samples + 1);
                gazeCenter.samples += 1;
            } else if (gazeCenter.samples >= 24) {
                const nearNeutral =
                    Math.abs(pH - gazeCenter.h) < 0.08 &&
                    Math.abs(pV - gazeCenter.v) < 0.08 &&
                    hH > 0.36 && hH < 0.64;
                if (nearNeutral) {
                    gazeCenter.h = gazeCenter.h * 0.97 + pH * 0.03;
                    gazeCenter.v = gazeCenter.v * 0.97 + pV * 0.03;
                }
            }

            const relH = pH - gazeCenter.h;
            const relV = pV - gazeCenter.v;

            // Full 4-way gaze like a human proctor (after calibration)
            if (gazeCenter.samples >= 18) {
                // Horizontal: pixel pupil + head yaw
                const lookLeft  = relH > 0.14 || hH < 0.28;
                const lookRight = relH < -0.14 || hH > 0.72;
                // Vertical: pupil Y (0=up). Dead zone for reading the on-screen question.
                const lookUp   = relV < -0.16 || hV < 0.32;
                const lookDown = relV > 0.18 || hV > 2.45;

                gazeHold.left  = lookLeft  ? gazeHold.left  + dt : 0;
                gazeHold.right = lookRight ? gazeHold.right + dt : 0;
                gazeHold.up    = lookUp    ? gazeHold.up    + dt : 0;
                gazeHold.down  = lookDown  ? gazeHold.down  + dt : 0;

                if (gazeHold.left  >= HOLD_SEC) accumulateDistraction("gaze_left",  dt);
                else if (gazeHold.right >= HOLD_SEC) accumulateDistraction("gaze_right", dt);
                if (gazeHold.up    >= HOLD_SEC) accumulateDistraction("gaze_up",    dt);
                else if (gazeHold.down >= HOLD_SEC) accumulateDistraction("gaze_down",  dt);
            }

            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    const W = canvas.width, H = canvas.height;
                    ctx.clearRect(0, 0, W, H);
                    const totalAcc = Object.values(antiCheatAlertsRef.current).reduce((a, b) => a + b, 0);
                    const color = totalAcc > 3 ? "#ff4d4d" : totalAcc > 0.5 ? "#e0e0e0" : "#4ade80";
                    ctx.fillStyle = color;
                    ctx.globalAlpha = 0.55;
                    for (const p of lm) {
                        ctx.beginPath();
                        ctx.arc(p.x * W, p.y * H, 1.1, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.globalAlpha = 1;

                    const drawEye = (
                        pupil: PupilHit | null,
                        outer: { x: number; y: number },
                        inner: { x: number; y: number },
                        top: { x: number; y: number },
                        bot: { x: number; y: number },
                    ) => {
                        if (!pupil) return;
                        const minX = Math.min(outer.x, inner.x) * W;
                        const maxX = Math.max(outer.x, inner.x) * W;
                        const minY = Math.min(top.y, bot.y) * H;
                        const maxY = Math.max(top.y, bot.y) * H;
                        const neutralX = minX + gazeCenter.h * (maxX - minX);
                        const neutralY = minY + gazeCenter.v * (maxY - minY);
                        const px = pupil.x * W;
                        const py = pupil.y * H;
                        const ph = normalizeBetween(pupil.x, outer.x, inner.x);
                        const pv = normalizeBetween(pupil.y, top.y, bot.y);
                        const activeH = Math.abs(ph - gazeCenter.h) > 0.14;
                        const activeV = Math.abs(pv - gazeCenter.v) > 0.16;
                        const active = activeH || activeV;

                        ctx.strokeStyle = active ? "#ff4d5d" : "#4ade80";
                        ctx.lineWidth = 2.5;
                        ctx.beginPath();
                        ctx.moveTo(neutralX, neutralY);
                        ctx.lineTo(px, py);
                        ctx.stroke();

                        ctx.beginPath();
                        ctx.arc(px, py, 6.5, 0, Math.PI * 2);
                        ctx.fillStyle = active ? "#ff4d5d" : "#ffffff";
                        ctx.fill();
                        ctx.strokeStyle = "#0a0a0a";
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                    };

                    drawEye(pupilL, lOuter, lInner, lTop, lBot);
                    drawEye(pupilR, rOuter, rInner, rTop, rBot);
                }
            }
        });

        const runDetection = async () => {
            if (detectionGenRef.current !== gen) return;
            try {
                const video = videoRef.current;
                if (video && video.readyState >= 2) {
                    const now = performance.now();

                    procCanvas.width  = video.videoWidth  || 640;
                    procCanvas.height = video.videoHeight || 480;
                    // Mild contrast helps dark pupil stand out for tracking
                    procCtx.filter = "contrast(1.35) brightness(1.02)";
                    procCtx.drawImage(video, 0, 0);
                    procCtx.filter = "none";
                    try {
                        framePixels = procCtx.getImageData(0, 0, procCanvas.width, procCanvas.height);
                    } catch {
                        framePixels = null;
                    }

                    await faceMesh.send({ image: procCanvas });

                    if (phaseRef.current === "recording" && objectDetectorRef.current) {
                        const detections = objectDetectorRef.current.detectForVideo(video, now);
                        for (const detection of detections.detections) {
                            const label = (detection.categories[0]?.categoryName || "").toLowerCase();
                            const dt2 = Math.min((now - lastFrameTimeRef.current) / 1000, 0.12);
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
            if (detectionGenRef.current === gen) {
                requestAnimationFrame(runDetection);
            }
        };
        requestAnimationFrame(runDetection);
    };

    // Face tracking + monitoring only while recording
    useEffect(() => {
        if (stream && phase === "recording") {
            initFaceMesh();
            return;
        }
        detectionGenRef.current++;
        const canvas = canvasRef.current;
        canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    }, [stream, phase]);

    // Face ID verification during recording (every 3s)
    useEffect(() => {
        if (phase !== "recording" || !stream) return;

        faceScoresRef.current = [];
        const checkFace = async () => {
            const video = videoRef.current;
            const stored = storedFaceEmbRef.current;
            if (!video || !stored || video.readyState < 2) return;

            try {
                const desc = await captureFaceDescriptor(video);
                if (!desc) return; // no face in frame — gaze alerts handle looking away

                const score = faceSimilarityPercent(desc, stored);
                faceScoresRef.current.push(score);
                // Only flag clear different-person (not lighting/angle noise)
                if (score < 22) {
                    accumulateDistraction("face_mismatch", 1);
                }
            } catch { /* models still loading */ }
        };

        checkFace();
        const iv = setInterval(checkFace, 3000);
        return () => clearInterval(iv);
    }, [phase, stream]);

    // ── START EXAM: info → preview ────────────────────────────────────────────
    const startExam = useCallback(async () => {
        if (!studentName.trim() || !studentId.trim()) {
            setErrorMsg(t("exam.needData"));
            return;
        }
        if (!question) { setErrorMsg(t("exam.noQuestion")); return; }
        setErrorMsg("");

        try {
            await api.get("/users/me");
        } catch (e: any) {
            const status = e?.response?.status;
            if (status === 401 || status === 403) {
                localStorage.removeItem("token");
                setErrorMsg(t("exam.sessionExpired"));
                return;
            }
        }

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
        phaseRef.current = "preview";

        // Reset anti-cheat counters
        antiCheatAlertsRef.current = {};
        lastFrameTimeRef.current = performance.now();
        lastAlertTimeRef.current = 0;
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
        // Fresh timers — preview wait must not count as gaze/violation time
        antiCheatAlertsRef.current = {};
        faceScoresRef.current = [];
        lastFrameTimeRef.current = performance.now();
        lastAlertTimeRef.current = 0;
        setPhase("recording");
        phaseRef.current = "recording";
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
        const finishedAt = new Date().toISOString();
        const recSec = Math.max(
            1,
            (new Date(finishedAt).getTime() - new Date(startedAtRef.current).getTime()) / 1000
        );
        const clampedAlerts: Record<string, number> = {};
        for (const [k, v] of Object.entries(antiCheatAlertsRef.current)) {
            clampedAlerts[k] = Math.min(v, recSec);
        }

        const fd = new FormData();
        fd.append("question_id", String(question.id));
        fd.append("student_name", studentName);
        fd.append("student_number", studentId);
        fd.append("audio", blob, "answer.webm");
        fd.append("anti_cheat_alerts", JSON.stringify(clampedAlerts));
        if (faceScoresRef.current.length > 0) {
            const aggregated = aggregateFaceScores(faceScoresRef.current);
            fd.append("face_score", String(Math.round(aggregated * 10) / 10));
        }
        fd.append("started_at", startedAtRef.current);
        fd.append("finished_at", finishedAt);

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
                // Check if there are more questions in the group
                const nextIdx = currentQIndex + 1;
                if (nextIdx < allQuestions.length) {
                    // Auto-advance to next question after showing result briefly
                    setPhase("done");
                } else {
                    localStorage.removeItem("pendingExamToken");
                    setPhase("done");
                }
            } else {
                setErrorMsg("السيرفر رجع رد غير متوقع.");
                setPhase("failed");
            }
        } catch (e: any) {
            const detail = e?.response?.data?.detail;
            const status = e?.response?.status;
            if (status === 401 || status === 403) {
                localStorage.removeItem("token");
                setErrorMsg(t("exam.sessionExpired"));
                setPhase("failed");
                return;
            }
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
    const scoreColor = (s: number) => s >= 75 ? "#4ade80" : s >= 50 ? "#fbbf24" : "#ff4d4d";
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
            <Loader2 size={36} color="#ffffff" style={{ animation: "spin 1s linear infinite" }} />
        </div>
    );

    if (phase === "voice_required") return (
        <div style={{ ...C.center, padding: "2rem" }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                style={{ width: "100%", maxWidth: 480, background: "#141414", borderRadius: "1.5rem", border: "1px solid rgba(255,160,0,0.3)", padding: "2.5rem", textAlign: "center" }}>
                <div style={{
                    width: 72, height: 72, borderRadius: "50%",
                    background: "rgba(255,160,0,0.1)", border: "2px solid rgba(255,160,0,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 1.5rem",
                }}>
                    <AlertCircle size={36} color="#ffa000" />
                </div>
                <h2 style={{ color: "#f0f0f0", fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.75rem" }} dir="rtl">
                    الهوية البيومترية غير مكتملة
                </h2>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", lineHeight: 1.8, marginBottom: "2rem" }} dir="rtl">
                    لا يمكنك أداء الامتحان قبل تسجيل <strong style={{ color: "#fff" }}>Face ID + بصمة الصوت</strong> من الإعدادات — للتحقق من هويتك ومنع الانتحال.
                </p>
                <button onClick={() => navigate("/dashboard/settings")}
                    style={{
                        padding: "1rem 2.5rem", background: "#ffffff", border: "none",
                        borderRadius: "0.85rem", color: "#0a0a0a", cursor: "pointer",
                        fontWeight: 800, fontSize: "1rem",
                        display: "inline-flex", alignItems: "center", gap: "0.6rem",
                        boxShadow: "0 4px 20px rgba(255,255,255,0.15)",
                        fontFamily: "'Antonio', sans-serif",
                        textTransform: "uppercase", letterSpacing: "0.04em",
                    }}>
                    الذهاب إلى الإعدادات <ArrowRight size={18} />
                </button>
                <p style={{ marginTop: "1.25rem", fontSize: "0.72rem", color: "rgba(255,255,255,0.25)" }} dir="rtl">
                    بعد تسجيل البصمة، ارجع هنا لبدء الامتحان.
                </p>
            </motion.div>
        </div>
    );

    if (phase === "info") return (
        <div style={{ ...C.center, padding: "2rem" }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                style={{ width: "100%", maxWidth: 460, background: "#141414", borderRadius: "1.5rem", border: "1px solid rgba(255,255,255,0.15)", padding: "2.5rem" }}>
                <Logo size={28} showText style={{ marginBottom: "1.5rem" }} />

                <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.3rem 0.85rem", borderRadius: "999px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", marginBottom: "1rem" }}>
                    <Sparkles size={12} color="#ffffff" />
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#ffffff", letterSpacing: "0.05em" }}>{t("exam.badge")}</span>
                </div>

                <h2 style={{ color: "#f0f0f0", fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.4rem" }}>{t("exam.welcome")}</h2>
                <p style={{ color: "#808080", fontSize: "0.875rem", marginBottom: "1.75rem", lineHeight: 1.7 }} dir={dir}>
                    {t("exam.info")}
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                    <input value={studentName} onChange={e => setStudentName(e.target.value)}
                        placeholder={t("exam.namePlaceholder")} dir={dir} style={C.input} />
                    <input value={studentId} onChange={e => setStudentId(e.target.value)}
                        placeholder={t("exam.idPlaceholder")} dir={dir} style={C.input} />

                    {errorMsg && (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#ff4d4d", fontSize: "0.85rem" }} dir={dir}>
                            <AlertCircle size={16} /> {errorMsg}
                        </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "0.875rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.75rem" }} dir={dir}>
                        {[t("exam.ruleMic"), t("exam.ruleCamera"), t("exam.ruleNoPhone")].map(r => (
                            <div key={r} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.78rem", color: "#808080" }}>
                                <CheckCircle2 size={13} color="#ffffff" /> {r}
                            </div>
                        ))}
                    </div>

                    <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                        onClick={startExam}
                        style={{ padding: "1rem", background: "#ffffff", border: "none", borderRadius: "0.75rem", color: "#0a0a0a", fontWeight: 800, fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
                        <ArrowRight size={18} /> {t("exam.beginExam")}
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
                        style={{ position: "absolute", inset: 0, border: "3px solid rgba(255,255,255,0.15)", borderTopColor: "#ffffff", borderRadius: "50%" }} />
                    <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                        style={{ position: "absolute", inset: 16, background: "#ffffff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Sparkles size={22} color="#0a0a0a" />
                    </motion.div>
                </div>
                <h2 style={{ color: "#f0f0f0", fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.75rem" }} dir="rtl">
                    {t("exam.processing")}
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", textAlign: "right", padding: "1rem", background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.875rem" }}>
                    {[
                        dir === "rtl" ? "تحويل الصوت إلى نص (Whisper)..." : "Transcribing speech (Whisper)...",
                        dir === "rtl" ? "تحليل محتوى الإجابة (SBERT/NLP)..." : "Analyzing answer content (SBERT/NLP)...",
                        dir === "rtl" ? "تقييم نزاهة الامتحان (Vision AI)..." : "Checking exam integrity (Vision AI)...",
                        dir === "rtl" ? "حساب الدرجة النهائية..." : "Calculating final score...",
                    ].map((step, i) => (
                        <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.5 }}
                            style={{ display: "flex", alignItems: "center", gap: "0.625rem", fontSize: "0.82rem", color: "#ffffff" }} dir={dir}>
                            <Loader2 size={12} style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
                            {step}
                        </motion.div>
                    ))}
                </div>
                <p style={{ color: "#404040", fontSize: "0.7rem", marginTop: "1rem" }} dir={dir}>
                    {dir === "rtl" ? "في المرة الأولى قد يأخذ دقيقة لتحميل نموذج Whisper" : "The first run may take a minute while Whisper loads."}
                </p>
            </motion.div>
        </div>
    );

    if (phase === "failed") return (
        <div style={C.center}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                style={{ textAlign: "center", padding: "3rem", maxWidth: 440, background: "#141414", borderRadius: "1.5rem", border: "1px solid rgba(255,77,77,0.25)" }}>
                <AlertCircle size={48} color="#ff4d4d" style={{ margin: "0 auto 1rem" }} />
                <h2 style={{ color: "#f0f0f0", fontSize: "1.3rem", fontWeight: 800, marginBottom: "0.5rem" }} dir={dir}>
                    {t("exam.failed")}
                </h2>
                <p style={{ color: "#808080", marginBottom: errorMsg ? "0.5rem" : "1.5rem" }} dir={dir}>
                    {dir === "rtl" ? "مشكلة في الاتصال بالسيرفر، الإجابة لم ترسل." : "Server connection problem. The answer was not submitted."}
                </p>
                {errorMsg && (
                    <p style={{ color: "#ff4d4d", fontSize: "0.75rem", background: "rgba(255,77,77,0.1)", padding: "0.75rem", borderRadius: "0.5rem", marginBottom: "1.5rem", wordBreak: "break-all", textAlign: "left" }}>
                        {errorMsg}
                    </p>
                )}
                <button onClick={() => navigate("/dashboard")}
                    style={{ padding: "0.85rem 2rem", background: "#ffffff", border: "none", borderRadius: "0.75rem", color: "#0a0a0a", cursor: "pointer", fontWeight: 800, fontSize: "0.95rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
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
                        style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(74,222,128,0.1)", border: "2px solid rgba(74,222,128,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                        <CheckCircle2 size={40} color="#4ade80" />
                    </motion.div>
                    <h2 style={{ color: "#f0f0f0", fontSize: "1.5rem", fontWeight: 800 }} dir={dir}>{t("exam.done")}</h2>
                    <p style={{ color: "#808080", fontSize: "0.85rem", marginTop: "0.25rem" }} dir={dir}>
                        {dir === "rtl" ? "هتلاقي نتيجتك النهائية في درجاتي لما الدكتور يعرضها" : "Your final result appears in My Grades once the lecturer publishes it."}
                    </p>
                </div>

                {result && (
                  <>
                    {/* Overall score */}
                    <div style={{ background: "#141414", border: `2px solid ${scoreColor(result.overall_score)}44`, borderRadius: "1.25rem", padding: "1.5rem", textAlign: "center" }}>
                        <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.15em", color: "#606060", marginBottom: "0.5rem" }}>
                            {t("exam.finalScore")}
                        </p>
                        <div style={{ fontSize: "3.5rem", fontWeight: 900, color: scoreColor(result.overall_score), fontFamily: "'Antonio', sans-serif", lineHeight: 1 }}>
                            {Math.round(result.overall_score)}
                        </div>
                        <div style={{ color: scoreColor(result.overall_score), fontWeight: 700, marginTop: "0.25rem" }}>
                            {scoreLabel(result.overall_score)}
                        </div>
                        <p style={{ fontSize: "0.65rem", color: "#404040", marginTop: "0.5rem" }} dir="rtl">
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
                                <p style={{ fontSize: "0.6rem", color: "#606060", marginBottom: "0.4rem" }}>{label}</p>
                                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: scoreColor(value) }}>
                                    {Math.round(value)}
                                </div>
                                <p style={{ fontSize: "0.55rem", color: "#404040", marginTop: "0.2rem" }}>{note}</p>
                            </div>
                        ))}
                    </div>
                  </>
                )}

                {/* Transcript */}
                {result?.transcript && (
                    <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "1.25rem", padding: "1.25rem" }}>
                        <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.12em", color: "#606060", marginBottom: "0.75rem" }} dir="rtl">
                            {dir === "rtl" ? "إجابتك - نص Whisper" : "Your Answer - Whisper transcript"}
                        </p>
                        <p style={{ color: "#e0e0e0", fontSize: "0.9rem", lineHeight: 1.8 }} dir={dir}>
                            {result.transcript}
                        </p>
                    </div>
                )}

                {/* Next question in group (same exam session) */}
                {currentQIndex + 1 < allQuestions.length ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                        <button onClick={async () => {
                            const nextIdx = currentQIndex + 1;
                            setCurrentQIndex(nextIdx);
                            setQuestion(allQuestions[nextIdx]);
                            setTimeLeft(allQuestions[nextIdx].timeLimit);
                            setResult(null);
                            setErrorMsg("");
                            antiCheatAlertsRef.current = {};
                            lastFrameTimeRef.current = performance.now();
                            lastAlertTimeRef.current = 0;
                            // Re-request camera if stream died
                            try {
                                let s = stream;
                                if (!s || !s.active) {
                                    s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 960 } }, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
                                    setStream(s);
                                }
                                if (videoRef.current) {
                                    videoRef.current.srcObject = s;
                                    videoRef.current.play().catch(() => {});
                                }
                            } catch { /* camera may still be available from before */ }
                            setPhase("preview");
                            phaseRef.current = "preview";
                        }}
                            style={{ padding: "1rem 2rem", background: "linear-gradient(135deg, #1a6e1a, #2a8a2a)", border: "none", borderRadius: "0.75rem", color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                            dir="rtl">
                            <ArrowRight size={18} style={{ transform: "scaleX(-1)" }} /> السؤال التالي ({allQuestions.length - currentQIndex - 1} متبقي من {allQuestions.length})
                        </button>
                        <p style={{ textAlign: "center", fontSize: "0.7rem", color: "rgba(255,255,255,0.25)" }}>
                            سؤال {currentQIndex + 1} من {allQuestions.length}
                        </p>
                    </div>
                ) : (
                    <button onClick={() => navigate("/dashboard")}
                        style={{ padding: "0.85rem 2rem", background: "#ffffff", border: "none", borderRadius: "0.75rem", color: "#0a0a0a", cursor: "pointer", fontWeight: 800, fontSize: "0.95rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
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
            <header className="oiq-exam-header" style={{ height: 60, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2rem", background: "#141414", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <Logo size={22} showText />

                {/* Timer — only in recording */}
                <AnimatePresence>
                    {phase === "recording" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: timeLeft < 30 ? "#ff4d4d" : "#e0e0e0", fontWeight: 800, fontFamily: "monospace", fontSize: "1.1rem" }}>
                            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }}
                                style={{ width: 8, height: 8, borderRadius: "50%", background: timeLeft < 30 ? "#ff4d4d" : "#4ade80" }} />
                            {fmt(timeLeft / 60)}:{fmt(timeLeft % 60)}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Monitoring status — recording only */}
                {phase === "recording" && (
                    <span style={{ fontSize: "0.72rem", color: "#4ade80" }}>✅ المراقبة شغّالة</span>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    {allQuestions.length > 1 && (
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#fbbf24", background: "rgba(251,191,36,0.1)", padding: "0.2rem 0.6rem", borderRadius: "999px" }}>
                            سؤال {currentQIndex + 1} من {allQuestions.length}
                        </span>
                    )}
                    <span style={{ color: "#808080", fontSize: "0.8rem" }}>{studentName}</span>
                </div>
            </header>

            {/* Body — centered layout: small square camera + question (recording only) + controls */}
            <div className="oiq-exam-body" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.5rem", gap: "1.5rem", overflow: "auto" }}>

                {/* Camera — small square in a framed card; red glow if any violation is active */}
                <div style={{
                    position: "relative", width: "min(440px, calc(100vw - 2rem))", aspectRatio: "1 / 1", borderRadius: "1.25rem",
                    overflow: "hidden", background: "#000",
                    border: liveAlert ? "2px solid rgba(255,77,77,0.85)" : "2px solid rgba(255,255,255,0.25)",
                    boxShadow: liveAlert
                        ? "0 0 40px rgba(255,77,77,0.35)"
                        : "0 0 30px rgba(255,255,255,0.08)",
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
                    <div style={{ position: "absolute", bottom: "0.6rem", left: "0.6rem", background: "rgba(0,0,0,0.65)", color: "#ffffff", fontSize: "0.65rem", padding: "0.2rem 0.55rem", borderRadius: "0.25rem", fontWeight: 700 }}>
                        {studentName}
                    </div>

                    {/* REC badge */}
                    {phase === "recording" && (
                        <div style={{ position: "absolute", top: "0.6rem", right: "0.6rem", display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.25rem 0.6rem", background: "rgba(255,77,77,0.9)", borderRadius: "999px" }}>
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
                                style={{ position: "absolute", bottom: "1.5rem", left: "50%", background: "rgba(255,77,77,0.92)", color: "#fff", padding: "0.6rem 1.2rem", borderRadius: "0.75rem", fontWeight: 700, fontSize: "0.82rem", backdropFilter: "blur(8px)", whiteSpace: "nowrap" }}>
                                {liveAlert}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Cheat debug strip — recording only */}
                {phase === "recording" && (
                    <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.7rem", fontFamily: "monospace", color: "#808080", flexWrap: "wrap", justifyContent: "center" }}>
                    {["gaze_left","gaze_right","gaze_up","gaze_down","no_face","face_mismatch","phone_detected","book_detected"].map(k => {
                        const v = antiCheatAlertsRef.current[k] || 0;
                        return v > 0 ? (
                            <span key={k} style={{ padding: "0.2rem 0.55rem", background: "#141414", borderRadius: "0.35rem" }}>
                                {k.replace("gaze_","")}:<span style={{ color: v > 2 ? "#ff4d4d" : "#e0e0e0" }}>{v.toFixed(1)}s</span>
                            </span>
                        ) : null;
                    })}
                </div>
                )}

                {/* Preview hint — no question yet */}
                {phase === "preview" && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                        style={{ width: "100%", maxWidth: 600, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "1rem", padding: "1.25rem" }}
                        dir={dir}>
                        <p style={{ color: "#a0a0a0", fontSize: "0.9rem", lineHeight: 1.8, textAlign: "center" }}>
                            {t("exam.previewHint")}
                        </p>
                    </motion.div>
                )}

                {/* Question — recording only */}
                {phase === "recording" && question && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                        style={{ width: "100%", maxWidth: 600, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "1rem", padding: "1.25rem" }}
                        dir="rtl">
                        {allQuestions.length > 1 && (
                            <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#fbbf24", marginBottom: "0.5rem" }}>
                                سؤال {currentQIndex + 1} من {allQuestions.length}
                            </p>
                        )}
                        <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#ffffff", marginBottom: "0.5rem" }}>
                            {t("exam.question")}
                        </p>
                        <p style={{ fontSize: "1rem", color: "#f0f0f0", lineHeight: 1.8, fontWeight: 500 }}>
                            {question.text}
                        </p>
                    </motion.div>
                )}

                {/* Error */}
                {errorMsg && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#ff4d4d", fontSize: "0.8rem", background: "rgba(255,77,77,0.1)", padding: "0.75rem 1rem", borderRadius: "0.5rem" }}
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
                                style={{ width: "100%", padding: "1.1rem", background: "linear-gradient(135deg, #ff4d4d, #c04444)", border: "none", borderRadius: "1rem", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", fontSize: "1rem", fontWeight: 700, boxShadow: "0 0 24px rgba(255,77,77,0.5)" }}>
                                <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
                                    <MicOff size={22} />
                                </motion.div>
                                {t("exam.stop")}
                            </motion.button>
                            <p style={{ textAlign: "center", fontSize: "0.72rem", color: "#ff4d4d" }} dir={dir}>
                                {t("exam.recording")}
                            </p>
                        </>
                    )}
                </div>

                {/* Rules */}
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
                    {[t("exam.ruleCamera"), t("exam.ruleMic"), t("exam.ruleNoPhone")].map(r => (
                        <span key={r} style={{ fontSize: "0.65rem", color: "#808080", background: "rgba(255,255,255,0.04)", padding: "0.25rem 0.6rem", borderRadius: "0.35rem" }}>
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
        border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: "0.75rem",
        color: "#f0f0f0",
        fontSize: "0.95rem",
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "inherit",
    } as React.CSSProperties,
};
