import { useRef, useEffect } from "react";

interface VADOptions {
    energyThreshold?: number;   // 0-255, default 18
    silenceDuration?: number;   // ms of silence before cut, default 1800
    minSpeechDuration?: number; // ms of speech before recording counts, default 400
    onSpeechStart?: () => void;
    onSpeechEnd?: (blob: Blob) => void;
}

/**
 * Voice Activity Detection hook.
 * Monitors a MediaStream and fires onSpeechStart / onSpeechEnd automatically.
 * Only active when `enabled` is true — set to false while avatar is speaking.
 */
export function useVAD(
    stream: MediaStream | null,
    enabled: boolean,
    options: VADOptions = {}
) {
    const {
        energyThreshold = 18,
        silenceDuration = 1800,
        minSpeechDuration = 400,
        onSpeechStart,
        onSpeechEnd,
    } = options;

    const enabledRef = useRef(enabled);
    useEffect(() => { enabledRef.current = enabled; }, [enabled]);

    // Keep callbacks in refs so the audio loop doesn't need to restart on re-render
    const onSpeechStartRef = useRef(onSpeechStart);
    const onSpeechEndRef = useRef(onSpeechEnd);
    useEffect(() => { onSpeechStartRef.current = onSpeechStart; }, [onSpeechStart]);
    useEffect(() => { onSpeechEndRef.current = onSpeechEnd; }, [onSpeechEnd]);

    useEffect(() => {
        if (!stream) return;

        let audioCtx: AudioContext;
        let rafId: number;
        let recorder: MediaRecorder | null = null;
        const chunks: Blob[] = [];
        let isSpeaking = false;
        let speechStart = 0;
        let silenceTimer: ReturnType<typeof setTimeout> | null = null;

        try {
            audioCtx = new AudioContext();
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.4;
            source.connect(analyser);

            const data = new Uint8Array(analyser.frequencyBinCount);

            const tick = () => {
                analyser.getByteFrequencyData(data);
                const energy = data.reduce((s, v) => s + v, 0) / data.length;
                const talking = energy > energyThreshold;

                if (talking && !isSpeaking && enabledRef.current) {
                    // Speech started
                    isSpeaking = true;
                    speechStart = Date.now();
                    chunks.length = 0;
                    if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }

                    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                        ? "audio/webm;codecs=opus"
                        : "audio/webm";
                    const audioOnly = new MediaStream(stream.getAudioTracks());
                    recorder = new MediaRecorder(audioOnly, { mimeType });
                    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
                    recorder.start(100);
                    onSpeechStartRef.current?.();
                }

                if (talking && silenceTimer) {
                    // Resumed talking — cancel pending silence cutoff
                    clearTimeout(silenceTimer);
                    silenceTimer = null;
                }

                if (!talking && isSpeaking && !silenceTimer) {
                    // Start silence countdown
                    silenceTimer = setTimeout(() => {
                        silenceTimer = null;
                        const duration = Date.now() - speechStart;
                        if (duration >= minSpeechDuration && recorder && recorder.state === "recording") {
                            recorder.onstop = () => {
                                const blob = new Blob(chunks, { type: "audio/webm" });
                                onSpeechEndRef.current?.(blob);
                            };
                            recorder.stop();
                        }
                        isSpeaking = false;
                    }, silenceDuration);
                }

                rafId = requestAnimationFrame(tick);
            };

            rafId = requestAnimationFrame(tick);
        } catch (e) {
            console.error("[useVAD] AudioContext error:", e);
        }

        return () => {
            cancelAnimationFrame(rafId);
            if (silenceTimer) clearTimeout(silenceTimer);
            if (recorder?.state === "recording") recorder.stop();
            audioCtx?.close().catch(() => {});
        };
    }, [stream, energyThreshold, silenceDuration, minSpeechDuration]);
}
