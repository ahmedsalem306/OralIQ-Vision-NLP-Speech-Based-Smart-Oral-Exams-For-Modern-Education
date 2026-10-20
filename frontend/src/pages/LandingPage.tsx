import { MotionConfig } from "motion/react";
import { useI18n } from "../i18n";
import { usePageTitle } from "../lib/usePageTitle";
import { SiteHeader } from "../components/landing/SiteHeader";
import { HeroSection } from "../components/landing/HeroSection";
import { AboutSection } from "../components/landing/AboutSection";
import { VideoSection } from "../components/landing/VideoSection";
import { ClientsStrip } from "../components/landing/ClientsStrip";
import { IntegrationCarousel } from "../components/landing/IntegrationCarousel";
import { ContactSection } from "../components/landing/ContactSection";
import { SiteFooter } from "../components/landing/SiteFooter";

/**
 * Home page, in the order the owner set:
 * 1 hero, 2 who we are + what we offer, 3 explainer video, 4 our clients,
 * 5 we join your platform, 6 contact. Black bands and white sheets alternate.
 */
export default function LandingPage() {
    const { l } = useI18n();
    usePageTitle(l("أول منصة عربية للامتحانات الشفوية أونلاين", "The first Arabic platform for online oral exams"));
    let loggedIn = false;
    try { loggedIn = !!localStorage.getItem("token"); } catch { /* ignore */ }
    const startHref = loggedIn ? "/dashboard" : "/register";

    return (
        <MotionConfig reducedMotion="user">
            <div className="min-h-dvh overflow-x-clip bg-sheet text-ink">
                <SiteHeader loggedIn={loggedIn} />
                <main>
                    <HeroSection startHref={startHref} />
                    <AboutSection />
                    <VideoSection />
                    <ClientsStrip />
                    <IntegrationCarousel />
                    <ContactSection />
                </main>
                <SiteFooter />
            </div>
        </MotionConfig>
    );
}
