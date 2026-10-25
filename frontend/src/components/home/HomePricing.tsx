import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpLeft, Check, Cpu, Crown, Layers, ShieldCheck, Sparkles, Users, Zap } from "lucide-react";
import { useI18n } from "../../i18n";
import { gsap, useGSAP, withMotion } from "../../lib/gsap";
import { Eyebrow, H2, Section } from "./ui";

/**
 * Section (#pricing): Subscription Plans & Computing Capacity Architecture
 * - Built around the "Exams Created + Max Students per Exam + AI Priority Queue" business model.
 * - Matches the Warm Espresso Brown (#6F4E37 / #1E140F), Warm Off-White (#FAF6F0), and Caramel Gold (#E3A458) identity.
 */
export function HomePricing({ startHref }: { startHref: string }) {
    const { l, lang } = useI18n();
    const root = useRef<HTMLDivElement>(null);
    const [currency, setCurrency] = useState<"EGP" | "USD">("EGP");
    const [billingCycle, setBillingCycle] = useState<"monthly" | "semester">("monthly");

    useGSAP(() => {
        withMotion(() => {
            gsap.fromTo(
                "[data-price-card]",
                { y: 38, opacity: 0, scale: 0.97 },
                {
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    duration: 0.7,
                    stagger: 0.1,
                    ease: "power3.out",
                    scrollTrigger: { trigger: "[data-price-grid]", start: "top 82%" },
                },
            );
        });
    }, { scope: root, dependencies: [lang] });

    const plans = [
        {
            id: "free",
            name: l("الباقة التجريبية", "Free Starter"),
            badge: l("للتجربة السريعة", "Try OralIQ"),
            desc: l(
                "مثالية لتجربة الامتحانات الشفوية بالذكاء الاصطناعي مع مجموعة صغيرة من الطلاب.",
                "Ideal for testing AI oral exams with a small student group.",
            ),
            priceEgp: 0,
            priceUsd: 0,
            maxExams: l("2 امتحانات", "2 Exams"),
            maxStudents: l("15 طالب / امتحان", "15 Students / Exam"),
            maxDuration: l("2 دقيقة / سؤال", "2 Min / Question"),
            queueTier: l("طابور قياسي (Standard)", "Standard Queue"),
            featured: false,
            dark: false,
            features: [
                l("إنشاء حتى امتحانين (حتى 5 أسئلة للامتحان)", "Up to 2 exams (up to 5 questions/exam)"),
                l("حد أقصى 15 طالب داخل كل امتحان", "Up to 15 students per exam"),
                l("التصحيح الدلالي بالمعنى (SBERT 80%)", "Semantic grading by meaning (SBERT 80%)"),
                l("مراقبة الكاميرا الأساسية لمنع الغش", "Core camera anti-cheat monitoring"),
            ],
        },
        {
            id: "pro",
            name: l("باقة المحاضر المحترف", "Pro Lecturer"),
            badge: l("الأكثر طلباً للدكاترة", "Most Popular"),
            desc: l(
                "مصممة للمحاضرين والمعلمين لإدارة الكويزات الشفوية الأسبوعية والعملية للسكاشن.",
                "Designed for lecturers & teachers running weekly oral quizzes and lab assessments.",
            ),
            priceEgp: 900,
            priceUsd: 19,
            maxExams: l("10 امتحانات", "10 Exams"),
            maxStudents: l("80 طالب / امتحان", "80 Students / Exam"),
            maxDuration: l("5 دقائق / سؤال", "5 Min / Question"),
            queueTier: l("أولوية سريعة (Fast Priority)", "Fast Priority Queue"),
            featured: true,
            dark: true,
            features: [
                l("إنشاء حتى 10 امتحانات (حتى 15 سؤال للامتحان)", "Up to 10 exams (up to 15 questions/exam)"),
                l("حد أقصى 80 طالب داخل كل امتحان", "Up to 80 students per exam"),
                l("الـ 3 موديلات كاملة (Whisper + SBERT + 478 نقطة وجه وعين)", "Full 3-AI Engine (Whisper + SBERT + 478 Face/Eye)"),
                l("مطابقة بصمة الصوت (Voice ID) + أولوية معالجة سريعة", "Voiceprint verification + Fast AI Queue priority"),
            ],
        },
        {
            id: "campus",
            name: l("باقة الكليات والمدارس", "Campus & Schools"),
            badge: l("للدفعات الكبيرة", "High Capacity"),
            desc: l(
                "قدرة حوسبية عالية لامتحان دفعات الكليات والمدارس الدولية في نفس التوقيت بدون انتظار.",
                "High computing capacity to examine full faculty cohorts simultaneously with zero bottlenecks.",
            ),
            priceEgp: 2800,
            priceUsd: 59,
            maxExams: l("35 امتحان", "35 Exams"),
            maxStudents: l("300 طالب / امتحان", "300 Students / Exam"),
            maxDuration: l("10 دقائق / سؤال", "10 Min / Question"),
            queueTier: l("أولوية قصوى (VIP Express)", "VIP Express Queue"),
            featured: false,
            dark: false,
            features: [
                l("إنشاء حتى 35 امتحان (حتى 25 سؤال للامتحان)", "Up to 35 exams (up to 25 questions/exam)"),
                l("حد أقصى 300 طالب داخل كل امتحان في نفس اللحظة", "Up to 300 concurrent students per exam"),
                l("أولوية قصوى في طابور الـ AI وقت الذروة (VIP Queue)", "VIP Express priority in AI grading queue"),
                l("سجل حضور وغياب أوتوماتيكي + تقارير تفصيلية للغش", "Automated attendance ledger + detailed integrity reports"),
            ],
        },
        {
            id: "enterprise",
            name: l("باقة الجامعات والمنصات", "Enterprise & LMS"),
            badge: l("ربط API كامل", "Custom & API"),
            desc: l(
                "للجامعات الكبرى والمنصات التعليمية التي ترغب في دمج OralIQ كـ فيتشر داخل منصتها.",
                "For universities & EdTech platforms embedding OralIQ directly via API / LTI.",
            ),
            priceEgp: 7000,
            priceUsd: 149,
            maxExams: l("150 امتحان", "150 Exams"),
            maxStudents: l("1,500 طالب / امتحان", "1,500 Students / Exam"),
            maxDuration: l("15 دقيقة / سؤال", "15 Min / Question"),
            queueTier: l("معالجة فورية مخصصة (Dedicated)", "Dedicated Instant Queue"),
            featured: false,
            dark: false,
            features: [
                l("إنشاء حتى 150 امتحان (حتى 50 سؤال للامتحان)", "Up to 150 exams (up to 50 questions/exam)"),
                l("حد أقصى 1,500 طالب لكل امتحان مع خوادم مخصصة", "Up to 1,500 students/exam on dedicated workers"),
                l("تكامل مباشر مع Moodle وBlackboard وCanvas عبر API", "Direct API/Webhook integration with Moodle, Blackboard & Canvas"),
                l("أعلى أولوية معالجة فورية (Priority 0) ودعم فني مخصص", "Instant Priority-0 AI processing & dedicated SLA support"),
            ],
        },
    ];

    const formatPrice = (egp: number, usd: number) => {
        if (egp === 0) return l("مجاناً", "Free");
        const mult = billingCycle === "semester" ? 0.8 : 1;
        if (currency === "EGP") {
            return `${Math.round(egp * mult).toLocaleString()} ${l("ج.م", "EGP")}`;
        }
        return `$${Math.round(usd * mult)}`;
    };

    return (
        <Section id="pricing" tone="a" className="py-16 sm:py-24 lg:py-32">
            <div ref={root} className="mx-auto max-w-[92rem] px-4 sm:px-8 lg:px-12">
                {/* Header & Controls */}
                <div className="flex flex-col items-center text-center">
                    <Eyebrow>{l("خطط الاشتراك وسعة المعالجة", "Subscription Plans & Computing Capacity")}</Eyebrow>
                    <h2 className={`${H2} mt-2 max-w-3xl text-ink`}>
                        {l(
                            "باقات مرنة بعدد الامتحانات وسعة الطلاب لكل امتحان.",
                            "Transparent plans scaled by exam count and student capacity.",
                        )}
                    </h2>
                    <p className="mt-4 max-w-2xl text-base sm:text-lg font-medium text-ink-2 leading-relaxed">
                        {l(
                            "صممنا الباقات بحيث تضمن لك أعلى سرعة معالجة لثلاثة موديلات ذكاء اصطناعي (Whisper + SBERT + Biometrics) مع نظام طابور ذكي يعطي أولوية فورية للباقات الاحترافية وقت الذروة.",
                            "Engineered around real AI computing capacity: choose the number of exams and max students per exam that fit your cohort, backed by our Priority AI Grading Queue.",
                        )}
                    </p>

                    {/* Currency & Cycle Switchers */}
                    <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                        <div className="inline-flex items-center rounded-full border border-rule bg-sheet p-1 shadow-xs">
                            <button
                                type="button"
                                onClick={() => setBillingCycle("monthly")}
                                className={`rounded-full px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
                                    billingCycle === "monthly"
                                        ? "bg-[#6F4E37] text-[#FAF6F0] shadow-xs"
                                        : "text-ink-2 hover:text-ink"
                                }`}
                            >
                                {l("اشتراك شهري", "Monthly")}
                            </button>
                            <button
                                type="button"
                                onClick={() => setBillingCycle("semester")}
                                className={` inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
                                    billingCycle === "semester"
                                        ? "bg-[#6F4E37] text-[#FAF6F0] shadow-xs"
                                        : "text-ink-2 hover:text-ink"
                                }`}
                            >
                                <span>{l("فصلي / سنوي", "Semester / Annual")}</span>
                                <span className="rounded-full bg-[#E3A458] px-2 py-0.5 text-[10px] font-extrabold text-[#18110D]">
                                    {l("خصم 20%", "-20%")}
                                </span>
                            </button>
                        </div>

                        <div className="inline-flex items-center rounded-full border border-rule bg-sheet p-1 shadow-xs">
                            <button
                                type="button"
                                onClick={() => setCurrency("EGP")}
                                className={`wb-num rounded-full px-3.5 py-2 text-xs font-extrabold transition-all ${
                                    currency === "EGP" ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"
                                }`}
                            >
                                EGP (ج.م)
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrency("USD")}
                                className={`wb-num rounded-full px-3.5 py-2 text-xs font-extrabold transition-all ${
                                    currency === "USD" ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"
                                }`}
                            >
                                USD ($)
                            </button>
                        </div>
                    </div>
                </div>

                {/* 4 Pricing Cards Grid */}
                <div
                    data-price-grid
                    className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4"
                >
                    {plans.map((p) => (
                        <article
                            key={p.id}
                            data-price-card
                            className={`relative flex flex-col justify-between rounded-[26px] p-6 sm:p-7 transition-transform duration-300 hover:-translate-y-1 ${
                                p.dark
                                    ? "wb-mocha-stage border-2 border-[#E3A458]/60 text-[#FAF6F0] shadow-[0_28px_70px_-20px_rgba(30,20,15,0.65)]"
                                    : "border border-rule bg-sheet text-ink shadow-card"
                            }`}
                        >
                            <div>
                                {/* Top Badge & Title */}
                                <div className="flex items-center justify-between gap-2">
                                    <span
                                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                                            p.dark
                                                ? "bg-[#E3A458] text-[#18110D]"
                                                : "border border-rule bg-sheet-2 text-pen"
                                        }`}
                                    >
                                        {p.featured && <Crown className="size-3.5" aria-hidden />}
                                        {p.badge}
                                    </span>
                                    <span className={`wb-num text-xs font-extrabold uppercase tracking-wider ${p.dark ? "text-[#FAF6F0]/60" : "text-ink-3"}`}>
                                        {p.id}
                                    </span>
                                </div>

                                <h3 className="ar-heading mt-4 font-display text-2xl font-bold">
                                    {p.name}
                                </h3>
                                <p className={`ar-body mt-2 text-sm leading-relaxed ${p.dark ? "text-[#FAF6F0]/80" : "text-ink-2"}`}>
                                    {p.desc}
                                </p>

                                {/* Price Display */}
                                <div className="mt-5 flex items-baseline gap-1.5 border-b border-current/12 pb-5">
                                    <span className="wb-num text-3xl sm:text-4xl font-extrabold tracking-tight">
                                        {formatPrice(p.priceEgp, p.priceUsd)}
                                    </span>
                                    {p.priceEgp > 0 && (
                                        <span className={`text-xs font-bold ${p.dark ? "text-[#FAF6F0]/70" : "text-ink-3"}`}>
                                            / {l("شهرياً", "month")}
                                        </span>
                                    )}
                                </div>

                                {/* Key Capacity Limits Pills (Exams + Students/Exam + AI Queue) */}
                                <div className="mt-5 grid grid-cols-2 gap-2.5">
                                    <div className={`rounded-2xl p-3 ${p.dark ? "bg-black/25 border border-white/10" : "bg-sheet-2 border border-rule"}`}>
                                        <div className="flex items-center gap-1.5 text-[11px] font-bold opacity-75">
                                            <Layers className="size-3.5 text-[#E3A458]" aria-hidden />
                                            <span>{l("عدد الامتحانات", "Exams Quota")}</span>
                                        </div>
                                        <p className="mt-1 text-sm font-extrabold">{p.maxExams}</p>
                                    </div>
                                    <div className={`rounded-2xl p-3 ${p.dark ? "bg-black/25 border border-white/10" : "bg-sheet-2 border border-rule"}`}>
                                        <div className="flex items-center gap-1.5 text-[11px] font-bold opacity-75">
                                            <Users className="size-3.5 text-[#E3A458]" aria-hidden />
                                            <span>{l("سعة كل امتحان", "Students Cap")}</span>
                                        </div>
                                        <p className="mt-1 text-sm font-extrabold">{p.maxStudents}</p>
                                    </div>
                                </div>

                                <div className={`mt-2.5 flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-xs font-bold ${
                                    p.dark ? "bg-[#E3A458]/15 text-[#E3A458] border border-[#E3A458]/30" : "bg-sheet-2 text-pen border border-rule"
                                }`}>
                                    <span className="inline-flex items-center gap-1.5">
                                        <Zap className="size-3.5 shrink-0" aria-hidden />
                                        {p.queueTier}
                                    </span>
                                    <span className="wb-num opacity-80">{p.maxDuration}</span>
                                </div>

                                {/* Features List */}
                                <ul className="mt-5 space-y-2.5">
                                    {p.features.map((f) => (
                                        <li key={f} className="flex items-start gap-2.5 text-xs sm:text-sm font-medium leading-relaxed">
                                            <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
                                                p.dark ? "bg-[#E3A458] text-[#18110D]" : "bg-[#6F4E37]/15 text-[#6F4E37]"
                                            }`}>
                                                <Check className="size-3 stroke-[2.6]" aria-hidden />
                                            </span>
                                            <span className={p.dark ? "text-[#FAF6F0]/90" : "text-ink-2"}>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* CTA Button */}
                            <div className="mt-7 pt-2">
                                <Link
                                    to={startHref}
                                    className={`inline-flex h-12 w-full items-center justify-between rounded-full ps-5 pe-2 text-sm font-bold transition-all ${
                                        p.dark
                                            ? "bg-[#FAF6F0] text-[#18110D] hover:bg-[#E3A458]"
                                            : "oiq-btn-mint text-[#FAF6F0]"
                                    }`}
                                >
                                    <span>
                                        {p.priceEgp === 0
                                            ? l("ابدأ الباقة التجريبية مجاناً", "Start Free Starter")
                                            : l("اشترك الآن في الباقة", "Choose this plan")}
                                    </span>
                                    <span className={`flex size-8 items-center justify-center rounded-full ${
                                        p.dark ? "bg-[#18110D]/10 text-[#18110D]" : "bg-white/15 text-white"
                                    }`}>
                                        <ArrowUpLeft className="size-4 ltr:rotate-90" aria-hidden />
                                    </span>
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>

                {/* Computing Capacity & Priority Queue Architecture Explainer Bar */}
                <div className="mt-10 rounded-[24px] border border-rule bg-sheet p-6 sm:p-8 shadow-card">
                    <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-8">
                            <div className="inline-flex items-center gap-2 text-xs font-extrabold text-pen">
                                <Cpu className="size-4" aria-hidden />
                                <span>{l("إدارة ذكية للموارد الحوسبية (AI Computing Capacity Protection)", "Intelligent AI Computing Capacity Architecture")}</span>
                            </div>
                            <h3 className="ar-heading mt-2 font-display text-lg sm:text-xl font-bold text-ink">
                                {l(
                                    "كيف نضمن سرعة التصحيح وعدم توقف السيرفر أثناء امتحانات الدفعات الكبيرة؟",
                                    "How we guarantee instant grading and zero server downtime during peak cohort exams:",
                                )}
                            </h3>
                            <p className="ar-body mt-2 text-sm leading-relaxed text-ink-2">
                                {l(
                                    "يعمل محرك OralIQ بنظام الطابور ذي الأولوية (Priority AI Semaphore Queue): يتم تنفيذ تتبُّع الـ 478 نقطة على جهاز الطالب مباشرة لتخفيف الحمل، بينما تمر التسجيلات الصوتية عبر طابور ذكي يمنح أولوية فورية لباقات الكليات والمحترفين، مع حماية السيرفر بسقف محدد لعدد الطلاب في كل امتحان.",
                                    "OralIQ offloads 478-point facial mesh tracking to the student's browser while routing audio grading through a Priority AI Queue that prioritizes Campus & Pro exams and enforces strict per-exam student caps.",
                                )}
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 lg:col-span-4">
                            <div className="flex items-center gap-2.5 rounded-2xl border border-rule bg-sheet-2 px-4 py-3 text-xs font-bold text-ink">
                                <Sparkles className="size-4 shrink-0 text-[#6F4E37]" aria-hidden />
                                <span>{l("ترقية فورية للباقة من داخل لوحة تحكم الدكتور في أي وقت", "Instant 1-click plan upgrade inside the Lecturer Dashboard")}</span>
                            </div>
                            <div className="flex items-center gap-2.5 rounded-2xl border border-rule bg-sheet-2 px-4 py-3 text-xs font-bold text-ink">
                                <ShieldCheck className="size-4 shrink-0 text-[#6F4E37]" aria-hidden />
                                <span>{l("حفظ تلقائي لإجابات الطلاب حتى في أوقات الذروة", "Guaranteed zero-loss submission queuing under peak load")}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Section>
    );
}
