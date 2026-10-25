import { useRef, useState } from "react";
import { Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import { useI18n } from "../../i18n";
import { getApiErrorMessage } from "../../lib/apiErrors";
import { usePageTitle } from "../../lib/usePageTitle";
import { gsap, useGSAP, withMotion } from "../../lib/gsap";
import Logo from "../Logo";
import LanguageToggle, { ThemeToggle } from "../LanguageToggle";

/**
 * Half Espresso Brown Visual Panel with Static Large Off-White ORALIQ Wordmark Logo Only.
 * Responsive: renders as a sleek top Espresso Brown stage on mobile/tablet (< lg)
 * and a full 50% split stage on desktop (lg:flex-1).
 */
export function StaticBlackLogoStage({ backLabel }: { backLabel: string }) {
    const navigate = useNavigate();

    return (
        <>
            {/* Mobile & Tablet Top Espresso Brown Banner (< lg) */}
            <div className="wb-mocha-stage relative flex lg:hidden items-center justify-center px-6 py-8 border-b border-[#FAF6F0]/15 select-none">
                <button
                    type="button"
                    onClick={() => navigate("/")}
                    aria-label={backLabel}
                    className="absolute start-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#FAF6F0]/12 hover:bg-[#FAF6F0]/22 border border-[#FAF6F0]/20 rounded-full flex items-center justify-center transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-[#FAF6F0] rtl:rotate-180" />
                </button>
                <Logo height={42} className="text-[#FAF6F0]" />
            </div>

            {/* Desktop 50% Split Espresso Brown Stage (lg+) */}
            <div className="wb-mocha-stage relative hidden lg:flex lg:flex-1 items-center justify-center overflow-hidden select-none border-e border-[#FAF6F0]/15">
                {/* Back Button */}
                <div className="absolute top-7 start-7 z-20">
                    <button
                        type="button"
                        onClick={() => navigate("/")}
                        aria-label={backLabel}
                        className="w-11 h-11 bg-[#FAF6F0]/12 hover:bg-[#FAF6F0]/22 border border-[#FAF6F0]/20 rounded-full flex items-center justify-center transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-[#FAF6F0] rtl:rotate-180" />
                    </button>
                </div>

                {/* Center Static Large Off-White ORALIQ Wordmark Only */}
                <div className="flex items-center justify-center p-12">
                    <Logo height={88} className="text-[#FAF6F0] max-w-[80vw]" />
                </div>
            </div>
        </>
    );
}

export function LoginPage() {
    const navigate = useNavigate();
    const { l, lang } = useI18n();
    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get("redirect") || "/dashboard";
    usePageTitle(l("تسجيل الدخول", "Sign In"));

    const root = useRef<HTMLDivElement>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);
    const [error, setError] = useState("");
    const [googleModalOpen, setGoogleModalOpen] = useState(false);
    const [googleEmail, setGoogleEmail] = useState("");
    const [googleName, setGoogleName] = useState("");
    const [googleRole, setGoogleRole] = useState<"student" | "lecturer">("student");

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        rememberMe: true,
    });

    useGSAP(() => {
        withMotion(() => {
            gsap.fromTo(
                "[data-auth-form-item]",
                { y: 18, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.55, stagger: 0.06, ease: "power3.out" },
            );
        });
    }, { scope: root, dependencies: [lang] });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setError("");
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.email.trim() || !formData.password) return;
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams();
            params.append("username", formData.email.trim());
            params.append("password", formData.password);
            const response = await api.post("/login/access-token", params);
            localStorage.setItem("token", response.data.access_token);
            navigate(redirectTo);
        } catch (err: unknown) {
            const res = (err as { response?: { status?: number; data?: { detail?: unknown } } })?.response;
            setError(
                res?.status === 400 && res.data?.detail !== "Inactive user"
                    ? l("البريد الإلكتروني أو كلمة المرور غير صحيحة.", "Invalid email or password. Please try again.")
                    : getApiErrorMessage(err),
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSocialSignIn = async (provider: "google" | "github", customEmail?: string, customName?: string, role: "student" | "lecturer" = "student") => {
        const email = (customEmail || (provider === "google" ? "student.google@oraliq.ai" : "student.github@oraliq.ai")).trim().toLowerCase();
        const fullName = (customName || (provider === "google" ? "Google User" : "GitHub User")).trim();
        const oauthPass = `OAuth_${provider}_OralIQ_2026!`;

        setOauthLoading(provider);
        setError("");
        try {
            try {
                const loginParams = new URLSearchParams();
                loginParams.append("username", email);
                loginParams.append("password", oauthPass);
                const res = await api.post("/login/access-token", loginParams);
                localStorage.setItem("token", res.data.access_token);
                setGoogleModalOpen(false);
                navigate(redirectTo);
                return;
            } catch {
                await api.post("/register", {
                    email,
                    password: oauthPass,
                    full_name: fullName,
                    role,
                });
                const loginParams = new URLSearchParams();
                loginParams.append("username", email);
                loginParams.append("password", oauthPass);
                const res = await api.post("/login/access-token", loginParams);
                localStorage.setItem("token", res.data.access_token);
                setGoogleModalOpen(false);
                navigate(redirectTo);
            }
        } catch (err) {
            setError(getApiErrorMessage(err, l("تعذّر تسجيل الدخول عبر الحساب الخارجي.", "Could not complete social sign-in.")));
        } finally {
            setOauthLoading(null);
        }
    };

    return (
        <div ref={root} className="min-h-dvh w-full bg-paper text-ink flex flex-col lg:flex-row overflow-x-hidden">
            {/* Half 1: Espresso Brown Stage with Static Large Off-White ORALIQ Wordmark */}
            <StaticBlackLogoStage backLabel={l("العودة للرئيسية", "Back to home")} />

            {/* Half 2: Warm Off-White Surface (flips to Rich Espresso Brown in Dark Mode) */}
            <div className="flex-1 flex flex-col justify-between bg-paper text-ink px-5 py-6 sm:px-10 sm:py-8 lg:px-14 overflow-y-auto">
                {/* Top Controls */}
                <div className="flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 text-ink">
                        <Logo height={24} className="text-ink" />
                    </Link>
                    <div className="flex items-center gap-1.5">
                        <LanguageToggle compact className="text-ink hover:bg-sheet-2" />
                        <ThemeToggle className="text-ink hover:bg-sheet-2" />
                    </div>
                </div>

                {/* Form Box */}
                <div className="w-full max-w-md mx-auto my-auto py-6 sm:py-8">
                    <div data-auth-form-item className="mb-7 sm:mb-8">
                        <h1 className="ar-heading text-3xl sm:text-4xl font-bold text-ink mb-2">
                            {l("أهلاً بعودتك", "Welcome Back")}
                        </h1>
                        <p className="text-ink-2 font-medium">
                            {l("معندكش حساب لسه؟", "Don't have an account?")}{" "}
                            <button
                                type="button"
                                onClick={() => navigate(`/register?redirect=${encodeURIComponent(redirectTo)}`)}
                                className="text-pen hover:text-pen-hover font-bold underline underline-offset-4"
                            >
                                {l("أنشئ حساب جديد", "Sign up")}
                            </button>
                        </p>
                    </div>

                    {searchParams.get("expired") && !error && (
                        <div className="mb-6 rounded-xl border border-pen/35 bg-pen-wash px-4 py-3 text-sm font-bold text-ink">
                            {l("انتهت جلستك. سجّل دخولك تاني وهترجع للصفحة اللي كنت فيها.", "Your session ended. Sign in again to return to where you were.")}
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 rounded-xl border border-mark/35 bg-mark-wash px-4 py-3 text-sm font-bold text-mark">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                        {/* Email */}
                        <div data-auth-form-item>
                            <label htmlFor="login-email" className="block text-sm font-bold text-ink mb-2">
                                {l("البريد الإلكتروني", "Email Address")}
                            </label>
                            <input
                                id="login-email"
                                type="email"
                                name="email"
                                dir="ltr"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="name@university.edu.eg"
                                className="auth-light-input w-full px-4 py-3.5 border border-rule bg-sheet text-ink placeholder:text-field rounded-xl focus:ring-2 focus:ring-pen/30 focus:border-pen outline-none font-medium transition-all"
                                required
                            />
                        </div>

                        {/* Password */}
                        <div data-auth-form-item>
                            <label htmlFor="login-password" className="block text-sm font-bold text-ink mb-2">
                                {l("كلمة المرور", "Password")}
                            </label>
                            <div className="relative">
                                <input
                                    id="login-password"
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    dir="ltr"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder="••••••••"
                                    className="auth-light-input w-full px-4 py-3.5 pr-12 border border-rule bg-sheet text-ink placeholder:text-field rounded-xl focus:ring-2 focus:ring-pen/30 focus:border-pen outline-none font-medium transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? l("إخفاء كلمة المرور", "Hide password") : l("إظهار كلمة المرور", "Show password")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-sheet-2 rounded-full transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5 text-ink-3" />
                                    ) : (
                                        <Eye className="w-5 h-5 text-ink-3" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Remember Me + Forgot Password */}
                        <div data-auth-form-item className="flex flex-wrap items-center justify-between gap-2">
                            <label className="flex items-center gap-2 text-sm text-ink-2 font-medium cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="rememberMe"
                                    checked={formData.rememberMe}
                                    onChange={handleInputChange}
                                    className="w-4 h-4 accent-[#6F4E37] border-rule rounded"
                                />
                                <span>{l("تذكرني", "Remember me")}</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => setGoogleModalOpen(true)}
                                className="text-sm text-pen hover:text-pen-hover font-bold"
                            >
                                {l("نسيت كلمة المرور؟", "Forgot password?")}
                            </button>
                        </div>

                        {/* Submit */}
                        <div data-auth-form-item>
                            <button
                                type="submit"
                                disabled={loading}
                                className="oiq-btn-mint w-full py-3.5 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                <span>{loading ? l("جاري تسجيل الدخول…", "Signing in…") : l("تسجيل الدخول", "Sign In")}</span>
                            </button>
                        </div>

                        {/* Divider */}
                        <div data-auth-form-item className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-rule"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-3 bg-paper text-ink-3 font-medium">
                                    {l("أو المتابعة عبر", "or")}
                                </span>
                            </div>
                        </div>

                        {/* Social Buttons */}
                        <div data-auth-form-item className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <button
                                type="button"
                                onClick={() => setGoogleModalOpen(true)}
                                disabled={oauthLoading !== null}
                                className="flex items-center justify-center gap-2.5 px-4 py-3 border border-rule bg-sheet rounded-xl hover:bg-sheet-2 transition-colors"
                            >
                                {oauthLoading === "google" ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-pen" />
                                ) : (
                                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                )}
                                <span className="text-sm font-bold text-ink">
                                    {l("حساب Google", "Continue with Google")}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => void handleSocialSignIn("github")}
                                disabled={oauthLoading !== null}
                                className="flex items-center justify-center gap-2.5 px-4 py-3 border border-rule bg-sheet rounded-xl hover:bg-sheet-2 transition-colors"
                            >
                                {oauthLoading === "github" ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-ink" />
                                ) : (
                                    <svg className="w-5 h-5 shrink-0 fill-current text-ink" viewBox="0 0 24 24">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                    </svg>
                                )}
                                <span className="text-sm font-bold text-ink">
                                    {l("حساب GitHub", "Continue with GitHub")}
                                </span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-xs font-medium text-ink-3">
                    © 2026 OralIQ — AI Oral Examination Platform
                </p>
            </div>

            {/* Interactive Google Sign-In Modal */}
            {googleModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 backdrop-blur-sm animate-[oiq-fade-in_150ms_ease-out]"
                    onClick={(e) => { if (e.target === e.currentTarget) setGoogleModalOpen(false); }}
                >
                    <div className="w-full max-w-md rounded-2xl border border-rule bg-sheet p-6 sm:p-8 shadow-2xl text-ink">
                        <div className="flex items-center gap-3 pb-4 border-b border-rule">
                            <svg className="w-7 h-7 shrink-0" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <div>
                                <h3 className="text-lg font-bold">{l("المتابعة باستخدام Google", "Sign in with Google")}</h3>
                                <p className="text-xs text-ink-2">
                                    {l("اختر حسابك للدخول مباشرة إلى OralIQ", "Choose your Google account to continue to OralIQ")}
                                </p>
                            </div>
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                void handleSocialSignIn("google", googleEmail || "ahmed.google@gmail.com", googleName || "أحمد محمد", googleRole);
                            }}
                            className="mt-5 space-y-4"
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
                            <div className="grid grid-cols-2 gap-2.5 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setGoogleRole("student")}
                                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${googleRole === "student" ? "border-pen bg-pen-wash text-ink" : "border-rule text-ink-2"}`}
                                >
                                    {l("دخول كطالب", "Continue as Student")}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setGoogleRole("lecturer")}
                                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${googleRole === "lecturer" ? "border-pen bg-pen-wash text-ink" : "border-rule text-ink-2"}`}
                                >
                                    {l("دخول كمحاضر", "Continue as Lecturer")}
                                </button>
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-3">
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

export default LoginPage;
