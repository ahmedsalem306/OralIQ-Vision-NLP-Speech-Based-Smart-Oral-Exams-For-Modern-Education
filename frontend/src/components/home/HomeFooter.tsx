import { Link } from "react-router-dom";
import { useI18n } from "../../i18n";
import Logo from "../Logo";
import { COMPANY, telHref } from "../../content/company";

/** The footer: what the company is, how to reach it, and the page's own links. */
export function HomeFooter({ sections }: { sections: { href: string; label: string }[] }) {
    const { l } = useI18n();
    const head = "mb-4 text-sm font-semibold text-home-ink";
    return (
        <footer className="home-b border-t border-home-line text-home-muted">
            <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
                <div className="col-span-2 md:col-span-1">
                    <Logo height={24} className="text-home-ink" title="OralIQ" />
                    <p className="mt-5 max-w-xs leading-relaxed">{l("أول منصة عربية للامتحانات الشفوية أونلاين: الطالب بيجاوب بصوته، والدرجة بتوصلك جاهزة.", "The first Arabic platform for online oral exams: students answer out loud, and the grade reaches you ready.")}</p>
                </div>
                <div>
                    <p className={head}>{l("تواصل", "Contact")}</p>
                    <ul className="space-y-2.5">
                        <li><a href={`mailto:${COMPANY.email}`} className="ltr inline-block hover:text-home-ink">{COMPANY.email}</a></li>
                        {COMPANY.phone && <li><a href={telHref(COMPANY.phone)} className="ltr inline-block tabular hover:text-home-ink">{COMPANY.phone}</a></li>}
                        {COMPANY.location.ar && <li>{l(COMPANY.location.ar, COMPANY.location.en)}</li>}
                    </ul>
                </div>
                <nav aria-label={l("أقسام الصفحة", "Page sections")}>
                    <p className={head}>{l("الصفحة", "On this page")}</p>
                    <ul className="space-y-2.5">
                        {sections.map((s) => <li key={s.href}><a href={s.href} className="hover:text-home-ink">{s.label}</a></li>)}
                    </ul>
                </nav>
                <nav aria-label={l("الحساب", "Account")}>
                    <p className={head}>{l("الحساب", "Account")}</p>
                    <ul className="space-y-2.5">
                        <li><Link to="/register" className="hover:text-home-ink">{l("أنشئ حساب", "Create account")}</Link></li>
                        <li><Link to="/login" className="hover:text-home-ink">{l("تسجيل الدخول", "Sign in")}</Link></li>
                    </ul>
                </nav>
            </div>
            <div className="border-t border-home-line">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm sm:px-6">
                    <p>© 2026 {COMPANY.name}</p>
                    <p>{l("منتج من", "A product by")} <span className="text-home-ink">{COMPANY.maker}</span></p>
                </div>
            </div>
        </footer>
    );
}
