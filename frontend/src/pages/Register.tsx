import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { GraduationCap, Presentation, Mail, User } from "lucide-react";
import api from "../lib/api";
import { useI18n } from "../i18n";
import { cn } from "../lib/utils";
import { AuthShell } from "../components/AuthShell";
import { Button } from "../components/ui/button";
import { Field, Input } from "../components/ui/input";
import { PasswordInput } from "../components/ui/password-input";
import { Alert } from "../components/ui/feedback";
import { usePageTitle } from "../lib/usePageTitle";

export default function RegisterPage() {
    const { l } = useI18n();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get("redirect") || "/dashboard";
    const forcedRole = searchParams.get("role");
    const [role, setRole] = useState(forcedRole || "student");
    usePageTitle(l("إنشاء حساب", "Create account"));

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
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
                setError(typeof detail === "string" ? detail : l("تعذّر إنشاء الحساب. جرّب تاني بعد لحظات.", "Couldn't create the account. Try again shortly."));
            }
        } finally {
            setLoading(false);
        }
    };

    const roles = [
        { value: "student", icon: GraduationCap, label: l("طالب", "Student"), sub: l("أدخل الامتحانات وأشوف درجاتي", "Take exams and see my grades") },
        { value: "lecturer", icon: Presentation, label: l("محاضر", "Lecturer"), sub: l("أكتب الأسئلة وأراجع الإجابات", "Write questions and review answers") },
    ];

    return (
        <AuthShell scene="signup">
            <h1 className="text-[1.75rem] font-bold">{l("إنشاء حساب", "Create your account")}</h1>
            <p className="mt-1.5 text-ink-2">
                {forcedRole === "student"
                    ? l("أنشئ حساب طالب عشان تدخل الامتحان اللي اتبعتلك.", "Create a student account to open the exam you were sent.")
                    : l("بياخد أقل من دقيقة.", "It takes less than a minute.")}
            </p>

            {error && (
                <Alert
                    tone="error"
                    className="mt-6"
                    action={error.includes("سجّل دخول") || error.includes("Sign in")
                        ? <Link to={`/login?redirect=${encodeURIComponent(redirectTo)}`} className="text-sm font-semibold text-pen hover:underline">{l("تسجيل الدخول", "Sign in")}</Link>
                        : undefined}
                >
                    {error}
                </Alert>
            )}

            <form onSubmit={handleRegister} className="mt-8 flex flex-col gap-5">
                {!forcedRole && (
                    <fieldset>
                        <legend className="mb-1.5 text-sm font-semibold">{l("أنا", "I'm a")}</legend>
                        <div className="grid grid-cols-2 gap-3" role="radiogroup">
                            {roles.map(({ value, icon: Icon, label, sub }) => {
                                const active = role === value;
                                return (
                                    <label
                                        key={value}
                                        className={cn(
                                            "relative flex cursor-pointer flex-col gap-1 rounded-[var(--radius-control)] border p-3.5 transition-colors",
                                            "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-pen has-[:focus-visible]:outline-offset-2",
                                            active ? "border-pen bg-pen-wash" : "border-field bg-sheet hover:border-ink-2",
                                        )}
                                    >
                                        <input type="radio" name="role" value={value} checked={active} onChange={() => setRole(value)} className="sr-only" />
                                        <Icon className={cn("size-5", active ? "text-pen" : "text-ink-3")} aria-hidden />
                                        <span className="font-semibold">{label}</span>
                                        <span className="text-xs leading-snug text-ink-2">{sub}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </fieldset>
                )}

                <Field label={l("الاسم بالكامل", "Full name")} htmlFor="fullName" hint={l("هيظهر للمحاضر في النتائج.", "Your lecturer sees this in results.")}>
                    <Input
                        id="fullName" icon={<User />} autoComplete="name" required aria-describedby="fullName-hint"
                        value={fullName} onChange={(e) => setFullName(e.target.value)}
                    />
                </Field>
                <Field label={l("البريد الإلكتروني", "Email")} htmlFor="email">
                    <Input
                        id="email" type="email" icon={<Mail />} autoComplete="email" required dir="ltr"
                        value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@uni.edu.eg"
                    />
                </Field>
                <Field label={l("كلمة المرور", "Password")} htmlFor="password" hint={l("8 حروف أو أرقام على الأقل.", "At least 8 characters.")}>
                    <PasswordInput
                        id="password" autoComplete="new-password" required minLength={8} aria-describedby="password-hint"
                        value={password} onChange={(e) => setPassword(e.target.value)}
                    />
                </Field>
                <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
                    {loading ? l("جاري إنشاء الحساب…", "Creating account…") : l("إنشاء الحساب", "Create account")}
                </Button>
            </form>

            <p className="mt-8 text-center text-ink-2">
                {l("عندك حساب؟", "Already have an account?")}{" "}
                <Link to={`/login?redirect=${encodeURIComponent(redirectTo)}`} className="font-semibold text-pen hover:underline">
                    {l("سجّل دخولك", "Sign in")}
                </Link>
            </p>
        </AuthShell>
    );
}
