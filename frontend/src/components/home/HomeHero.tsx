import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowUpLeft, Play, ScanFace, ShieldCheck } from "lucide-react";
import { useI18n } from "../../i18n";
import { gsap, useGSAP, withMotion } from "../../lib/gsap";
import { FaceScan } from "./FaceScan";
import { BTN, BTN_GHOST } from "./ui";

/**
 * 0. Hero Section:
 * - Stage background is calibrated to #0C0A06 (matching the warm dark tone of /media/hero-face-mesh.mp4)
 *   with a soft radial feather so the large portrait character emerges directly from the Hero background
 *   with zero shadow, zero frame, and zero text overlap.
 */
export function HomeHero({ startHref }: { startHref: string }) {
    const { l, lang } = useI18n();
    const root = useRef<HTMLElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        withMotion(() => {
            const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
            tl.fromTo("[data-hero-line]", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.85, stagger: 0.1 })
                .fromTo("[data-hero-fade]", { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.08 }, "-=0.5")
                .fromTo("[data-hero-card]", { y: 30, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.75, ease: "back.out(1.2)" }, "-=0.5")
                .fromTo("[data-hero-bento]", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.09 }, "-=0.4");

            gsap.to("[data-hero-title-wrap]", {
                yPercent: -5,
                ease: "none",
                scrollTrigger: {
                    trigger: stageRef.current,
                    start: "top top",
                    end: "bottom top",
                    scrub: true,
                },
            });
        });
        delete document.documentElement.dataset.prerender;
    }, { scope: root, dependencies: [lang] });

    const lowerPanels = [
        {
            index: "01",
            metric: "80%",
            tone: "bg-sheet border-rule text-ink",
            badge: l("التصحيح بالمعنى", "Semantic Grading"),
            title: l("يفهم شرح الطالب بأسلوبه بدون حفظ حرفي", "Grades Student Meaning Without Rote Memorization"),
        },
        {
            index: "02",
            metric: "478",
            tone: "wb-mocha-stage border-[#FAF6F0]/15 text-[#FAF6F0]",
            badge: l("منع الغش بالكاميرا والصوت", "Vision & Voice Anti-Cheat"),
            title: l("نقطة تتبُّع للوجه وحركة العين وبصمة الصوت لحظياً", "Live Facial, Eye-Gaze & Voiceprint Landmarks"),
            dark: true,
        },
        {
            index: "03",
            metric: "100%",
            tone: "bg-sheet-2 border-rule text-ink",
            badge: l("أوتوماتيك بالكامل", "Fully Automated"),
            title: l("الدفعة كلها بتمتحن شفوي أونلاين في نفس الوقت", "Entire Cohort Takes the Online Oral Quiz Together"),
        },
    ];

    return (
        <section
            ref={root}
            className="home-a relative px-2.5 pt-21 pb-8 sm:px-5 sm:pt-24 lg:px-7"
        >
            {/* Rounded Hero Stage — Warm Dark Espresso Base Matching the Video Background */}
            <div
                ref={stageRef}
                style={{
                    background:
                        "radial-gradient(circle at 46% 48%, rgba(22, 18, 10, 0.95) 0%, #0A0805 58%), #0A0805",
                }}
                className="relative isolate mx-auto flex min-h-[calc(100dvh-7.5rem)] max-w-[94rem] flex-col justify-between overflow-hidden rounded-[24px] sm:rounded-[28px] border border-[#FAF6F0]/12 text-[#FAF6F0] shadow-[0_30px_80px_-24px_rgba(20,14,10,0.5)]"
            >
                {/* DESKTOP SEAMLESS CENTERPIECE VIDEO — Large, centered between right text & left card, zero shadow */}
                <div
                    aria-hidden
                    className="pointer-events-none hidden lg:flex absolute inset-y-0 left-[46.5%] -translate-x-1/2 z-0 w-[39rem] xl:w-[44rem] items-end justify-center pt-2"
                >
                    <FaceScan priority className="h-full w-full" />
                </div>

                {/* FOREGROUND CONTENT: 3-Column Layout (Headline on Right | Open Center for Character | 478 Card on Left) */}
                <div className="relative z-10 mx-auto grid w-full max-w-[90rem] flex-1 grid-cols-1 items-center gap-6 px-5 pt-7 pb-0 sm:px-10 sm:pt-9 lg:grid-cols-12 lg:gap-6 lg:px-12 lg:py-12">
                    {/* Start Column (Right in RTL): Headline & Actions (4 cols so text never overlaps character) */}
                    <div data-hero-title-wrap className="order-1 lg:order-none lg:col-span-4">
                        <h1 className="ar-heading font-display text-[clamp(2.15rem,3.8vw,3.95rem)] font-bold leading-[1.15] text-[#FAF6F0]">
                            <span data-hero-line className="block">
                                {l("أول منصة عربية", "The First Arabic Platform")}
                            </span>
                            <span data-hero-line className="mt-1.5 block text-[#E3A458]">
                                {l("تقدم الامتحانات الشفوي", "For Online Oral")}
                            </span>
                            <span data-hero-line className="mt-1.5 block text-[#EFE7DE]">
                                {l("أونلاين.", "Examinations.")}
                            </span>
                        </h1>

                        <p data-hero-fade className="ar-body mt-4 sm:mt-5 max-w-[26rem] text-base font-medium leading-[1.82] text-[#FAF6F0]/82 sm:text-[1.05rem]">
                            {l(
                                "حولنا الامتحان الشفوي لكويز أونلاين ذكي زي أي كويز إلكتروني: الطالب بيجاوب بصوته، و3 موديلات ذكاء اصطناعي بتصحح الإجابة بالمعنى وبتراقب حركة العين وبصمة الوجه والصوت عشان مستحيل يغش.",
                                "Turn oral exams into an effortless online quiz: students answer by voice while 3 AI models grade meaning and track eye gaze, face mesh, and voiceprint so cheating is impossible.",
                            )}
                        </p>

                        <div data-hero-fade className="mt-6 sm:mt-8 flex flex-wrap items-center gap-3">
                            <Link to={startHref} viewTransition className={`${BTN} w-full sm:w-auto justify-center ps-6 pe-2.5`}>
                                <span>{l("ابدأ الآن مجاناً", "Start now for free")}</span>
                                <span className="flex size-8 items-center justify-center rounded-full bg-white/15 text-white">
                                    <ArrowUpLeft className="size-4 ltr:rotate-90" aria-hidden />
                                </span>
                            </Link>
                            <a href="#video" className={`${BTN_GHOST} w-full sm:w-auto justify-center`}>
                                <Play className="size-4 fill-current text-[#6F4E37]" aria-hidden />
                                {l("شاهد الفيديو التعريفي", "Watch intro video")}
                            </a>
                        </div>
                    </div>

                    {/* Center Spacer on Desktop (5 cols) / Large Seamless Video on Mobile & Tablet */}
                    <div className="order-3 lg:order-none lg:col-span-5">
                        <div className="relative mx-auto h-[23rem] w-full max-w-[26rem] sm:h-[29rem] sm:max-w-[32rem] lg:hidden">
                            <FaceScan priority className="size-full" />
                        </div>
                    </div>

                    {/* End Column (Left in RTL): Warm Off-White 478 Points Biometric Anti-Cheating Card (3 cols) */}
                    <div className="order-2 lg:order-none lg:col-span-3">
                        <div
                            data-hero-card
                            className="rounded-[23px] border border-[#FAF6F0]/20 bg-[#FAF6F0] p-5 sm:p-6 text-[#1C1410] shadow-[0_24px_60px_-15px_rgba(0,0,0,0.55)]"
                        >
                            <div className="flex items-center gap-3 border-b border-[#1C1410]/12 pb-4">
                                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#6F4E37] text-[#FAF6F0] shadow-md">
                                    <ScanFace className="size-6" aria-hidden />
                                </span>
                                <div>
                                    <span className="wb-num block text-3xl font-extrabold leading-none text-[#1C1410]">
                                        478
                                    </span>
                                    <span className="mt-1 block text-xs font-bold text-[#6F4E37]">
                                        {l("نقطة تتبُّع حيوي على الوجه والعين", "Live face & eye-gaze landmarks")}
                                    </span>
                                </div>
                            </div>

                            <p className="ar-body mt-4 text-sm font-medium leading-[1.78] text-[#1C1410]/85">
                                {l(
                                    "الطالب مش هيعرف يغش: الكاميرا بترسم 478 نقطة على الوجه وبتتابع حركة العين لحظة بلحظة، مع مطابقة بصمة الصوت وتصحيح الإجابة بالمعنى تلقائياً.",
                                    "Cheating is impossible: the camera maps 478 facial landmarks and tracks eye movement in real time, matching voiceprints and grading answers semantically.",
                                )}
                            </p>

                            <div className="mt-4 flex items-center gap-2 border-t border-[#1C1410]/10 pt-3 text-xs font-bold text-[#6F4E37]">
                                <ShieldCheck className="size-4 shrink-0" aria-hidden />
                                <span>{l("مراقبة حيوية لحظية بدون تدخل بشري", "Real-time autonomous proctoring")}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lower Hero Bento Panels — Responsive on Mobile, Tablet & Desktop */}
            <div className="mx-auto mt-4 grid max-w-[94rem] grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {lowerPanels.map((p, idx) => (
                    <div
                        key={p.index}
                        data-hero-bento
                        className={`flex items-center justify-between gap-4 rounded-[22px] border p-5 sm:p-6 shadow-card ${p.tone} ${idx === 2 ? "sm:col-span-2 lg:col-span-1" : ""}`}
                    >
                        <div className="min-w-0">
                            <span className={`inline-block text-xs font-bold ${p.dark ? "text-[#E3A458]" : "text-pen"}`}>
                                {p.badge}
                            </span>
                            <p className={`ar-heading mt-1 text-base sm:text-lg font-bold leading-snug ${p.dark ? "text-[#FAF6F0]" : "text-ink"}`}>
                                {p.title}
                            </p>
                        </div>
                        <span className={`wb-num shrink-0 text-3xl sm:text-4xl font-extrabold ${p.dark ? "text-[#E3A458]" : "text-ink"}`}>
                            {p.metric}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}
