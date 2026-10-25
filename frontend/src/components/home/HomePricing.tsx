import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpLeft, Check, Cpu, Crown, Layers, ShieldCheck, Sparkles, Users, Zap } from "lucide-react";
import { useI18n } from "../../i18n";
import { gsap, useGSAP, withMotion } from "../../lib/gsap";
import { Eyebrow, H2, Section } from "./ui";

/**
 * Section (#pricing): Subscription Plans & Computing Capacity Architecture
 * - Built around generous Exam Quotas + UNLIMITED Students per Exam + AI Priority Queue.
 * - Affordable teacher-first pricing (0 EGP / 199 EGP / 399 EGP / 699 EGP).
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
                    scrollTrigger: {
                        trigger: "[data-price-grid]",
                        start: "top 82%",
                    },
                },
            );
        });
    }, { scope: root, dependencies: [lang] });

    const plans = [
        {
            id: "free",
            badge: l("مجاناً للتجربة", "Free Starter"),
            name: l("الباقة المجانية", "Free Starter"),
            desc: l(
                "ابدأ فوراً وجرب المنصة مع كل طلابك ومجموعاتك بدون أي حد لعدد الطلاب.",
                "Start right away with your entire class — zero limit on student count.",
            ),
            priceEgp: 0,
            priceUsd: 0,
            maxExams: l("5 امتحانات شفوية", "5 Oral Exams"),
            maxStudents: l("غير محدود (مفتوح لكل طلابك)", "Unlimited Students"),
            maxDuration: l("3 دقائق / سؤال", "3 min / question"),
            queueTier: l("طابور معالجة قياسي", "Standard AI Queue"),
            featured: false,
            dark: false,
            features: [
                l("إنشاء حتى 5 امتحانات شفوية (حتى 10 أسئلة للامتحان)", "Up to 5 oral exams (10 questions per exam)"),
                l("عدد طلاب غير محدود داخل كل امتحان (100 أو 500+ طالب)", "Unlimited students per exam (100 or 500+ students)"),
                l("تصحيح تلقائي بالمعنى + تفريغ صوتي عربي وإنجليزي", "Semantic AI grading + Arabic & English speech-to-text"),
                l("مراقبة حيوية بـ 478 نقطة للوجه والعين والصوت", "478-point face, eye-gaze & voiceprint anti-cheat"),
            ],
        },
        {
            id: "pro",
            badge: l("في متناول كل مدرس", "Best for Teachers"),
            name: l("باقة المدرس الأساسية", "Teacher Plan"),
            desc: l(
                "مصممة للمدرسين والمعيدين والمحاضرين لعمل كويز شفوي يومي لكل مجموعاتهم بسعر رمزي.",
                "Designed for teachers and lecturers running regular oral quizzes across all their groups.",
            ),
            priceEgp: 199,
            priceUsd: 4,
            maxExams: l("30 امتحان / شهرياً", "30 Exams / month"),
            maxStudents: l("غير محدود (مفتوح لكل طلابك)", "Unlimited Students"),
            maxDuration: l("5 دقائق / سؤال", "5 min / question"),
            queueTier: l("أولوية معالجة سريعة (Fast)", "Fast Priority AI Queue"),
            featured: false,
            dark: false,
            features: [
                l("إنشاء حتى 30 امتحان شفوي شهرياً (حتى 20 سؤال للامتحان)", "Up to 30 oral exams/month (20 questions per exam)"),
                l("عدد طلاب غير محدود في كل امتحان بدون أي قيود", "Unlimited students in every exam with zero caps"),
                l("أولوية سريعة في طابور التصحيح بالذكاء الاصطناعي", "Fast priority in the AI grading queue"),
                l("تصدير كشوف الدرجات وتقارير النزاهة التفصيلية", "Export full gradebooks and detailed integrity reports"),
            ],
        },
        {
            id: "campus",
            badge: l("الأكثر طلباً للمحاضرين والسناتر", "Most Popular"),
            name: l("باقة المحاضر والسناتر", "Pro Lecturer & Centers"),
            desc: l(
                "للمدرسين أصحاب المجموعات الكبيرة، المحاضرين الجامعيين، والسناتر التعليمية.",
                "For high-volume teachers, university professors, and educational centers.",
            ),
            priceEgp: 399,
            priceUsd: 8,
            maxExams: l("100 امتحان / شهرياً", "100 Exams / month"),
            maxStudents: l("غير محدود (مفتوح لكل الدفعات)", "Unlimited Students"),
            maxDuration: l("10 دقائق / سؤال", "10 min / question"),
            queueTier: l("أولوية قصوى وقت الذروة (VIP)", "VIP Turbo AI Queue"),
            featured: true,
            dark: true,
            features: [
                l("إنشاء حتى 100 امتحان شفوي شهرياً (حتى 35 سؤال للامتحان)", "Up to 100 oral exams/month (35 questions per exam)"),
                l("عدد طلاب غير محدود في كل امتحان مهما كان حجم الدفعة", "Unlimited students per exam for any cohort size"),
                l("أولوية قصوى فورية وقت الذروة (VIP Turbo AI Queue)", "VIP Turbo priority in the AI grading queue during peak hours"),
                l("تحليلات متقدمة لأداء المجموعات وإعادة فتح بصمة الصوت", "Advanced cohort analytics & biometric re-enrollment controls"),
            ],
        },
        {
            id: "enterprise",
            badge: l("امتحانات بلا حدود", "Unlimited Exams"),
            name: l("باقة بلا حدود (مدارس وجامعات)", "Unlimited & Campus"),
            desc: l(
                "امتحانات مفتوحة بلا حدود مع معالجة فورية مخصصة وإمكانية الربط داخل منصتك التعليمية.",
                "Unlimited oral exams with dedicated instant AI grading and optional LMS/API integration.",
            ),
            priceEgp: 699,
            priceUsd: 14,
            maxExams: l("غير محدود (امتحانات مفتوحة)", "Unlimited Exams"),
            maxStudents: l("غير محدود (مفتوح لكل الطلاب)", "Unlimited Students"),
            maxDuration: l("15 دقيقة / سؤال", "15 min / question"),
            queueTier: l("معالجة فورية مخصصة (Instant)", "Dedicated Instant AI"),
            featured: false,
            dark: false,
            features: [
                l("عدد غير محدود من الامتحانات الشفوية طوال الشهر (حتى 50 سؤال)", "Unlimited oral exams all month (up to 50 questions/exam)"),
                l("عدد طلاب غير محدود في جميع الامتحانات والدفعات", "Unlimited students across all exams and cohorts"),
                l("مسار معالجة فوري مخصص بدون أي انتظار وقت الذروة", "Dedicated instant AI processing with zero queue wait"),
                l("إمكانية الربط عبر API / LTI كـ فيتشر داخل منصتك أو مدرستك", "Optional API / LTI white-label integration into your LMS"),
            ],
        },
    ];

    const formatPrice = (egp: number, usd: number) => {
        if (egp === 0) return l("مجاناً", "Free");
        const factor = billingCycle === "semester" ? 0.8 : 1;
        if (currency === "EGP") {
            const val = Math.round(egp * factor);
            return `${val.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")} ${l("ج.م", "EGP")}`;
        }
        const val = Math.max(1, Math.round(usd * factor));
        return `$${val}`;
    };

    return (
        <Section id="pricing" tone="a" className="py-16 sm:py-24 lg:py-32">
            <div ref={root} className="mx-auto max-w-[92rem] px-4 sm:px-8 lg:px-12">
                {/* Header & Controls */}
                <div className="flex flex-col items-center text-center">
                    <Eyebrow>{l("خطط الاشتراك والأسعار", "Teacher-Friendly Subscription Plans")}</Eyebrow>
                    <h2 className={`${H2} mt-2 max-w-3xl text-ink`}>
                        {l(
                            "باقات في متناول كل مدرس ومحاضر، بعدد طلاب غير محدود.",
                            "Affordable plans for every teacher, with unlimited students per exam.",
                        )}
                    </h2>
                    <p className="mt-4 max-w-2xl text-base sm:text-lg font-medium text-ink-2 leading-relaxed">
                        {l(
                            "اختار الباقة على قد عدد الامتحانات اللي بتعملها في الشهر بس — وأي امتحان تبعته يقدر يدخله 100 أو 500 أو 1000 طالب بدون أي حد أقصى لعدد الطلاب!",
                            "Choose your plan based solely on how many exams you create per month — every exam link supports 100, 500, or 1,000+ students with zero student caps!",
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
                                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
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

                                {/* Key Capacity Limits Pills (Exams + Unlimited Students + AI Queue) */}
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
                                            <span>{l("عدد الطلاب", "Students")}</span>
                                        </div>
                                        <p className="mt-1 text-xs sm:text-sm font-extrabold">{p.maxStudents}</p>
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
                                            ? l("ابدأ الباقة المجانية الآن", "Start Free Now")
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
                                <span>{l("إدارة ذكية للموارد الحوسبية بدون تقييد عدد الطلاب", "Smart AI Capacity Management With Unlimited Students")}</span>
                            </div>
                            <h3 className="ar-heading mt-2 font-display text-lg sm:text-xl font-bold text-ink">
                                {l(
                                    "إزاي بنسمح بعدد طلاب غير محدود في الامتحان من غير ما السيرفر يقع؟",
                                    "How we support unlimited students per exam with zero server overload:",
                                )}
                            </h3>
                            <p className="ar-body mt-2 text-sm leading-relaxed text-ink-2">
                                {l(
                                    "رؤية الكمبيوتر وتتبُّع الـ 478 نقطة بيتم معالجتها بالكامل على جهاز الطالب أثناء الامتحان، بينما إجابات الصوت بتدخل في طابور ذكي (Priority AI Queue) بيحفظ كل إجابة فوراً ويصححها بالترتيب مع إعطاء أولوية فورية للباقات المدفوعة وقت الذروة.",
                                    "478-point facial mesh tracking runs 100% on the student's device, while spoken answers enter our Priority AI Queue that saves every submission immediately and prioritizes paid plans during peak hours.",
                                )}
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 lg:col-span-4">
                            <div className="flex items-center gap-2.5 rounded-2xl border border-rule bg-sheet-2 px-4 py-3 text-xs font-bold text-ink">
                                <Sparkles className="size-4 shrink-0 text-[#6F4E37]" aria-hidden />
                                <span>{l("عدد طلاب مفتوح في كل الباقات حتى الباقة المجانية", "Unlimited students per exam across all tiers including Free")}</span>
                            </div>
                            <div className="flex items-center gap-2.5 rounded-2xl border border-rule bg-sheet-2 px-4 py-3 text-xs font-bold text-ink">
                                <ShieldCheck className="size-4 shrink-0 text-[#6F4E37]" aria-hidden />
                                <span>{l("حفظ تلقائي لإجابات جميع الطلاب حتى في أوقات الذروة", "Guaranteed zero-loss submission queuing under peak load")}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Section>
    );
}
