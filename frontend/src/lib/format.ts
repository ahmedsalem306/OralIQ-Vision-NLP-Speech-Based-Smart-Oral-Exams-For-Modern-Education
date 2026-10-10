import type { Language } from "../i18n";
import type { Tone } from "./grades";

/** Latin digits in both languages so scores, IDs and dates read the same everywhere. */
const locale = (lang: Language) => (lang === "ar" ? "ar-EG-u-nu-latn" : "en-GB");

/** The API returns naive UTC timestamps (no "Z"); treat them as UTC. */
export function parseServerDate(value?: string | null): Date | null {
    if (!value) return null;
    const hasZone = /[zZ]|[+-]\d\d:?\d\d$/.test(value);
    const d = new Date(hasZone ? value : `${value}Z`);
    return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value: string | null | undefined, lang: Language, withTime = false): string {
    const d = parseServerDate(value);
    if (!d) return "—";
    return new Intl.DateTimeFormat(locale(lang), {
        day: "numeric", month: "short", year: "numeric",
        ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
    }).format(d);
}

export function timeAgo(value: string | null | undefined, lang: Language): string {
    const d = parseServerDate(value);
    if (!d) return "—";
    const sec = Math.round((d.getTime() - Date.now()) / 1000);
    const rtf = new Intl.RelativeTimeFormat(locale(lang), { numeric: "auto" });
    const abs = Math.abs(sec);
    if (abs < 60) return rtf.format(sec, "second");
    if (abs < 3600) return rtf.format(Math.round(sec / 60), "minute");
    if (abs < 86400) return rtf.format(Math.round(sec / 3600), "hour");
    if (abs < 86400 * 7) return rtf.format(Math.round(sec / 86400), "day");
    return formatDate(value, lang);
}

/** "1:05" from seconds */
export function formatDuration(totalSec: number): string {
    const s = Math.max(0, Math.round(totalSec));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function difficultyInfo(value: string | null | undefined, lang: Language): { label: string; tone: Tone } {
    const map: Record<string, { ar: string; en: string; tone: Tone }> = {
        easy: { ar: "سهل", en: "Easy", tone: "pass" },
        medium: { ar: "متوسط", en: "Medium", tone: "warn" },
        hard: { ar: "صعب", en: "Hard", tone: "mark" },
    };
    const m = map[(value || "").toLowerCase()];
    if (!m) return { label: value || "—", tone: "neutral" };
    return { label: lang === "ar" ? m.ar : m.en, tone: m.tone };
}
