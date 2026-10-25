import { Link } from "react-router-dom";
import { ArrowUpLeft } from "lucide-react";
import { MotionConfig } from "motion/react";
import { useI18n } from "../i18n";
import Logo from "../components/Logo";
import LanguageToggle, { ThemeToggle } from "../components/LanguageToggle";
import { usePageTitle } from "../lib/usePageTitle";
import { LandingMenu } from "../components/landing/LandingMenu";
import { HomeHero } from "../components/home/HomeHero";
import { HomeAbout } from "../components/home/HomeAbout";
import { HomeSteps } from "../components/home/HomeSteps";
import { HomeVideo } from "../components/home/HomeVideo";
import { HomeClients } from "../components/home/HomeClients";
import { HomePlatform } from "../components/home/HomePlatform";
import { HomePricing } from "../components/home/HomePricing";
import { HomeTestimonials } from "../components/home/HomeTestimonials";
import { HomeContact } from "../components/home/HomeContact";
import { HomeFooter } from "../components/home/HomeFooter";

export default function LandingPage() {
    const { l } = useI18n();
    usePageTitle(l("أول منصة عربية تقدم الامتحانات الشفوي أونلاين", "The first Arabic platform for online oral exams"));
    let loggedIn = false;
    try { loggedIn = !!localStorage.getItem("token"); } catch { /* ignore */ }
    const startHref = loggedIn ? "/dashboard" : "/register";

    const sections = [
        { href: "#about", label: l("عن المنصة", "About Platform") },
        { href: "#how", label: l("الخطوات", "Steps") },
        { href: "#video", label: l("الفيديو التعريفي", "Intro Video") },
        { href: "#clients", label: l("عملاؤنا", "Our Clients") },
        { href: "#integrate", label: l("انضم كـ فيتشر", "Embed Feature") },
        { href: "#pricing", label: l("الباقات", "Pricing") },
        { href: "#testimonials", label: l("آراء العملاء", "Testimonials") },
        { href: "#contact", label: l("تواصل معنا", "Contact Us") },
    ];
    const ghost = "text-ink hover:bg-sheet-2 hover:text-ink";

    return (
        <MotionConfig reducedMotion="user">
            <div className="home min-h-dvh overflow-x-clip bg-paper text-ink transition-colors duration-300">
                <a
                    href="#main"
                    onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}
                    className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-[#6F4E37] focus:px-5 focus:py-2.5 focus:font-bold focus:text-white"
                >
                    {l("تخطَّ إلى المحتوى", "Skip to content")}
                </a>

                {/* Floating Editorial Notch Navbar — Responsive & Theme-Aware (Off-White <-> Espresso Brown) */}
                <header className="fixed inset-x-0 top-2.5 sm:top-3.5 z-50 px-2.5 sm:px-6 pointer-events-none">
                    <nav
                        aria-label={l("الرئيسية", "Main")}
                        className="pointer-events-auto mx-auto flex h-14 sm:h-16 max-w-[82rem] items-center gap-2 rounded-full border border-rule bg-sheet/92 px-3.5 text-ink shadow-float backdrop-blur-xl sm:gap-5 sm:px-7 transition-colors duration-300"
                    >
                        <Link to="/" aria-label="OralIQ" className="flex h-10 shrink-0 items-center text-ink">
                            <Logo height={21} className="sm:h-[23px] w-auto" />
                        </Link>

                        <ul className="hidden items-center gap-1 mx-auto lg:flex">
                            {sections.map((s) => (
                                <li key={s.href}>
                                    <a
                                        href={s.href}
                                        className="inline-flex h-10 items-center rounded-full px-3.5 text-[0.95rem] font-bold text-ink-2 transition-colors hover:bg-sheet-2 hover:text-ink"
                                    >
                                        {s.label}
                                    </a>
                                </li>
                            ))}
                        </ul>

                        <div className="ms-auto lg:ms-0 flex items-center gap-1 sm:gap-1.5">
                            <LanguageToggle compact className={ghost} />
                            <ThemeToggle className={ghost} />
                            {loggedIn ? (
                                <Link
                                    to="/dashboard"
                                    className="oiq-btn-mint ms-0.5 inline-flex h-9 sm:h-11 items-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-full ps-3.5 pe-1.5 sm:ps-5 sm:pe-2 text-xs sm:text-sm font-bold text-[#FAF6F0]"
                                >
                                    <span>{l("لوحة التحكم", "Dashboard")}</span>
                                    <span className="flex size-6 sm:size-7 items-center justify-center rounded-full bg-white/15 text-white">
                                        <ArrowUpLeft className="size-3.5 sm:size-4 ltr:rotate-90" aria-hidden />
                                    </span>
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        to="/login"
                                        viewTransition
                                        className="hidden h-10 items-center rounded-full px-4 text-sm font-bold text-ink hover:bg-sheet-2 md:inline-flex"
                                    >
                                        {l("تسجيل الدخول", "Sign in")}
                                    </Link>
                                    <Link
                                        to="/register"
                                        viewTransition
                                        className="oiq-btn-mint ms-0.5 inline-flex h-9 sm:h-11 items-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-full ps-3.5 pe-1.5 sm:ps-5 sm:pe-2 text-xs sm:text-sm font-bold text-[#FAF6F0]"
                                    >
                                        <span>{l("أنشئ حساب", "Create account")}</span>
                                        <span className="flex size-6 sm:size-7 items-center justify-center rounded-full bg-white/15 text-white">
                                            <ArrowUpLeft className="size-3.5 sm:size-4 ltr:rotate-90" aria-hidden />
                                        </span>
                                    </Link>
                                </>
                            )}
                            <LandingMenu sections={sections} loggedIn={loggedIn} className={ghost} />
                        </div>
                    </nav>
                </header>

                <main id="main" tabIndex={-1} className="outline-none">
                    <HomeHero startHref={startHref} />
                    <HomeAbout startHref={startHref} />
                    <HomeSteps />
                    <HomeVideo />
                    <HomeClients />
                    <HomePlatform />
                    <HomePricing startHref={startHref} />
                    <HomeTestimonials />
                    <HomeContact />
                </main>
                <HomeFooter sections={sections} />
            </div>
        </MotionConfig>
    );
}
