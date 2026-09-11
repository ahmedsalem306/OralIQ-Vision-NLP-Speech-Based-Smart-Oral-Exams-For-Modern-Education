import * as faceapi from "face-api.js";

const MODEL_URL = "/face-models";
const MATCH_THRESHOLD = 0.6;
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

export function faceSimilarityPercent(a: number[] | Float32Array, b: number[] | Float32Array): number {
    const dist = faceDistance(a, b);
    return Math.max(0, Math.min(100, (1 - dist / MATCH_THRESHOLD) * 100));
}

export function isFaceMatch(a: number[] | Float32Array, b: number[] | Float32Array): boolean {
    return faceDistance(a, b) < MATCH_THRESHOLD;
}

export { EMBEDDING_DIM, MATCH_THRESHOLD };
