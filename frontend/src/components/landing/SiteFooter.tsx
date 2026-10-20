import { Link } from "react-router-dom";
import { useI18n } from "../../i18n";
import { COMPANY } from "../../content/company";
import Logo from "../Logo";

export function SiteFooter() {
    const { l } = useI18n();
    const links = [
        { href: "#about", label: l("من نحن", "About") },
        { href: "#offer", label: l("خدماتنا", "Services") },
        { href: "#video", label: l("الفيديو", "Video") },
        { href: "#integrate", label: l("لمنصتك", "For your platform") },
        { href: "#contact", label: l("تواصل معنا", "Contact") },
    ];
    return (
        <footer className="bg-black text-white">
            <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
                <div>
                    <Logo size={32} light />
                    <p className="mt-5 max-w-sm leading-relaxed text-white/65">
                        {l("أول منصة عربية للامتحانات الشفوية أونلاين: الطالب يجاوب بصوته، والتصحيح يوصل جاهز.", "The first Arabic platform for online oral exams: students answer out loud, and the grading arrives done.")}
                    </p>
                </div>
                <nav aria-label={l("أقسام الصفحة", "Page sections")}>
                    <ul className="space-y-3 text-white/70">
                        {links.map((x) => <li key={x.href}><a href={x.href} className="hover:text-white">{x.label}</a></li>)}
                    </ul>
                </nav>
                <nav aria-label={l("الحساب", "Account")}>
                    <ul className="space-y-3 text-white/70">
                        <li><Link to="/register" className="hover:text-white">{l("أنشئ حساب", "Create account")}</Link></li>
                        <li><Link to="/login" className="hover:text-white">{l("تسجيل الدخول", "Sign in")}</Link></li>
                        <li><a href={`mailto:${COMPANY.email}`} className="ltr hover:text-white">{COMPANY.email}</a></li>
                    </ul>
                </nav>
            </div>
            <div className="border-t border-white/10">
                <p className="mx-auto max-w-7xl px-4 py-6 text-sm text-white/50 sm:px-6">© 2026 {COMPANY.name}</p>
            </div>
        </footer>
    );
}
