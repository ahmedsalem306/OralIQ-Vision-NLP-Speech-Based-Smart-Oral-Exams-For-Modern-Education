import { useCallback, useEffect, useRef, useState } from "react";
import { GraduationCap, Loader2, Presentation } from "lucide-react";
import api from "../../lib/api";
import { useI18n } from "../../i18n";
import { useTheme } from "../../lib/theme";
import { cn } from "../../lib/utils";
import { getApiErrorMessage } from "../../lib/apiErrors";

/**
 * Official "Sign in with Google" button (Google Identity Services).
 *
 * - Reads client_id from GET /auth/google/config (with VITE_GOOGLE_CLIENT_ID fallback).
 * - When configured, mounts Google's official GIS popup button and verifies the ID token
 *   server-side via POST /login/google.
 * - When GOOGLE_CLIENT_ID has not been configured yet, shows the Google button with a clear
 *   setup prompt on click so administrators can see where Google Sign-In lives immediately.
 */

type Role = "student" | "lecturer";

type GoogleCredentialResponse = { credential?: string };
type GoogleId = {
    initialize: (opts: {
        client_id: string;
        callback: (resp: GoogleCredentialResponse) => void;
        ux_mode?: "popup" | "redirect";
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
        context?: "signin" | "signup" | "use";
    }) => void;
    renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
    cancel: () => void;
};
declare global {
    interface Window {
        google?: { accounts?: { id?: GoogleId } };
    }
}

const GSI_SRC = "https://accounts.google.com/gsi/client";
let gsiPromise: Promise<GoogleId> | null = null;

function loadGsi(): Promise<GoogleId> {
    if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
    if (gsiPromise) return gsiPromise;
    gsiPromise = new Promise<GoogleId>((resolve, reject) => {
        const done = () => {
            const id = window.google?.accounts?.id;
            if (id) resolve(id);
            else reject(new Error("Google Identity Services unavailable"));
        };
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
        const script = existing ?? document.createElement("script");
        script.addEventListener("load", done, { once: true });
        script.addEventListener("error", () => reject(new Error("Failed to load Google script")), { once: true });
        if (!existing) {
            script.src = GSI_SRC;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }
    }).catch((err) => {
        gsiPromise = null;
        throw err;
    });
    return gsiPromise;
}

let configPromise: Promise<string | null> | null = null;

function getClientId(): Promise<string | null> {
    if (configPromise) return configPromise;
    const fallback = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || null;
    configPromise = api
        .get<{ enabled: boolean; client_id: string | null }>("/auth/google/config")
        .then((res) => (res.data?.enabled && res.data.client_id ? res.data.client_id : fallback))
        .catch(() => {
            configPromise = null;
            return fallback;
        });
    return configPromise;
}

function GoogleMark() {
    return (
        <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
    );
}

type Props = {
    /** Role to use if this Google account is new (Register page). Omit on Login. */
    role?: Role;
    mode?: "signin" | "signup";
    onSuccess: (token: string) => void;
    onError: (message: string) => void;
    /** Called before every attempt so the page can clear old errors. */
    onStart?: () => void;
    /** Rendered above the button (e.g. an "or" divider). */
    header?: React.ReactNode;
    className?: string;
};

