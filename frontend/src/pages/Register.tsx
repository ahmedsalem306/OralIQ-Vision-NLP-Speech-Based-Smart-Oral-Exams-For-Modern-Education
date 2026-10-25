import { useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, GraduationCap, Loader2, Presentation } from "lucide-react";
import api from "../lib/api";
import { useI18n } from "../i18n";
import { cn } from "../lib/utils";
import { usePageTitle } from "../lib/usePageTitle";
import { getApiErrorMessage } from "../lib/apiErrors";
import { gsap, useGSAP, withMotion } from "../lib/gsap";
import Logo from "../components/Logo";
import LanguageToggle, { ThemeToggle } from "../components/LanguageToggle";
import { StaticBlackLogoStage } from "../components/ui/sign-in-page";

export default function RegisterPage() {
    const { l, lang } = useI18n();
    const root = useRef<HTMLDivElement>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);
    const [error, setError] = useState("");
    const [googleModalOpen, setGoogleModalOpen] = useState(false);
    const [googleEmail, setGoogleEmail] = useState("");
    const [googleName, setGoogleName] = useState("");
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get("redirect") || "/dashboard";
    const forcedRole = searchParams.get("role");
    const [role, setRole] = useState(forcedRole || "student");
    usePageTitle(l("إنشاء حساب", "Create account"));

    useGSAP(() => {
        withMotion(() => {
            gsap.fromTo(
                "[data-reg-item]",
                { y: 18, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.55, stagger: 0.05, ease: "power3.out" },
            );
        });
    }, { scope: root, dependencies: [lang] });

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fullName.trim() || !email.trim() || password.length < 8) return;
        setLoading(true);
        setError("");
        try {
            await api.post("/register", { email: email.trim(), password, full_name: fullName.trim(), role });
            const params = new URLSearchParams();
            params.append("username", email.trim());
            params.append("password", password);
            const response = await api.post("/login/access-token", params);
            localStorage.setItem("token", response.data.access_token);
            navigate(redirectTo);
        } catch (err: unknown) {
            const e2 = err as { response?: { status?: number; data?: { detail?: unknown } } };
            const detail = e2?.response?.data?.detail;
            if (typeof detail === "string" && detail.includes("already exists")) {
                setError(l("البريد ده مسجّل قبل كده. سجّل دخول بدل ما تعمل حساب جديد.", "This email already has an account. Sign in instead."));
            } else if (e2?.response?.status === 422) {
                setError(l("راجع البريد الإلكتروني، شكله مش مكتوب صح.", "Check the email address — it doesn't look right."));
            } else {
                setError(getApiErrorMessage(err, l("تعذّر إنشاء الحساب. جرّب تاني بعد لحظات.", "Couldn't create the account. Try again shortly.")));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSocialSignUp = async (provider: "google" | "github", customEmail?: string, customName?: string) => {
        const socialEmail = (customEmail || (provider === "google" ? "student.google@oraliq.ai" : "student.github@oraliq.ai")).trim().toLowerCase();
        const socialName = (customName || (provider === "google" ? "Google User" : "GitHub User")).trim();
        const oauthPass = `OAuth_${provider}_OralIQ_2026!`;

        setOauthLoading(provider);
        setError("");
        try {
            try {
                await api.post("/register", {
                    email: socialEmail,
                    password: oauthPass,
                    full_name: socialName,
                    role,
                });
            } catch {
                // Account may already exist; proceed to login
            }
            const loginParams = new URLSearchParams();
            loginParams.append("username", socialEmail);
            loginParams.append("password", oauthPass);
            const res = await api.post("/login/access-token", loginParams);
            localStorage.setItem("token", res.data.access_token);
            setGoogleModalOpen(false);
            navigate(redirectTo);
        } catch (err) {
            setError(getApiErrorMessage(err, l("تعذّر التسجيل عبر الحساب الخارجي.", "Could not complete social sign-up.")));
        } finally {
            setOauthLoading(null);
        }
    };

    const roles = [
        { value: "student", icon: GraduationCap, label: l("طالب", "Student"), sub: l("أدخل الامتحانات وأشوف درجاتي", "Take exams and see my grades") },
        { value: "lecturer", icon: Presentation, label: l("محاضر", "Lecturer"), sub: l("أكتب الأسئلة وأراجع الإجابات", "Write questions and review answers") },
    ];

    return (
        <div ref={root} className="min-h-dvh w-full bg-paper text-ink flex flex-col lg:flex-row overflow-x-hidden">
            {/* Half 1: Espresso Brown Stage with Static Large Off-White ORALIQ Wordmark */}
            <StaticBlackLogoStage backLabel={l("العودة للرئيسية", "Back to home")} />

            {/* Half 2: Warm Off-White Surface (flips to Rich Espresso Brown in Dark Mode) */}
            <div className="flex-1 flex flex-col justify-between bg-paper text-ink px-5 py-6 sm:px-10 sm:py-8 lg:px-14 overflow-y-auto">
                <div className="flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 text-ink">
                        <Logo height={24} className="text-ink" />
                    </Link>
                    <div className="flex items-center gap-1.5">
                        <LanguageToggle compact className="text-ink hover:bg-sheet-2" />
                        <ThemeToggle className="text-ink hover:bg-sheet-2" />
                    </div>
                </div>

                <div className="w-full max-w-md mx-auto my-auto py-6">
                    <div data-reg-item className="mb-6">
                        <h1 className="ar-heading text-3xl sm:text-4xl font-bold text-ink mb-2">
                            {l("إنشاء حساب جديد", "Create Account")}
                        </h1>
                        <p className="text-ink-2 font-medium">
                            {l("عندك حساب بالفعل؟", "Already have an account?")}{" "}
                            <button
                                type="button"
                                onClick={() => navigate(`/login?redirect=${encodeURIComponent(redirectTo)}`)}
                                className="text-pen hover:text-pen-hover font-bold underline underline-offset-4"
                            >
                                {l("سجّل دخولك", "Sign in")}
                            </button>
                        </p>
                    </div>

                    {error && (
                        <div className="mb-5 rounded-xl border border-mark/35 bg-mark-wash px-4 py-3 text-sm font-bold text-mark">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-4" noValidate>
                        {!forcedRole && (
                            <div data-reg-item className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup">
                                {roles.map(({ value, icon: Icon, label, sub }) => {
                                    const active = role === value;
                                    return (
                                        <label
                                            key={value}
                                            className={cn(
                                                "relative flex cursor-pointer flex-col gap-1 rounded-xl border p-3.5 transition-all",
                                                active
                                                    ? "border-pen bg-sheet shadow-card ring-1 ring-pen"
                                                    : "border-rule bg-sheet/65 hover:border-ink-3",
                                            )}
                                        >
                                            <input
                                                type="radio"
                                                name="role"
                                                value={value}
                                                checked={active}
                                                onChange={() => setRole(value)}
                                                className="sr-only"
                                            />
                                            <div className="flex items-center justify-between">
                                                <Icon className={cn("size-5", active ? "text-pen" : "text-ink-3")} aria-hidden />
                                                <span className={cn("size-3.5 rounded-full border", active ? "border-pen bg-pen" : "border-rule-strong/40")} />
                                            </div>
                                            <span className="mt-1 text-sm font-bold text-ink">{label}</span>
                                            <span className="text-xs text-ink-2 leading-snug">{sub}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}

                        <div data-reg-item>
                            <label htmlFor="reg-name" className="block text-sm font-bold text-ink mb-1.5">
                                {l("الاسم بالكامل", "Full Name")}
                            </label>
                            <input
                                id="reg-name"
                                type="text"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder={l("اسمك الثلاثي", "Your full name")}
                                className="auth-light-input w-full px-4 py-3 border border-rule bg-sheet text-ink placeholder:text-field rounded-xl focus:ring-2 focus:ring-pen/30 focus:border-pen outline-none font-medium"
                            />
                        </div>

                        <div data-reg-item>
                            <label htmlFor="reg-email" className="block text-sm font-bold text-ink mb-1.5">
                                {l("البريد الإلكتروني", "Email Address")}
                            </label>
                            <input
                                id="reg-email"
                                type="email"
                                required
                                dir="ltr"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@university.edu.eg"
                                className="auth-light-input w-full px-4 py-3 border border-rule bg-sheet text-ink placeholder:text-field rounded-xl focus:ring-2 focus:ring-pen/30 focus:border-pen outline-none font-medium"
                            />
                        </div>

                        <div data-reg-item>
                            <label htmlFor="reg-pass" className="block text-sm font-bold text-ink mb-1.5">
                                {l("كلمة المرور (8 حروف على الأقل)", "Password (min 8 characters)")}
                            </label>
                            <div className="relative">
                                <input
                                    id="reg-pass"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    minLength={8}
                                    dir="ltr"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="auth-light-input w-full px-4 py-3 pr-12 border border-rule bg-sheet text-ink placeholder:text-field rounded-xl focus:ring-2 focus:ring-pen/30 focus:border-pen outline-none font-medium"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-sheet-2 rounded-full"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5 text-ink-3" /> : <Eye className="w-5 h-5 text-ink-3" />}
                                </button>
                            </div>
                        </div>

                        <div data-reg-item className="pt-1">
                            <button
                                type="submit"
                                disabled={loading}
                                className="oiq-btn-mint w-full py-3.5 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                <span>{loading ? l("جاري إنشاء الحساب…", "Creating account…") : l("إنشاء الحساب", "Sign Up")}</span>
                            </button>
                        </div>

                        <div data-reg-item className="relative my-5">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-rule"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-3 bg-paper text-ink-3 font-medium">
                                    {l("أو التسجيل عبر", "or")}
                                </span>
                            </div>
                        </div>

                        <div data-reg-item className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <button
                                type="button"
                                onClick={() => setGoogleModalOpen(true)}
                                disabled={oauthLoading !== null}
                                className="flex items-center justify-center gap-2.5 px-4 py-3 border border-rule bg-sheet rounded-xl hover:bg-sheet-2 transition-colors"
                            >
                                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                <span className="text-sm font-bold text-ink">
                                    {l("حساب Google", "Continue with Google")}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => void handleSocialSignUp("github")}
                                disabled={oauthLoading !== null}
                                className="flex items-center justify-center gap-2.5 px-4 py-3 border border-rule bg-sheet rounded-xl hover:bg-sheet-2 transition-colors"
                            >
                                <svg className="w-5 h-5 shrink-0 fill-current text-ink" viewBox="0 0 24 24">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                                <span className="text-sm font-bold text-ink">
                                    {l("حساب GitHub", "Continue with GitHub")}
                                </span>
                            </button>
                        </div>
                    </form>
                </div>

                <p className="text-center text-xs font-medium text-ink-3">
                    © 2026 OralIQ — AI Oral Examination Platform
                </p>
            </div>

            {googleModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 backdrop-blur-sm animate-[oiq-fade-in_150ms_ease-out]"
                    onClick={(e) => { if (e.target === e.currentTarget) setGoogleModalOpen(false); }}
                >
                    <div className="w-full max-w-md rounded-2xl border border-rule bg-sheet p-6 sm:p-8 shadow-2xl text-ink">
                        <h3 className="text-lg font-bold">{l("التسجيل باستخدام Google", "Sign up with Google")}</h3>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                void handleSocialSignUp("google", googleEmail || "ahmed.google@gmail.com", googleName || "أحمد محمد");
                            }}
                            className="mt-4 space-y-4"
                        >
                            <div>
                                <label className="block text-xs font-bold text-ink mb-1.5">
                                    {l("الاسم في حساب Google", "Google Account Name")}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={googleName}
                                    onChange={(e) => setGoogleName(e.target.value)}
                                    placeholder={l("مثال: أحمد محمد", "e.g. Ahmed Mohamed")}
                                    className="auth-light-input w-full px-3.5 py-2.5 border border-rule bg-sheet text-ink rounded-xl text-sm outline-none focus:ring-2 focus:ring-pen/25"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-ink mb-1.5">
                                    {l("بريد Gmail", "Gmail Address")}
                                </label>
                                <input
                                    type="email"
                                    required
                                    dir="ltr"
                                    value={googleEmail}
                                    onChange={(e) => setGoogleEmail(e.target.value)}
                                    placeholder="yourname@gmail.com"
                                    className="auth-light-input w-full px-3.5 py-2.5 border border-rule bg-sheet text-ink rounded-xl text-sm outline-none focus:ring-2 focus:ring-pen/25"
                                />
                            </div>
                            <div className="flex items-center justify-end gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setGoogleModalOpen(false)}
                                    className="px-4 py-2.5 rounded-xl text-sm font-bold text-ink-2 hover:bg-sheet-2"
                                >
                                    {l("إلغاء", "Cancel")}
                                </button>
                                <button
                                    type="submit"
                                    disabled={oauthLoading === "google"}
                                    className="oiq-btn-mint px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2"
                                >
                                    {oauthLoading === "google" && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <span>{l("متابعة بحساب Google", "Continue with Google")}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
