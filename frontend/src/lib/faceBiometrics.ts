import * as faceapi from "face-api.js";

const MODEL_URL = "/face-models";
// Enrollment: stricter. Exam: more tolerant (lighting, head angle while answering).
const MATCH_THRESHOLD = 0.6;
const EXAM_MATCH_THRESHOLD = 0.78; // oral answers: more head movement / talk motion
const EMBEDDING_DIM = 128;

let modelsLoaded = false;
let modelsLoading: Promise<void> | null = null;

export async function loadFaceModels(): Promise<void> {
    if (modelsLoaded) return;
    if (modelsLoading) return modelsLoading;

    modelsLoading = (async () => {
        try {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);
            modelsLoaded = true;
        } catch (e) {
            modelsLoading = null;
            throw new Error("فشل تحميل موديل Face ID — تأكد من الاتصال بالإنترنت وحاول مرة أخرى");
        }
    })();

    return modelsLoading;
}

export async function captureFaceDescriptor(
    video: HTMLVideoElement
): Promise<Float32Array | null> {
    await loadFaceModels();
    if (video.readyState < 2) return null;

    const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

    return detection?.descriptor ?? null;
}

/** Capture multiple frames and average — like iPhone Face ID enrollment */
export async function enrollFaceFromVideo(
    video: HTMLVideoElement,
    samples = 5,
    intervalMs = 400
): Promise<number[]> {
    const descriptors: Float32Array[] = [];

    for (let i = 0; i < samples; i++) {
        await new Promise((r) => setTimeout(r, intervalMs));
        const d = await captureFaceDescriptor(video);
        if (d) descriptors.push(d);
    }

    if (descriptors.length < 3) {
        throw new Error("لم نتمكن من قراءة وجهك — تأكد أن وجهك ظاهر في الكاميرا");
    }

    const dim = descriptors[0].length;
    const avg = new Float32Array(dim);
    for (const d of descriptors) {
        for (let i = 0; i < dim; i++) avg[i] += d[i];
    }
    for (let i = 0; i < dim; i++) avg[i] /= descriptors.length;

    return Array.from(avg);
}

export function faceDistance(a: number[] | Float32Array, b: number[] | Float32Array): number {
    return faceapi.euclideanDistance(a, b);
}

export function faceSimilarityPercent(
    a: number[] | Float32Array,
    b: number[] | Float32Array,
    threshold = EXAM_MATCH_THRESHOLD,
): number {
    const dist = faceDistance(a, b);
    return Math.max(0, Math.min(100, (1 - dist / threshold) * 100));
}

export function isFaceMatch(
    a: number[] | Float32Array,
    b: number[] | Float32Array,
    threshold = EXAM_MATCH_THRESHOLD,
): boolean {
    return faceDistance(a, b) < threshold;
}

/** Drop worst frames (looking away / blur) — average the rest */
export function aggregateFaceScores(scores: number[]): number {
    if (scores.length === 0) return 0;
    if (scores.length === 1) return scores[0];
    const sorted = [...scores].sort((x, y) => x - y);
    const drop = Math.max(1, Math.floor(sorted.length * 0.25));
    const kept = sorted.slice(drop);
    return kept.reduce((a, b) => a + b, 0) / kept.length;
}

export { EMBEDDING_DIM, MATCH_THRESHOLD, EXAM_MATCH_THRESHOLD };
