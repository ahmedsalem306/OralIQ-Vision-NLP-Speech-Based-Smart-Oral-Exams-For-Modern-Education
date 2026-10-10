import { ButtonLink } from "../components/ui/button";
import Logo from "../components/Logo";
import { useI18n } from "../i18n";

export default function NotFound() {
    const { l } = useI18n();
    const loggedIn = (() => { try { return !!localStorage.getItem("token"); } catch { return false; } })();
    return (
        <main className="flex min-h-dvh flex-col items-center justify-center bg-paper px-6 text-center">
            <Logo size={34} className="mb-10" />
            <p className="font-display text-6xl font-bold text-ink-3 tabular">404</p>
            <h1 className="mt-4 text-2xl font-bold">{l("الصفحة دي مش موجودة", "This page doesn't exist")}</h1>
            <p className="mt-2 max-w-sm text-ink-2">
                {l("ممكن يكون الرابط اتكتب غلط أو اتشال. لو ده رابط امتحان، اطلب من المحاضر يبعته تاني.",
                    "The link may be mistyped or removed. If it's an exam link, ask your lecturer to send it again.")}
            </p>
            <ButtonLink to={loggedIn ? "/dashboard" : "/"} className="mt-8">
                {loggedIn ? l("الرجوع للوحة التحكم", "Back to dashboard") : l("الصفحة الرئيسية", "Home page")}
            </ButtonLink>
        </main>
    );
}
