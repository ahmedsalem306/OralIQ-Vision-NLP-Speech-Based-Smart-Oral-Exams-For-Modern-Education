import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MotionConfig, useMotionValueEvent, useScroll } from "motion/react";
import { useI18n } from "../i18n";
import { cn } from "../lib/utils";
import Logo from "../components/Logo";
import LanguageToggle, { ThemeToggle } from "../components/LanguageToggle";
import { usePageTitle } from "../lib/usePageTitle";
import { CLIENTS } from "../content/clients";
import { LandingMenu } from "../components/landing/LandingMenu";
import { HomeHero } from "../components/home/HomeHero";
import { HomeAbout } from "../components/home/HomeAbout";
import { HomeMarking } from "../components/home/HomeMarking";
import { HomeSteps } from "../components/home/HomeSteps";
import { HomeVideo } from "../components/home/HomeVideo";
import { HomeClients } from "../components/home/HomeClients";
import { HomePlatform } from "../components/home/HomePlatform";
import { HomeContact } from "../components/home/HomeContact";
import { HomeFooter } from "../components/home/HomeFooter";

/**
 * Home page, black and white after the owner's reference, in the owner's order: 1 hero,
 * 2 who we are + what we offer (with how a grade is made and the four steps), 3 explainer video,
 * 4 our clients, 5 we join your platform, 6 contact.
 *
 * The bands alternate between the two surfaces — A (off-white), B (black), A, B … — so the page
 * has a rhythm rather than one long dark scroll, and the black footer closes it.
 */
export default function LandingPage() {
    const { l } = useI18n();
    usePageTitle(l("أول منصة عربية للامتحانات الشفوية أونلاين", "The first Arabic platform for online oral exams"));
    let loggedIn = false;
    try { loggedIn = !!localStorage.getItem("token"); } catch { /* ignore */ }
    const startHref = loggedIn ? "/dashboard" : "/register";

    // The header takes the colours of what is under it: the light first screen, then the black page
    const hero = useRef<HTMLDivElement>(null);
    const { scrollY } = useScroll();
    const [scrolled, setScrolled] = useState(false);
    const [overDark, setOverDark] = useState(false);
    useMotionValueEvent(scrollY, "change", (y) => {
        setScrolled(y > 12);
        setOverDark(y > (hero.current?.offsetHeight ?? Infinity) - 68);
    });

    const sections = [
        { href: "#about", label: l("من نحن", "About") },
        { href: "#video", label: l("الفيديو", "Video") },
        ...(CLIENTS.length ? [{ href: "#clients", label: l("عملاؤنا", "Clients") }] : []),
        { href: "#integrate", label: l("لمنصتك", "For your platform") },
        { href: "#contact", label: l("تواصل معنا", "Contact") },
    ];
    const ghost = "text-current hover:bg-current/10 hover:text-current";

    return (
        <MotionConfig reducedMotion="user">
            <div className="home home-a min-h-dvh overflow-x-clip">
                <a
                    href="#main"
                    onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}
                    className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-home-ink focus:px-4 focus:py-2 focus:text-home-bg"
                >
                    {l("تخطَّ إلى المحتوى", "Skip to content")}
                </a>

                {/* Sticky bar over scrolling content: the one place glass belongs. avoid-ai-design-ignore: K3 */}
                <header className={cn(
                    "sticky top-0 z-40 border-b backdrop-blur-xl transition-[background-color,border-color,color] duration-300",
                    // Over the hero the bar wears the hero's own surface; past it, the black bar
                    // reads clearly over every section below, light or dark
                    overDark ? "home-b border-home-line bg-home-bg/85" : cn("home-a", scrolled ? "border-home-line bg-home-bg/85" : "border-transparent bg-home-bg"),
                )}>
                    <nav className="mx-auto flex h-[4.25rem] max-w-7xl items-center gap-3 px-4 sm:gap-8 sm:px-6" aria-label={l("الرئيسية", "Main")}>
                        <Link to="/" aria-label="OralIQ" className="flex h-11 items-center"><Logo height={22} /></Link>
                        <ul className="hidden items-center gap-7 text-[0.9375rem] lg:flex">
                            {sections.map((s) => (
                                <li key={s.href}><a href={s.href} className="inline-flex h-10 items-center opacity-75 transition-opacity hover:opacity-100">{s.label}</a></li>
                            ))}
                        </ul>
                        <div className="ms-auto flex items-center gap-1">
                            <span className="hidden items-center gap-1 lg:flex"><LanguageToggle compact className={ghost} /><ThemeToggle className={ghost} /></span>
                            {loggedIn ? (
                                <Link to="/dashboard" className="ms-2 inline-flex h-10 items-center whitespace-nowrap rounded-lg bg-home-ink px-5 text-sm font-semibold text-home-bg">{l("لوحة التحكم", "Dashboard")}</Link>
                            ) : (
                                <>
                                    <Link to="/login" viewTransition className="hidden h-10 items-center rounded-lg px-4 text-sm font-semibold opacity-80 hover:opacity-100 sm:inline-flex">{l("تسجيل الدخول", "Sign in")}</Link>
                                    <Link to="/register" viewTransition className="ms-1 inline-flex h-10 items-center whitespace-nowrap rounded-lg bg-home-ink px-4 text-sm font-semibold text-home-bg sm:px-5">{l("أنشئ حساب", "Create account")}</Link>
                                </>
                            )}
                            <LandingMenu sections={sections} loggedIn={loggedIn} className={ghost} />
                        </div>
                    </nav>
                </header>

                <main id="main" tabIndex={-1} className="outline-none">
                    <div ref={hero}><HomeHero startHref={startHref} /></div>
                    <HomeAbout startHref={startHref} />
                    <HomeMarking />
                    <HomeSteps />
                    <HomeVideo />
                    <HomeClients />
                    <HomePlatform />
                    <HomeContact />
                </main>
                <HomeFooter sections={sections} />
            </div>
        </MotionConfig>
    );
}
