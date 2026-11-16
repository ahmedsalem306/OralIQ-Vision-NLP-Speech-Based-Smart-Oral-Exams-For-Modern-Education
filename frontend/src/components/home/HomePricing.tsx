import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpLeft, Check, Crown, Layers, Users, Zap } from "lucide-react";
import { useI18n } from "../../i18n";
import { gsap, useGSAP, withMotion } from "../../lib/gsap";
import { Eyebrow, H2, Section } from "./ui";

/**
 * Section (#pricing): Subscription Plans
 * - Plans (mirror backend app/core/plans.py): Free 0 / Basic 199 / Professional 599 EGP per month / Enterprise per contract.
 * - Limits: exams per month, questions per exam, answer duration, distinct students per month.
 * - Matches the Warm Espresso Brown (#6F4E37 / #1E140F), Warm Off-White (#FAF6F0), and Caramel Gold (#E3A458) identity.
 */
export function HomePricing({ startHref }: { startHref: string }) {
    const { l, lang } = useI18n();
    const root = useRef<HTMLDivElement>(null);
    const [currency, setCurrency] = useState<"EGP" | "USD">("EGP");
    const [billingCycle, setBillingCycle] = useState<"monthly" | "term" | "yearly">("monthly");

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
            badge: l("مجاناً للتجربة", "Free Trial"),
            name: l("الباقة المجانية", "Free"),
            desc: l(
                "جرّب المنصة بنفسك مع طلابك قبل ما تشترك.",
                "Try the platform with your students before subscribing.",
            ),
            priceEgp: 0,
            priceUsd: 0,
            maxExams: l("5 امتحانات (مرة واحدة)", "5 exams (one-time)"),
            maxStudents: l("5 مشاركات طلاب للتجربة", "5 trial student participations"),
            maxDuration: l("دقيقتان / امتحان", "2 min / exam"),
            queueTier: l("طابور معالجة عادي", "Standard AI Queue"),
            featured: false,
            dark: false,
            features: [
                l("5 روابط امتحانات تجريبية (حتى سؤالين للامتحان)", "5 trial exam links (up to 2 questions each)"),
                l("5 مشاركات طلاب إجمالًا، دقيقتان للامتحان كله", "5 student attempts total, 2 minutes per whole exam"),
                l("تصحيح تلقائي بالمعنى + تفريغ صوتي عربي وإنجليزي", "Semantic AI grading + Arabic & English speech-to-text"),
                l("فحوص هوية ومؤشرات مراقبة مع مراجعة المحاضر", "Identity checks and monitoring indicators for lecturer review"),
            ],
        },
        {
            id: "pro",
            badge: l("للمدرسين", "For Teachers"),
            name: l("الباقة الأساسية", "Basic"),
            desc: l(
                "للمدرس: رصيد 150 مشاركة طالب كل 30 يومًا.",
                "For teachers: 150 student participations every 30 days.",
            ),
            priceEgp: 199,
            priceUsd: 4,
            maxExams: l("15 امتحان / شهرياً", "15 exams / month"),
            maxStudents: l("150 مشاركة طالب / دورة", "150 student participations / cycle"),
            maxDuration: l("دقيقتان / امتحان", "2 min / exam"),
            queueTier: l("أولوية معالجة سريعة", "Fast Priority AI Queue"),
            featured: false,
            dark: false,
            features: [
                l("15 رابط امتحان لكل دورة (حتى سؤالين للامتحان)", "15 exam links per cycle (up to 2 questions each)"),
                l("150 مشاركة طالب، دقيقتان للامتحان كله", "150 student participations, 2 minutes per whole exam"),
                l("أولوية سريعة في طابور التصحيح", "Fast priority in the AI grading queue"),
                l("إعادة فتح نفس المحاولة لا تستهلك رصيدًا جديدًا", "Resuming the same attempt uses no extra credit"),
            ],
        },
        {
            id: "campus",
            badge: l("للفرق التعليمية", "For Teaching Teams"),
            name: l("الباقة الاحترافية", "Professional"),
            desc: l(
                "رصيد 600 مشاركة طالب كل 30 يومًا، مشترك مع 3 مساعدين.",
                "600 student participations every 30 days, pooled with 3 assistants.",
            ),
            priceEgp: 599,
            priceUsd: 12,
            maxExams: l("30 امتحان / شهرياً", "30 exams / month"),
            maxStudents: l("600 مشاركة طالب / دورة", "600 student participations / cycle"),
            maxDuration: l("دقيقتان / امتحان", "2 min / exam"),
            queueTier: l("أولوية قصوى (VIP)", "VIP AI Queue"),
            featured: true,
            dark: true,
            features: [
                l("30 رابط امتحان لكل دورة (حتى سؤالين للامتحان)", "30 exam links per cycle (up to 2 questions each)"),
                l("600 مشاركة طالب، دقيقتان للامتحان كله", "600 student participations, 2 minutes per whole exam"),
                l("3 حسابات مساعدين (معيدين / مدرسين في السنتر)", "3 assistant accounts (TAs / center teachers)"),
                l("أولوية قصوى وقت الذروة + تحليلات متقدمة", "VIP peak-time priority + advanced analytics"),
            ],
        },
        {
            id: "enterprise",
            badge: l("مدارس وجامعات", "Schools & Universities"),
            name: l("باقة المؤسسات", "Enterprise"),
            desc: l(
                "حجم استخدام وسعة متزامنة يتحددان بعرض سعر وقياس قبل التفعيل.",
                "Usage and concurrent capacity agreed and measured before activation.",
            ),
            priceEgp: -1,
            priceUsd: -1,
            maxExams: l("حسب الاتفاق", "Custom"),
            maxStudents: l("محاولات حسب العقد", "Contracted attempts"),
            maxDuration: l("دقيقتان / امتحان", "2 min / exam"),
            queueTier: l("أولوية حسب السعة", "Capacity-based priority"),
            featured: false,
            dark: false,
            features: [
                l("رصيد محاولات محدد للمؤسسة حسب الاتفاق", "A bounded attempt allowance agreed for the institution"),
                l("حتى سؤالين، ودقيقتان للامتحان كله", "Up to 2 questions, 2 minutes for the entire exam"),
                l("رصيد مشترك للمحاضر ومساعديه", "Shared allowance for the lecturer and assistants"),
                l("تحديد جدول الامتحانات قبل التشغيل بأعداد كبيرة", "Schedule large cohorts before rollout"),
            ],
        },
    ];

    // Term = 4 months for the price of 3; Year = 12 months for the price of 10.
    const cycleMultiplier = { monthly: 1, term: 3, yearly: 10 } as const;
    const cycleLabel = {
        monthly: l("شهرياً", "month"),
        term: l("الترم (4 شهور)", "term (4 months)"),
        yearly: l("سنوياً", "year"),
    } as const;

    const formatPrice = (egp: number, usd: number) => {
        if (egp < 0) return l("تواصل معنا", "Contact us");
        if (egp === 0) return l("مجاناً", "Free");
        const factor = cycleMultiplier[billingCycle];
        if (currency === "EGP") {
            const val = egp * factor;
            return `${val.toLocaleString(lang === "ar" ? "ar-EG" : "en-US")} ${l("ج.م", "EGP")}`;
        }
        return `$${usd * factor}`;
    };

    return (
        <Section id="pricing" tone="a" className="py-16 sm:py-24 lg:py-32">
            <div ref={root} className="mx-auto max-w-[92rem] px-4 sm:px-8 lg:px-12">
                {/* Header & Controls */}
                <div className="flex flex-col items-center text-center">
                    <Eyebrow>{l("خطط الاشتراك والأسعار", "Subscription Plans")}</Eyebrow>
                    <h2 className={`${H2} mt-2 max-w-3xl text-ink`}>
                        {l(
                            "باقة على قد احتياجك — من مدرس لحد جامعة.",
                            "A plan that fits you — from a single teacher to a whole university.",
                        )}
                    </h2>
                    <p className="mt-4 max-w-2xl text-base sm:text-lg font-medium text-ink-2 leading-relaxed">
                        {l(
                            "المشاركة = طالب يبدأ امتحانًا مدته دقيقتان إجمالًا: سؤال واحد بدقيقتين، أو سؤالان بدقيقة لكل سؤال. تُحجز عند البدء حتى لو لم يُكمل؛ الرجوع لنفس المحاولة لا يخصم مجددًا، وإعادة الامتحان محاولة جديدة. الرصيد المدفوع يتجدد كل 30 يومًا ولا يُرحّل. حد الإطلاق الحالي 10 طلاب نشطين للمنصة كلها؛ ظهور النتيجة حسب الطابور.",
                            "One participation starts a two-minute exam: one two-minute question, or two one-minute questions. Reserved on start even if abandoned; resuming is free, a retake uses another attempt. Paid allowances reset every 30 days without rollover. Launch admission is 10 active students across the platform; results depend on the queue.",
                        )}
                    </p>
                    <p className="mt-2 max-w-2xl text-xs text-ink-2">
                        {l("إعادة المعالجة اليدوية لإجابة فشل تصحيحها تستهلك محاولة إضافية؛ انتظار الطابور وإعادات المعالجة التلقائية لا تخصم محاولات إضافية.",
                           "Manually reprocessing a failed answer uses another attempt; queue waits and automatic processing retries use no extra attempt credits.")}
                    </p>

                    {/* Currency & Cycle Switchers */}
                    <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                        <div className="inline-flex items-center rounded-full border border-rule bg-sheet p-1 shadow-xs">
                            {([
                                { id: "monthly", label: l("شهري", "Monthly"), tag: null },
                                { id: "term", label: l("ترم (4 شهور)", "Term (4 mo)"), tag: l("شهر مجاناً", "1 mo free") },
                                { id: "yearly", label: l("سنوي", "Yearly"), tag: l("شهرين مجاناً", "2 mo free") },
                            ] as const).map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => setBillingCycle(c.id)}
                                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs sm:text-sm font-bold transition-all ${
                                        billingCycle === c.id
                                            ? "bg-[#6F4E37] text-[#FAF6F0] shadow-xs"
                                            : "text-ink-2 hover:text-ink"
                                    }`}
                                >
                                    <span>{c.label}</span>
                                    {c.tag && (
                                        <span className="rounded-full bg-[#E3A458] px-2 py-0.5 text-[10px] font-extrabold text-[#18110D]">
                                            {c.tag}
                                        </span>
                                    )}
                                </button>
                            ))}
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
                                            / {cycleLabel[billingCycle]}
                                        </span>
                                    )}
                                </div>

                                {/* Key Capacity Limits Pills (Exams + Unlimited Students + AI Queue) */}
                                <div className="mt-5 grid grid-cols-2 gap-2.5">
                                    <div className={`rounded-2xl p-3 ${p.dark ? "bg-black/25 border border-white/10" : "bg-sheet-2 border border-rule"}`}>
                                        <div className="flex items-center gap-1.5 text-[11px] font-bold opacity-75">
                                            <Layers className="size-3.5 text-[#E3A458]" aria-hidden />
                                            <span>{l("روابط الامتحانات", "Exam links")}</span>
                                        </div>
                                        <p className="mt-1 text-sm font-extrabold">{p.maxExams}</p>
                                    </div>
                                    <div className={`rounded-2xl p-3 ${p.dark ? "bg-black/25 border border-white/10" : "bg-sheet-2 border border-rule"}`}>
                                        <div className="flex items-center gap-1.5 text-[11px] font-bold opacity-75">
                                            <Users className="size-3.5 text-[#E3A458]" aria-hidden />
                                            <span>{l("مشاركات الطلاب", "Student participations")}</span>
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
                                    to={p.priceEgp < 0 ? "#contact" : startHref}
                                    className={`inline-flex h-12 w-full items-center justify-between rounded-full ps-5 pe-2 text-sm font-bold transition-all ${
                                        p.dark
                                            ? "bg-[#FAF6F0] text-[#18110D] hover:bg-[#E3A458]"
                                            : "oiq-btn-mint text-[#FAF6F0]"
                                    }`}
                                >
                                    <span>
                                        {p.priceEgp === 0
                                            ? l("ابدأ الباقة المجانية الآن", "Start Free Now")
                                            : p.priceEgp < 0
                                                ? l("تواصل معنا", "Contact sales")
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
            </div>
        </Section>
    );
}
