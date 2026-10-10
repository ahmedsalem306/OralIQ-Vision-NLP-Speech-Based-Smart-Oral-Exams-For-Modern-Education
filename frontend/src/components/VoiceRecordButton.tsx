import { useState, useRef } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import api from "../lib/api";

interface VoiceRecordButtonProps {
    onTranscribed: (text: string) => void;
    hint?: string;
    label?: string;
    disabled?: boolean;
}

export default function VoiceRecordButton({ onTranscribed, hint = "", label = "سجّل بصوتك", disabled }: VoiceRecordButtonProps) {
    const [recording, setRecording] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState("");
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        setError("");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            });
            chunksRef.current = [];
            const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus" : "audio/webm";
            const rec = new MediaRecorder(stream, { mimeType: mime });
            rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            rec.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());
                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                if (blob.size < 500) {
                    setError("التسجيل قصير — تكلم أكتر");
                    return;
                }
                setProcessing(true);
                try {
                    const fd = new FormData();
                    fd.append("audio", blob, "dictation.webm");
                    if (hint) fd.append("hint", hint);
                    const { data } = await api.post("/speech/transcribe", fd, {
                        headers: { "Content-Type": "multipart/form-data" },
                        timeout: 120_000,
                    });
                    if (data?.text) onTranscribed(data.text);
                    else setError("لم يتم التعرف على الكلام");
                } catch (e: any) {
                    setError(e?.response?.data?.detail || "فشل تحويل الصوت لنص");
                } finally {
                    setProcessing(false);
                }
            };
            recorderRef.current = rec;
            rec.start(100);
            setRecording(true);
        } catch {
            setError("تعذّر الوصول للميكروفون");
        }
    };

    const stopRecording = () => {
        if (recorderRef.current?.state === "recording") {
            recorderRef.current.stop();
        }
        setRecording(false);
    };

    const busy = recording || processing;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "flex-start" }}>
            <button
                type="button"
                onClick={recording ? stopRecording : startRecording}
                disabled={disabled || processing}
                style={{
                    display: "inline-flex", alignItems: "center", gap: "0.4rem",
                    padding: "0.45rem 0.85rem",
                    background: recording ? "rgba(255,77,77,0.15)" : "rgba(255,255,255,0.06)",
                    border: recording ? "1px solid rgba(255,77,77,0.4)" : "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "0.6rem",
                    color: recording ? "#ff4d4d" : "#ffffff",
                    fontSize: "0.75rem", fontWeight: 700,
                    cursor: disabled || processing ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.5 : 1,
                    fontFamily: "'Inter', sans-serif",
                }}
            >
                {processing ? (
                    <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> جاري التحويل...</>
                ) : recording ? (
                    <><MicOff size={14} /> اضغط للإيقاف</>
                ) : (
                    <><Mic size={14} /> {label}</>
                )}
            </button>
            {error && <span style={{ fontSize: "0.7rem", color: "#ff4d4d" }}>{error}</span>}
            {recording && <span style={{ fontSize: "0.68rem", color: "#808080" }}>تكلم بوضوح ثم اضغط للإيقاف</span>}
        </div>
    );
}
