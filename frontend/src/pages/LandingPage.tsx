import { useState } from "react";
import { Link } from "react-router-dom";
import { MotionConfig, useMotionValueEvent, useScroll } from "motion/react";
import { useI18n } from "../i18n";
import { cn } from "../lib/utils";
import Logo from "../components/Logo";
import LanguageToggle, { ThemeToggle } from "../components/LanguageToggle";
import { ScrollProgress } from "../components/motion";
import { usePageTitle } from "../lib/usePageTitle";
import { COMPANY } from "../content/company";
import { CLIENTS } from "../content/clients";
import { HeroCollage } from "../components/landing/HeroCollage";
import { AboutOffer } from "../components/landing/AboutOffer";
import { VideoSection } from "../components/landing/VideoSection";
import { ClientsStrip } from "../components/landing/ClientsStrip";
import { JoinYourPlatform } from "../components/landing/JoinYourPlatform";
import { ContactSection } from "../components/landing/ContactSection";

/**
 * Home page, in the owner's order:
 * 1 hero, 2 who we are + what we offer, 3 explainer video, 4 our clients,
 * 5 we join your platform, 6 contact.
 */
export default function LandingPage() {
    const { l } = useI18n();
    usePageTitle(l("أول منصة عربية للامتحانات الشفوية أونلاين", "The first Arabic platform for online oral exams"));
    let loggedIn = false;
    try { loggedIn = !!localStorage.getItem("token"); } catch { /* ignore */ }
    const startHref = loggedIn ? "/dashboard" : "/register";

    // Header gains a surface once the page moves
    const { scrollY } = useScroll();
    const [scrolled, setScrolled] = useState(false);
    useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));

    const sections = [
        { href: "#about", label: l("من نحن", "About") },
        { href: "#video", label: l("الفيديو", "Video") },
        ...(CLIENTS.length ? [{ href: "#clients", label: l("عملاؤنا", "Clients") }] : []),
        { href: "#integrate", label: l("لمنصتك", "For your platform") },
        { href: "#contact", label: l("تواصل معنا", "Contact") },
    ];

    return (
        <MotionConfig reducedMotion="user">
            <div className="min-h-dvh overflow-x-clip bg-paper text-ink">
                <ScrollProgress />

                {/* Sticky bar over scrolling content: the one place glass belongs. avoid-ai-design-ignore: K3 */}
                <header className={cn(
                    "sticky top-0 z-40 border-b backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-300",
                    scrolled ? "border-rule/70 bg-paper/85 shadow-[0_8px_30px_-18px_rgba(17,27,52,0.35)]" : "border-transparent bg-paper/40",
                )}>
                    <nav className="mx-auto flex h-[4.25rem] max-w-7xl items-center gap-6 px-4 sm:px-6" aria-label={l("الرئيسية", "Main")}>
                        <Link to="/" aria-label="OralIQ"><Logo size={32} /></Link>
                        <ul className="hidden items-center gap-1 rounded-full border border-rule/70 bg-sheet/70 p-1 text-[0.9375rem] lg:flex">
                            {sections.map((s) => (
                                <li key={s.href}><a href={s.href} className="block rounded-full px-4 py-1.5 text-ink-2 transition-colors hover:bg-paper hover:text-ink">{s.label}</a></li>
                            ))}
                        </ul>
                        <div className="ms-auto flex items-center gap-1">
                            <LanguageToggle compact />
                            <ThemeToggle />
                            {loggedIn ? (
                                <Link to="/dashboard" className="ms-2 inline-flex h-10 items-center whitespace-nowrap rounded-full bg-pen px-5 text-sm font-semibold text-pen-ink hover:bg-pen-hover">{l("لوحة التحكم", "Dashboard")}</Link>
                            ) : (
                                <>
                                    <Link to="/login" viewTransition className="hidden h-10 items-center rounded-full px-4 text-sm font-semibold text-ink-2 hover:text-ink sm:inline-flex">{l("تسجيل الدخول", "Sign in")}</Link>
                                    <Link to="/register" viewTransition className="ms-1 inline-flex h-10 items-center whitespace-nowrap rounded-full bg-pen px-5 text-sm font-semibold text-pen-ink hover:bg-pen-hover">{l("أنشئ حساب", "Create account")}</Link>
                                </>
                            )}
                        </div>
                    </nav>
                </header>

                <main>
                    <HeroCollage startHref={startHref} />
                    <AboutOffer />
                    <VideoSection />
                    <ClientsStrip />
                    <JoinYourPlatform />
                    <ContactSection />
                </main>

                <footer className="border-t border-rule/70 bg-sheet">
                    <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.6fr_1fr_1fr]">
                        <div className="col-span-2 md:col-span-1">
                            <Logo size={30} />
                            <p className="mt-4 max-w-sm leading-relaxed text-ink-2">{l("أول منصة عربية للامتحانات الشفوية أونلاين: الطالب يجاوب بصوته، والتصحيح يوصل جاهز.", "The first Arabic platform for online oral exams: students answer out loud, and the grading arrives done.")}</p>
                        </div>
                        <nav aria-label={l("أقسام الصفحة", "Page sections")}>
                            <ul className="space-y-2.5 text-ink-2">
                                {sections.map((s) => <li key={s.href}><a href={s.href} className="hover:text-pen">{s.label}</a></li>)}
                            </ul>
                        </nav>
                        <nav aria-label={l("الحساب", "Account")}>
                            <ul className="space-y-2.5 text-ink-2">
                                <li><Link to="/register" className="hover:text-pen">{l("أنشئ حساب", "Create account")}</Link></li>
                                <li><Link to="/login" className="hover:text-pen">{l("تسجيل الدخول", "Sign in")}</Link></li>
                            </ul>
                        </nav>
                    </div>
                    <div className="border-t border-rule/70">
                        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-ink-3 sm:px-6">
                            <p>© 2026 {COMPANY.name}</p>
                            <a href={`mailto:${COMPANY.email}`} className="ltr hover:text-pen">{COMPANY.email}</a>
                        </div>
                    </div>
                </footer>
            </div>
        </MotionConfig>
    );
}
