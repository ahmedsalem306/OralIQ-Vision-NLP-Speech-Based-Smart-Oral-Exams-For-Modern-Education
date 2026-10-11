import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail } from "lucide-react";
import api from "../lib/api";
import { useI18n } from "../i18n";
import { AuthShell } from "../components/AuthShell";
import { Button } from "../components/ui/button";
import { Field, Input } from "../components/ui/input";
import { PasswordInput } from "../components/ui/password-input";
import { Alert } from "../components/ui/feedback";
import { usePageTitle } from "../lib/usePageTitle";

export default function LoginPage() {
    const { l } = useI18n();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get("redirect") || "/dashboard";
    usePageTitle(l("تسجيل الدخول", "Sign in"));

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams();
            params.append("username", email.trim());
            params.append("password", password);
            const response = await api.post("/login/access-token", params);
            localStorage.setItem("token", response.data.access_token);
            navigate(redirectTo);
        } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            setError(
                status === 400
                    ? l("البريد أو كلمة المرور غير صحيحة. راجعهم وجرّب تاني.", "That email and password don't match. Check them and try again.")
                    : l("تعذّر الوصول للسيرفر. تأكد من الإنترنت وجرّب بعد لحظات.", "Couldn't reach the server. Check your connection and try again shortly."),
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell>
            <h1 className="text-[1.75rem] font-bold">{l("تسجيل الدخول", "Sign in")}</h1>
            <p className="mt-1.5 text-ink-2">
                {redirectTo.startsWith("/exam")
                    ? l("سجّل دخولك عشان تبدأ الامتحان.", "Sign in to start your exam.")
                    : l("أهلاً بعودتك إلى OralIQ.", "Welcome back to OralIQ.")}
            </p>

            {error && <Alert tone="error" className="mt-6">{error}</Alert>}

            <form onSubmit={handleLogin} className="mt-8 flex flex-col gap-5" noValidate={false}>
                <Field label={l("البريد الإلكتروني", "Email")} htmlFor="email">
                    <Input
                        id="email" type="email" icon={<Mail />} autoComplete="email" required dir="ltr"
                        value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@uni.edu.eg"
                    />
                </Field>
                <Field label={l("كلمة المرور", "Password")} htmlFor="password">
                    <PasswordInput
                        id="password" autoComplete="current-password" required
                        value={password} onChange={(e) => setPassword(e.target.value)}
                    />
                </Field>
                <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
                    {loading ? l("جاري الدخول…", "Signing in…") : l("تسجيل الدخول", "Sign in")}
                </Button>
            </form>

            <p className="mt-8 text-center text-ink-2">
                {l("أول مرة تستخدم OralIQ؟", "New to OralIQ?")}{" "}
                <Link to={`/register?redirect=${encodeURIComponent(redirectTo)}`} className="font-semibold text-pen hover:underline">
                    {l("أنشئ حساب", "Create an account")}
                </Link>
            </p>
        </AuthShell>
    );
}
