import { useState, useEffect, useRef, useCallback } from "react";
import api from "./api";

// ─── Types ───────────────────────────────────────────────────────────────────
export type VoiceGender = "male" | "female";

interface UseTTSOptions {
    /** Preferred voice gender */
    gender?: VoiceGender;
    rate?: number; // Kept for compatibility but edge-tts handles rate differently
}

interface UseTTSReturn {
    /** Speak the given text */
    speak: (text: string) => Promise<void>;
    /** Stop speaking */
    stop: () => void;
    /** Whether the avatar is currently speaking */
    isSpeaking: boolean;
    /** Whether mouth should be "open" (for animation sync) */
    isMouthOpen: boolean;
    /** Whether TTS is ready */
    isReady: boolean;
}

let sharedAudioContext: AudioContext | null = null;

export function useTTS(options: UseTTSOptions = {}): UseTTSReturn {
    const { gender = "male" } = options;

    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isMouthOpen, setIsMouthOpen] = useState(false);
    const isReady = true;

    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const initAudioContext = () => {
        if (!sharedAudioContext) {
            sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (sharedAudioContext.state === "suspended") {
            sharedAudioContext.resume();
        }
    };

    // Unlock on any click
    useEffect(() => {
        const unlock = () => {
            initAudioContext();
            window.removeEventListener('click', unlock);
        };
        window.addEventListener('click', unlock);
        return () => window.removeEventListener('click', unlock);
    }, []);

    const stop = useCallback(() => {
        if (sourceNodeRef.current) {
            try {
                sourceNodeRef.current.stop();
            } catch (e) {
                // Ignore if already stopped
            }
            sourceNodeRef.current.disconnect();
            sourceNodeRef.current = null;
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        setIsSpeaking(false);
        setIsMouthOpen(false);
    }, []);

    const speak = useCallback(
        async (text: string) => {
            if (!text.trim()) return;

            stop();
            setIsSpeaking(true);

            try {
                // 1. Fetch audio from backend
                const response = await api.get("/tts/generate", {
                    params: { text, gender },
                    responseType: "arraybuffer",
                });

                initAudioContext();
                const ctx = sharedAudioContext!;

                // 2. Decode Audio
                const audioBuffer = await ctx.decodeAudioData(response.data);

                // 3. Setup nodes
                const source = ctx.createBufferSource();
                const analyser = ctx.createAnalyser();
                
                source.buffer = audioBuffer;
                analyser.fftSize = 256;
                analyser.smoothingTimeConstant = 0.5;

                source.connect(analyser);
                analyser.connect(ctx.destination);

                sourceNodeRef.current = source;
                analyserRef.current = analyser;

                // 4. Handle end of playback
                source.onended = () => {
                    stop();
                };

                // 5. Start playback and mouth sync analysis
                source.start(0);

                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                
                const analyzeVolume = () => {
                    if (!analyserRef.current) return;
                    
                    analyserRef.current.getByteFrequencyData(dataArray);
                    
                    let sum = 0;
                    for (let i = 0; i < dataArray.length; i++) {
                        sum += dataArray[i];
                    }
                    const average = sum / dataArray.length;

                    if (average > 15) {
                        setIsMouthOpen(true);
                    } else {
                        setIsMouthOpen(false);
                    }

                    animationFrameRef.current = requestAnimationFrame(analyzeVolume);
                };

                analyzeVolume();

            } catch (error) {
                console.error("[useTTS] Failed to fetch or play audio:", error);
                stop();
            }
        },
        [gender, stop]
    );

    useEffect(() => {
        return () => {
            stop();
            // Don't close shared context
        };
    }, [stop]);

    return {
        speak,
        stop,
        isSpeaking,
        isMouthOpen,
        isReady,
    };
}
