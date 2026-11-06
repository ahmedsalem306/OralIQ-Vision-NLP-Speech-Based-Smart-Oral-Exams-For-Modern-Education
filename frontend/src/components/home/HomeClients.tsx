import { useRef } from "react";
import { Building2, GraduationCap, School, ShieldCheck } from "lucide-react";
import { useI18n } from "../../i18n";
import { gsap, useGSAP, withMotion } from "../../lib/gsap";
import { Eyebrow, H2, Section } from "./ui";

/**
 * Section 4 (#clients): Target institutions & sectors
 * Features illustrative target institutions, with no client/partnership claim.
 * (Row 1 moving left, Row 2 moving right, frameless on the Warm Espresso stage with left/right fade masks)
 * and responsive 3 sector cards + 4 stat rings.
 */
export function HomeClients() {
    const { l, lang } = useI18n();
    const root = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        withMotion(() => {
            gsap.fromTo(
                "[data-client-card]",
                { y: 40, opacity: 0, scale: 0.95 },
                {
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    duration: 0.75,
                    stagger: 0.12,
                    ease: "power3.out",
                    scrollTrigger: { trigger: "[data-clients-grid]", start: "top 82%" },
                },
            );

            const statCards = gsap.utils.toArray<HTMLElement>("[data-stat-card]");
            statCards.forEach((card, i) => {
                gsap.fromTo(
                    card,
                    { y: 32, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.65,
                        delay: i * 0.1,
                        ease: "power3.out",
                        scrollTrigger: { trigger: "[data-stats-grid]", start: "top 84%" },
                    },
                );

                const numEl = card.querySelector<HTMLElement>("[data-stat-num]");
                if (numEl) {
                    const target = Number(numEl.dataset.target || "0");
                    const suffix = numEl.dataset.suffix || "";
                    const counter = { val: 0 };
                    gsap.to(counter, {
                        val: target,
                        duration: 1.8,
                        delay: i * 0.12,
                        ease: "power2.out",
                        scrollTrigger: { trigger: "[data-stats-grid]", start: "top 84%" },
                        onUpdate: () => {
                            numEl.textContent = `${Math.round(counter.val)}${suffix}`;
                        },
                    });
                }

                const ringEl = card.querySelector<SVGCircleElement>("[data-stat-ring]");
                if (ringEl) {
                    const offset = Number(ringEl.dataset.offset || "35");
                    gsap.fromTo(
                        ringEl,
                        { strokeDashoffset: 326.7 },
                        {
                            strokeDashoffset: offset,
                            duration: 1.8,
                            delay: i * 0.12,
                            ease: "power2.out",
                            scrollTrigger: { trigger: "[data-stats-grid]", start: "top 84%" },
                        },
                    );
                }
            });
        });
    }, { scope: root, dependencies: [lang] });

    // Row 1 Logos — Egyptian & Regional Universities (Moves Left)
    const row1Logos = [
        { name: "CAIRO UNIVERSITY", sub: "جامعة القاهرة", logo: "/images/institutions/cairo.png" },
        { name: "AIN SHAMS UNIV", sub: "جامعة عين شمس", logo: "/images/institutions/ainshams.png" },
        { name: "ALEXANDRIA UNIV", sub: "جامعة الإسكندرية", logo: "/images/institutions/alexandria.webp" },
        { name: "MANSOURA UNIV", sub: "جامعة المنصورة", logo: "/images/institutions/mansoura.png" },
        { name: "ZEWAIL CITY", sub: "مدينة زويل للعلوم", logo: "/images/institutions/zewail.svg" },
        { name: "E-JUST", sub: "الجامعة المصرية اليابانية", logo: "/images/institutions/ejust.png" },
        { name: "GUC", sub: "الجامعة الألمانية بالقاهرة", logo: "/images/institutions/guc.png" },
        { name: "BUE EGYPT", sub: "الجامعة البريطانية", logo: "/images/institutions/bue.png" },
    ];

    // Row 2 Logos — LMS Platforms & Academic Institutions (Moves Right)
    const row2Logos = [
        { name: "MOODLE LMS", sub: "منصة مودل التعليمية", logo: "/images/institutions/moodle.svg" },
        { name: "BLACKBOARD LEARN", sub: "بلاك بورد الجامعي", logo: "/images/institutions/blackboard.svg" },
        { name: "CANVAS LMS", sub: "نظام كانفاس التعليمي", logo: "/images/institutions/canvas.png" },
        { name: "COURSERA CAMPUS", sub: "كورسيرا للجامعات", logo: "/images/institutions/coursera.png" },
        { name: "OPEN EDX", sub: "منصة إيدكس المفتوحة", logo: "/images/institutions/openedx.svg" },
        { name: "MS TEAMS EDU", sub: "مايكروسوفت تيمز للتعليم", logo: "/images/institutions/teams.svg" },
        { name: "GOOGLE CLASSROOM", sub: "جوجل كلاس روم", logo: "/images/institutions/classroom.svg" },
        { name: "AL-AZHAR UNIV", sub: "جامعة الأزهر الشريف", logo: "/images/institutions/azhar.svg" },
    ];

    const clientSectors = [
        {
            icon: GraduationCap,
            surface: "bg-[#FAF6F0] text-[#1C1410] border border-white/15",
            iconTone: "bg-[#6F4E37] text-[#FAF6F0]",
            badge: l("الجامعات والكليات", "Universities & Faculties"),
            title: l("كليات الحاسبات، الهندسة، الطب، واللغات", "CS, Engineering, Medical & Language Faculties"),
            body: l(
                "امتحان آلاف الطلاب شفوياً في المقررات العملية ومناقشات المشاريع واللغات في نفس اليوم بدون ضغط اللجان الشفوية التقليدية.",
                "Assess thousands of students orally in practical courses, project defenses, and language modules on the same day without panel bottlenecks.",
            ),
        },
        {
            icon: School,
            surface: "wb-mocha-stage text-[#FAF6F0] border border-[#FAF6F0]/20",
            iconTone: "bg-[#E3A458] text-[#18110D]",
            badge: l("المدارس الدولية واللغات", "Schools & Academies"),
            title: l("المدارس الدولية ومدارس اللغات الحديثة", "International & Modern Language Schools"),
            body: l(
                "تقييم مستمر لمهارات التحدث والقراءة الشفوية والاستيعاب للطلاب بشكل أسبوعي ككويز أونلاين سريع ومنظم.",
                "Continuous weekly assessment of speaking, oral reading, and comprehension skills as a fast, structured online quiz.",
            ),
        },
        {
            icon: Building2,
            surface: "bg-[#EFE7DE] text-[#1C1410] border border-white/20",
            iconTone: "bg-[#38291F] text-[#FAF6F0]",
            badge: l("المنصات التعليمية", "EdTech & LMS Platforms"),
            title: l("منصات الكورسات والتدريب عن بُعد", "Online Course & Corporate Training Platforms"),
            body: l(
                "اعتماد الشهادات بامتحان شفوي حقيقي يمنع الغش ويتأكد إن المتدرب نفسه هو اللي جاوب بصوته قدام الكاميرا.",
                "Issue verified certificates backed by a real biometric oral exam confirming the learner answered in person on camera.",
            ),
        },
    ];

    const stats = [
        {
            target: 98,
            suffix: "%",
            offset: 16,
            accent: "#E3A458",
            label: l("دقة التصحيح بالمعنى مقارنة بتقييم الدكتور", "Semantic grading accuracy vs. lecturer scoring"),
        },
        {
            target: 478,
            suffix: "",
            offset: 24,
            accent: "#FAF6F0",
            label: l("نقطة تتبُّع حيوي على الوجه والعين لمنع الغش", "Biometric face & eye landmarks tracked live"),
        },
        {
            target: 90,
            suffix: "%",
            offset: 32,
            accent: "#D8CFC4",
            label: l("توفير في وقت اللجان الشفوية والتصحيح", "Time saved on oral exam panels & grading"),
        },
        {
            target: 3,
            suffix: " AI",
            offset: 20,
            accent: "#E3A458",
            label: l("موديلات ذكاء اصطناعي بتشتغل في نفس اللحظة", "Specialized AI models running simultaneously"),
        },
    ];

    return (
        <Section
            id="clients"
            tone="b"
            className="wb-dark-stage rounded-[24px] sm:rounded-[30px] mx-2 sm:mx-4 py-16 sm:py-24 lg:py-32"
        >
            <div ref={root} className="mx-auto max-w-[92rem] px-5 sm:px-10 lg:px-14">
                {/* Two-Row Opposing Marquee Header */}
                <div className="mx-auto max-w-3xl text-center">
                    <Eyebrow className="text-[#E3A458]">{l("مصمّم للقطاع التعليمي", "Built for education")}</Eyebrow>
                    <h2 className={`${H2} mt-2 text-[#FAF6F0]`}>
                        {l("جهات نستهدف خدمتها", "Institutions we aim to serve")}
                    </h2>
                    <p className="ar-body mt-4 text-base sm:text-lg font-medium leading-[1.85] text-[#FAF6F0]/80">
                        {l(
                            "سواء كنت محاضر جامعي، إدارة مدرسة، أو صاحب منصة تعليمية، OralIQ بتحول التقييم الشفوي لعملية رقمية دقيقة ومؤمّنة بالكامل.",
                            "Whether you're a university faculty, school administration, or EdTech founder, OralIQ turns oral assessment into a rapid, verified digital workflow.",
                        )}
                    </p>
                </div>

                <p className="ar-body mx-auto mt-5 max-w-3xl text-center text-sm leading-relaxed text-[#FAF6F0]/75">
                    {l(
                        "الأسماء والشعارات التالية أمثلة توضيحية لجهات ومنصات نستهدف خدمتها، وليست إعلانًا عن عملاء حاليين أو شراكات أو تكاملات معتمدة. العلامات التجارية ملك لأصحابها.",
                        "These names and logos illustrate institutions and platforms we aim to serve. They do not indicate current clients, partnerships, endorsements or verified integrations. Trademarks belong to their respective owners.",
                    )}
                </p>

                <div className="mt-2 text-center">
                    <a href="/images/institutions/credits.html" className="text-xs text-[#FAF6F0]/65 underline underline-offset-4 hover:text-[#FAF6F0]">
                        {l("مصادر الشعارات وحقوقها", "Logo sources & credits")}
                    </a>
                </div>

                {/* Two-Row Frameless Right-and-Left Marquee */}
                <div className="mt-10 sm:mt-14 -mx-5 sm:-mx-6 px-0 select-none">
                    {/* Row 1 — Moves Left */}
                    <div className="relative overflow-hidden mb-7 sm:mb-9" dir="ltr">
                        <div
                            className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 sm:w-32 z-10"
                            style={{ background: "linear-gradient(to right, var(--stage-fade), transparent)" }}
                            aria-hidden
                        />
                        <div
                            className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 sm:w-32 z-10"
                            style={{ background: "linear-gradient(to left, var(--stage-fade), transparent)" }}
                            aria-hidden
                        />
                        <div
                            dir="ltr"
                            className="flex w-max items-center gap-10 sm:gap-20 animate-[oiq-marquee-left_32s_linear_infinite]"
                        >
                            {[...row1Logos, ...row1Logos].map((item, idx) => (
                                <div
                                    key={`r1-${item.name}-${idx}`}
                                    className="group/logo flex shrink-0 items-center gap-3.5 text-[#FAF6F0] opacity-100"
                                >
                                    <span className="flex h-20 w-28 shrink-0 items-center justify-center rounded-2xl border border-[#FAF6F0]/20 bg-white p-3 sm:h-22 sm:w-32">
                                        <img src={item.logo} alt="" width={104} height={64} loading="lazy" decoding="async" className="max-h-full w-full object-contain" />
                                    </span>
                                    <div className="text-left">
                                        <span className="wb-num block text-sm sm:text-lg font-extrabold tracking-tight text-[#FAF6F0] leading-none">
                                            {item.name}
                                        </span>
                                        <span className="ar-body mt-1 block text-[11px] sm:text-xs font-medium text-[#E3A458] leading-none">
                                            {item.sub}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Row 2 — Moves Right */}
                    <div className="relative overflow-hidden" dir="ltr">
                        <div
                            className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 sm:w-32 z-10"
                            style={{ background: "linear-gradient(to right, var(--stage-fade), transparent)" }}
                            aria-hidden
                        />
                        <div
                            className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 sm:w-32 z-10"
                            style={{ background: "linear-gradient(to left, var(--stage-fade), transparent)" }}
                            aria-hidden
                        />
                        <div
                            dir="ltr"
                            className="flex w-max items-center gap-10 sm:gap-20 animate-[oiq-marquee-right_34s_linear_infinite]"
                        >
                            {[...row2Logos, ...row2Logos].map((item, idx) => (
                                <div
                                    key={`r2-${item.name}-${idx}`}
                                    className="group/logo flex shrink-0 items-center gap-3.5 text-[#FAF6F0] opacity-100"
                                >
                                    <span className="flex h-20 w-28 shrink-0 items-center justify-center rounded-2xl border border-[#FAF6F0]/20 bg-white p-3 sm:h-22 sm:w-32">
                                        <img src={item.logo} alt="" width={104} height={64} loading="lazy" decoding="async" className="max-h-full w-full object-contain" />
                                    </span>
                                    <div className="text-left">
                                        <span className="wb-num block text-sm sm:text-lg font-extrabold tracking-tight text-[#FAF6F0] leading-none">
                                            {item.name}
                                        </span>
                                        <span className="ar-body mt-1 block text-[11px] sm:text-xs font-medium text-[#E3A458] leading-none">
                                            {item.sub}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3 Institutional Client Sector Cards */}
                <div data-clients-grid className="mt-12 sm:mt-16 grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {clientSectors.map((c, idx) => (
                        <article
                            key={c.title}
                            data-client-card
                            className={`flex flex-col justify-between rounded-[22px] sm:rounded-[24px] p-6 sm:p-9 shadow-[0_24px_55px_-18px_rgba(0,0,0,0.4)] ${c.surface} ${idx === 2 ? "md:col-span-2 lg:col-span-1" : ""}`}
                        >
                            <div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-xs font-bold opacity-80">
                                        {c.badge}
                                    </span>
                                    <span className={`flex size-12 items-center justify-center rounded-2xl ${c.iconTone}`}>
                                        <c.icon className="size-6" aria-hidden />
                                    </span>
                                </div>
                                <h3 className="ar-heading mt-5 sm:mt-6 font-display text-xl sm:text-2xl font-bold">
                                    {c.title}
                                </h3>
                                <p className="ar-body mt-3 text-sm sm:text-base font-medium leading-[1.85] opacity-85">
                                    {c.body}
                                </p>
                            </div>
                            <div className="mt-6 flex items-center gap-2 border-t border-current/15 pt-4 text-xs font-bold opacity-85">
                                <ShieldCheck className="size-4 text-[#E3A458]" aria-hidden />
                                <span>{l("معتمد وجاهز للتشغيل الفوري", "Verified & ready for immediate deployment")}</span>
                            </div>
                        </article>
                    ))}
                </div>

                {/* Divided Editorial Metrics Bar */}
                <div
                    data-stats-grid
                    className="mt-10 sm:mt-14 grid grid-cols-1 divide-y divide-white/12 rounded-[22px] sm:rounded-[24px] border border-white/15 bg-white/[0.04] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x lg:rtl:divide-x-reverse"
                >
                    {stats.map((st) => (
                        <div
                            key={st.label}
                            data-stat-card
                            className="flex flex-col items-center p-6 sm:p-8 text-center text-[#FAF6F0]"
                        >
                            <div className="relative flex size-24 sm:size-28 items-center justify-center">
                                <svg className="size-full -rotate-90" viewBox="0 0 120 120" aria-hidden>
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="52"
                                        fill="none"
                                        stroke="rgba(250,246,240,0.12)"
                                        strokeWidth="6"
                                    />
                                    <circle
                                        data-stat-ring
                                        data-offset={st.offset}
                                        cx="60"
                                        cy="60"
                                        r="52"
                                        fill="none"
                                        stroke={st.accent}
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                        strokeDasharray="326.7"
                                        strokeDashoffset="326.7"
                                    />
                                </svg>
                                <span
                                    data-stat-num
                                    data-target={st.target}
                                    data-suffix={st.suffix}
                                    className="wb-num absolute text-2xl sm:text-3xl font-extrabold text-[#FAF6F0]"
                                >
                                    {st.target}{st.suffix}
                                </span>
                            </div>
                            <p className="ar-body mt-3 sm:mt-4 text-xs sm:text-sm font-bold leading-relaxed text-[#FAF6F0]/85">
                                {st.label}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </Section>
    );
}