export default function GoogleSignInButton({ role, mode = "signin", onSuccess, onError, onStart, header, className }: Props) {
    const { l, lang } = useI18n();
    const { resolved } = useTheme();
    const btnRef = useRef<HTMLDivElement>(null);
    const [clientId, setClientId] = useState<string | null>(null);
    const [configChecked, setConfigChecked] = useState(false);
    const [gsiReady, setGsiReady] = useState(false);
    const [busy, setBusy] = useState(false);
    const [pendingCredential, setPendingCredential] = useState<string | null>(null);

    const latest = useRef({ role, onSuccess, onError, onStart, l });
    latest.current = { role, onSuccess, onError, onStart, l };

    const submit = useCallback(async (credential: string, chosenRole?: Role) => {
        const { onSuccess: ok, onError: fail, onStart: start, l: t } = latest.current;
        start?.();
        setBusy(true);
        try {
            const res = await api.post("/login/google", { credential, role: chosenRole ?? null });
            setPendingCredential(null);
            ok(res.data.access_token);
        } catch (err: unknown) {
            const r = (err as { response?: { status?: number; data?: { detail?: unknown } } })?.response;
            const detail = r?.data?.detail as { code?: string } | string | undefined;
            if (r?.status === 409 && typeof detail === "object" && detail?.code === "ROLE_REQUIRED") {
                setPendingCredential(credential);
            } else if (r?.status === 401) {
                fail(t("تعذّر التحقق من حساب Google. جرّب تاني.", "Couldn't verify your Google account. Please try again."));
            } else if (r?.status === 503) {
                fail(t("الدخول بحساب Google غير مفعّل بعد على السيرفر (أضف GOOGLE_CLIENT_ID).", "Google sign-in isn't configured on the server yet (set GOOGLE_CLIENT_ID)."));
            } else {
                fail(getApiErrorMessage(err, t("تعذّر تسجيل الدخول بحساب Google.", "Could not sign in with Google.")));
            }
        } finally {
            setBusy(false);
        }
    }, []);

    useEffect(() => {
        let alive = true;
        void getClientId().then((id) => {
            if (!alive) return;
            setClientId(id);
            setConfigChecked(true);
        });
        return () => { alive = false; };
    }, []);

    useEffect(() => {
        if (!clientId) {
            setGsiReady(false);
            return;
        }
        let alive = true;
        loadGsi()
            .then((gid) => {
                if (!alive || !btnRef.current) return;
                gid.initialize({
                    client_id: clientId,
                    callback: (resp) => {
                        if (resp.credential) void submit(resp.credential, latest.current.role);
                    },
                    ux_mode: "popup",
                    cancel_on_tap_outside: true,
                    context: mode === "signup" ? "signup" : "signin",
                });
                btnRef.current.innerHTML = "";
                const width = Math.min(400, Math.max(220, Math.round(btnRef.current.getBoundingClientRect().width || 340)));
                gid.renderButton(btnRef.current, {
                    type: "standard",
                    theme: resolved === "dark" ? "filled_black" : "outline",
                    size: "large",
                    shape: "pill",
                    text: mode === "signup" ? "signup_with" : "continue_with",
                    logo_alignment: "center",
                    width,
                    locale: lang,
                });
                setGsiReady(true);
            })
            .catch(() => {
                if (alive) setGsiReady(false);
            });
        return () => { alive = false; };
    }, [clientId, lang, resolved, mode, submit]);

    const handleUnconfiguredClick = () => {
        onStart?.();
        if (!configChecked) return;
        if (!clientId) {
            onError(
                l(
                    "لتفعيل الدخول بحساب Google: أضف GOOGLE_CLIENT_ID في ملف إعدادات السيرفر (local.env أو .env) وأعد تشغيل الباك إند.",
                    "To enable Google Sign-In: set GOOGLE_CLIENT_ID in the backend env file and restart the server.",
                ),
            );
        } else {
            onError(
                l(
                    "تعذّر تحميل خدمة Google (تأكد من الاتصال بالإنترنت أو إيقاف مانع الإعلانات).",
                    "Could not load Google Identity Services (check your connection or ad-blocker).",
                ),
            );
        }
    };

    const roles: { value: Role; icon: typeof GraduationCap; label: string }[] = [
        { value: "student", icon: GraduationCap, label: l("طالب", "Student") },
        { value: "lecturer", icon: Presentation, label: l("مدرس / محاضر", "Lecturer") },
    ];

    return (
        <div className={className}>
            {header}
            <div className="relative flex justify-center">
                {clientId && (
                    <div
                        ref={btnRef}
                        className={cn(
                            "w-full flex justify-center min-h-[44px]",
                            !gsiReady && "sr-only",
                            busy && "pointer-events-none opacity-50",
                        )}
                    />
                )}
                {(!clientId || !gsiReady) && (
                    <button
                        type="button"
                        disabled={!configChecked || busy}
                        onClick={handleUnconfiguredClick}
                        className="w-full py-3 px-4 rounded-full border border-rule bg-sheet hover:bg-sheet-2 text-ink font-bold text-sm transition-all flex items-center justify-center gap-3 shadow-xs disabled:opacity-60"
                    >
                        <GoogleMark />
                        <span>
                            {mode === "signup"
                                ? l("التسجيل باستخدام Google", "Sign up with Google")
                                : l("المتابعة باستخدام Google", "Continue with Google")}
                        </span>
                    </button>
                )}
                {busy && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-pen" />
                    </div>
                )}
            </div>

            {pendingCredential && (
                <div className="mt-4 rounded-xl border border-rule bg-sheet p-4" role="group" aria-label={l("اختار نوع الحساب", "Choose account type")}>
                    <p className="text-sm font-bold text-ink mb-1">
                        {l("أول مرة تدخل بحساب Google ده", "First time with this Google account")}
                    </p>
                    <p className="text-xs text-ink-2 mb-3">
                        {l("اختار نوع حسابك علشان نكمّل إنشاءه.", "Choose your account type to finish creating it.")}
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                        {roles.map(({ value, icon: Icon, label }) => (
                            <button
                                key={value}
                                type="button"
                                disabled={busy}
                                onClick={() => void submit(pendingCredential, value)}
                                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-rule bg-sheet text-sm font-bold text-ink hover:border-pen hover:bg-pen-wash transition-all disabled:opacity-60"
                            >
                                <Icon className="size-4 text-pen" aria-hidden />
                                <span>{label}</span>
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => setPendingCredential(null)}
                        className="mt-3 w-full text-xs font-bold text-ink-3 hover:text-ink"
                    >
                        {l("إلغاء", "Cancel")}
                    </button>
                </div>
            )}
        </div>
    );
}
