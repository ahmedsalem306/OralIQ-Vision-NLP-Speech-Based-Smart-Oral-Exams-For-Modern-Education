import { useEffect, useState } from "react";
import { AlertTriangle, Check, CreditCard, Crown, Layers, ShieldCheck, Sparkles, Users, Wallet, X, Zap } from "lucide-react";
import api from "../lib/api";
import { useI18n } from "../i18n";

export interface PlanInfo {
    id: string;
    name_ar: string;
    name_en: string;
    price_usd: number;
    price_egp: number;
    max_exams: number;
    max_questions_per_exam: number;
    max_students_per_exam: number;
    max_duration_minutes: number;
    queue_priority: number;
    queue_label_ar: string;
    queue_label_en: string;
}

export interface BillingStatusResponse {
    plan: PlanInfo;
    plan_tier: string;
    plan_updated_at?: string | null;
    usage: {
        exams_used: number;
        exams_limit: number;
        exams_remaining: number;
        max_students_per_exam: number;
        max_questions_per_exam: number;
        max_duration_minutes: number;
        peak_students_in_single_exam: number;
        total_submissions: number;
        exam_student_counts: Record<string, number>;
    };
    all_plans: PlanInfo[];
}

const CANONICAL_PLANS: Record<string, PlanInfo> = {
    free: {
        id: "free",
        name_ar: "الباقة المجانية",
        name_en: "Free Starter",
        price_usd: 0,
        price_egp: 0,
        max_exams: 5,
        max_questions_per_exam: 10,
        max_students_per_exam: 0,
        max_duration_minutes: 3,
        queue_priority: 3,
        queue_label_ar: "طابور معالجة قياسي (Standard)",
        queue_label_en: "Standard AI Queue",
    },
    pro: {
        id: "pro",
        name_ar: "باقة المدرس الأساسية",
        name_en: "Teacher Plan",
        price_usd: 2,
        price_egp: 99,
        max_exams: 30,
        max_questions_per_exam: 20,
        max_students_per_exam: 0,
        max_duration_minutes: 5,
        queue_priority: 2,
        queue_label_ar: "أولوية معالجة سريعة (Fast Queue)",
        queue_label_en: "Fast Priority AI Queue",
    },
    campus: {
        id: "campus",
        name_ar: "باقة المحاضر والسناتر",
        name_en: "Pro Lecturer & Centers",
        price_usd: 5,
        price_egp: 249,
        max_exams: 100,
        max_questions_per_exam: 35,
        max_students_per_exam: 0,
        max_duration_minutes: 10,
        queue_priority: 1,
        queue_label_ar: "أولوية قصوى وقت الذروة (VIP Turbo)",
        queue_label_en: "VIP Turbo AI Queue",
    },
    enterprise: {
        id: "enterprise",
        name_ar: "باقة بلا حدود (مدارس وجامعات)",
        name_en: "Unlimited & Campus",
        price_usd: 10,
        price_egp: 499,
        max_exams: 9999,
        max_questions_per_exam: 50,
        max_students_per_exam: 0,
        max_duration_minutes: 15,
        queue_priority: 0,
        queue_label_ar: "معالجة فورية بلا حدود (Instant AI)",
        queue_label_en: "Dedicated Instant AI Queue",
    },
};

function normalizeBillingStatus(raw: BillingStatusResponse): BillingStatusResponse {
    const tier = (raw.plan_tier || raw.plan?.id || "free").toLowerCase();
    const canonicalPlan = CANONICAL_PLANS[tier] || CANONICAL_PLANS.free;
    const examsUsed = raw.usage?.exams_used ?? 0;
    const examsLimit = canonicalPlan.max_exams;
    return {
        ...raw,
        plan: canonicalPlan,
        plan_tier: canonicalPlan.id,
        usage: {
            ...raw.usage,
            exams_used: examsUsed,
            exams_limit: examsLimit,
            exams_remaining: Math.max(0, examsLimit - examsUsed),
            max_students_per_exam: 0,
            max_questions_per_exam: canonicalPlan.max_questions_per_exam,
            max_duration_minutes: canonicalPlan.max_duration_minutes,
        },
        all_plans: Object.values(CANONICAL_PLANS),
    };
}

export function SubscriptionQuotaBar({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
    const { l, lang } = useI18n();
    const [data, setData] = useState<BillingStatusResponse | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string>("pro");
    const [currency, setCurrency] = useState<"EGP" | "USD">("EGP");
    const [paymentMethod, setPaymentMethod] = useState<"card" | "instapay" | "invoice">("card");
    const [upgrading, setUpgrading] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    const fetchStatus = async () => {
        try {
            const res = await api.get<BillingStatusResponse>("/billing/status");
            const normalized = normalizeBillingStatus(res.data);
            setData(normalized);
            if (normalized.plan_tier === "free") setSelectedPlan("pro");
            else if (normalized.plan_tier === "pro") setSelectedPlan("campus");
            else setSelectedPlan("enterprise");
        } catch {
            setData(
                normalizeBillingStatus({
                    plan: CANONICAL_PLANS.free,
                    plan_tier: "free",
                    usage: {
                        exams_used: 0,
                        exams_limit: 5,
                        exams_remaining: 5,
                        max_students_per_exam: 0,
                        max_questions_per_exam: 10,
                        max_duration_minutes: 3,
                        peak_students_in_single_exam: 0,
                        total_submissions: 0,
                        exam_student_counts: {},
                    },
                    all_plans: Object.values(CANONICAL_PLANS),
                }),
            );
        }
    };

    useEffect(() => {
        fetchStatus();
    }, [refreshTrigger]);

    if (!data) return null;

    const { plan, usage, all_plans } = data;
    const isUnlimitedExams = usage.exams_limit >= 9999;
    const pct = isUnlimitedExams
        ? Math.min(100, Math.max(8, usage.exams_used * 2))
        : Math.min(100, Math.round((usage.exams_used / Math.max(1, usage.exams_limit)) * 100));
    const isNearLimit = !isUnlimitedExams && usage.exams_remaining <= 1;
    const isExhausted = !isUnlimitedExams && usage.exams_remaining === 0;

    const handleUpgrade = async () => {
        setUpgrading(true);
        setToastMsg(null);
        try {
            const res = await api.post<BillingStatusResponse & { message: string; checkout_url?: string | null }>("/billing/upgrade", {
                plan_id: selectedPlan,
                currency,
                payment_method: paymentMethod,
            });
            if (res.data.checkout_url) {
                window.location.href = res.data.checkout_url;
                return;
            }
            const normalized = normalizeBillingStatus(res.data);
            setData(normalized);
            setToastMsg(
                lang === "ar"
                    ? `تم تفعيل ${normalized.plan.name_ar} بنجاح (${currency === "EGP" ? `${normalized.plan.price_egp} ج.م` : `$${normalized.plan.price_usd}`})!`
                    : `Successfully upgraded to ${normalized.plan.name_en}!`,
            );
            setTimeout(() => {
                setModalOpen(false);
                setToastMsg(null);
            }, 1300);
        } catch {
            setToastMsg(l("تعذر تحديث الباقة حالياً، حاول مرة أخرى", "Could not update plan right now"));
        } finally {
            setUpgrading(false);
        }
    };

    return (
        <>
            <div className="mb-6 rounded-[22px] border border-rule bg-sheet p-5 sm:p-6 shadow-card">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    {/* Plan Identity & Quota Progress */}
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#6F4E37] px-3.5 py-1 text-xs font-bold text-[#FAF6F0]">
                                <Crown className="size-3.5 text-[#E3A458]" aria-hidden />
                                {lang === "ar" ? plan.name_ar : plan.name_en}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-sheet-2 px-3 py-1 text-xs font-bold text-pen">
                                <Zap className="size-3.5 text-[#E3A458]" aria-hidden />
                                {lang === "ar" ? plan.queue_label_ar : plan.queue_label_en}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-sheet-2 px-3 py-1 text-xs font-bold text-ink-2">
                                <Users className="size-3.5 text-[#6F4E37]" aria-hidden />
                                {l(
                                    "عدد الطلاب لكل امتحان: غير محدود (مفتوح لكل طلابك)",
                                    "Students per exam: Unlimited (Open to all students)",
                                )}
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-4 max-w-xl">
                            <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-ink-2">
                                    {l("رصيد الامتحانات المنشأة:", "Created Exams Quota:")}{" "}
                                    <strong className="wb-num text-ink">
                                        {isUnlimitedExams
                                            ? `${usage.exams_used} / ${l("غير محدود", "Unlimited")}`
                                            : `${usage.exams_used} / ${usage.exams_limit}`}
                                    </strong>
                                </span>
                                <span
                                    className={
                                        isExhausted
                                            ? "text-bad"
                                            : isNearLimit
                                              ? "text-warn"
                                              : "text-pen"
                                    }
                                >
                                    {isExhausted
                                        ? l("انتهى رصيد الامتحانات في باقتك الحالية", "Exam quota reached")
                                        : isUnlimitedExams
                                          ? l(
                                                `امتحانات غير محدودة (حتى ${usage.max_duration_minutes} د/سؤال)`,
                                                `Unlimited exams (up to ${usage.max_duration_minutes}m/question)`,
                                            )
                                          : l(
                                                `متبقي ${usage.exams_remaining} امتحانات (حتى ${usage.max_duration_minutes} د/سؤال)`,
                                                `${usage.exams_remaining} exams left (up to ${usage.max_duration_minutes}m/question)`,
                                            )}
                                </span>
                            </div>
                            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-sheet-2 border border-rule">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        isExhausted
                                            ? "bg-bad"
                                            : isNearLimit
                                              ? "bg-warn"
                                              : "bg-[#6F4E37]"
                                    }`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>

                        {isNearLimit && (
                            <p className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-warn">
                                <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                                {isExhausted
                                    ? l(
                                          "وصلت للحد الأقصى للامتحانات — قم بترقية الباقة لإنشاء امتحانات جديدة وزيادة سعة الطلاب.",
                                          "You reached your exam limit — upgrade your plan to create more exams and increase student capacity.",
                                      )
                                    : l(
                                          "اقتربت من استهلاك باقتك الحالية — يمكنك الترقية في أي وقت لزيادة عدد الامتحانات وسعة الطلاب.",
                                          "You are close to your exam limit — upgrade anytime for more exams and higher student caps.",
                                      )}
                            </p>
                        )}
                    </div>

                    {/* Upgrade CTA */}
                    <div className="flex shrink-0 items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => setModalOpen(true)}
                            className="oiq-btn-mint inline-flex h-11 items-center gap-2 rounded-full px-5 text-xs sm:text-sm font-bold text-[#FAF6F0] shadow-sm transition-transform active:scale-[0.98]"
                        >
                            <Sparkles className="size-4 text-[#E3A458]" aria-hidden />
                            <span>{l("ترقية الباقة / سعة الطلاب", "Upgrade Plan & Capacity")}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Interactive Upgrade & Billing Modal */}
            {modalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-6 backdrop-blur-xs"
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="relative max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-[26px] border border-rule bg-paper p-5 sm:p-8 text-ink shadow-float">
                        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-4">
                            <div>
                                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-pen">
                                    <Crown className="size-4 text-[#E3A458]" aria-hidden />
                                    {l("إدارة الاشتراك وترقية الباقة", "Subscription & Plan Upgrade")}
                                </span>
                                <h2 className="ar-heading mt-1 font-display text-xl sm:text-2xl font-bold text-ink">
                                    {l("اختر الباقة المناسبة لعدد امتحاناتك الشهرية", "Select the plan that matches your monthly exam volume")}
                                </h2>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <div className="inline-flex items-center rounded-full border border-rule bg-sheet p-1 shadow-xs">
                                    <button
                                        type="button"
                                        onClick={() => setCurrency("EGP")}
                                        className={`wb-num rounded-full px-3 py-1.5 text-xs font-extrabold transition-all ${
                                            currency === "EGP" ? "bg-[#6F4E37] text-[#FAF6F0]" : "text-ink-2 hover:text-ink"
                                        }`}
                                    >
                                        EGP (ج.م)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCurrency("USD")}
                                        className={`wb-num rounded-full px-3 py-1.5 text-xs font-extrabold transition-all ${
                                            currency === "USD" ? "bg-[#6F4E37] text-[#FAF6F0]" : "text-ink-2 hover:text-ink"
                                        }`}
                                    >
                                        USD ($)
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="flex size-9 items-center justify-center rounded-full border border-rule bg-sheet text-ink-2 hover:bg-sheet-2 hover:text-ink"
                                    aria-label={l("إغلاق", "Close")}
                                >
                                    <X className="size-4" />
                                </button>
                            </div>
                        </div>

                        {/* Plans Selector Grid */}
                        <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                            {all_plans.map((p) => {
                                const isCurrent = p.id === plan.id;
                                const isSelected = p.id === selectedPlan;
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => setSelectedPlan(p.id)}
                                        className={`flex flex-col justify-between rounded-[20px] p-4 text-start transition-all ${
                                            isSelected
                                                ? "wb-mocha-stage border-2 border-[#E3A458] text-[#FAF6F0] shadow-md"
                                                : "border border-rule bg-sheet text-ink hover:bg-sheet-2"
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-extrabold uppercase tracking-wider opacity-75">
                                                    {p.id}
                                                </span>
                                                {isCurrent && (
                                                    <span className="rounded-full bg-[#E3A458] px-2.5 py-0.5 text-[10px] font-extrabold text-[#18110D]">
                                                        {l("باقتك الحالية", "Current")}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="ar-heading mt-2 font-display text-base font-bold">
                                                {lang === "ar" ? p.name_ar : p.name_en}
                                            </h3>
                                            <p className="wb-num mt-2 text-2xl font-extrabold">
                                                {p.price_egp === 0
                                                    ? l("مجاناً", "Free")
                                                    : currency === "EGP"
                                                      ? `${p.price_egp.toLocaleString()} ${l("ج.م", "EGP")}`
                                                      : `$${p.price_usd}`}
                                                {p.price_egp > 0 && (
                                                    <span className="text-xs font-normal opacity-75"> / {l("شهر", "mo")}</span>
                                                )}
                                            </p>

                                            <div className="mt-3 space-y-1.5 border-t border-current/15 pt-3 text-xs font-bold">
                                                <div className="flex items-center gap-1.5">
                                                    <Layers className="size-3.5 text-[#E3A458]" aria-hidden />
                                                    <span>
                                                        {p.max_exams >= 9999
                                                            ? l("امتحانات غير محدودة", "Unlimited Exams")
                                                            : l(`${p.max_exams} امتحان`, `${p.max_exams} Exams`)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Users className="size-3.5 text-[#E3A458]" aria-hidden />
                                                    <span>{l("عدد طلاب غير محدود", "Unlimited students")}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Zap className="size-3.5 text-[#E3A458]" aria-hidden />
                                                    <span>{lang === "ar" ? p.queue_label_ar : p.queue_label_en}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex items-center gap-1.5 text-xs font-extrabold">
                                            <span
                                                className={`flex size-4 items-center justify-center rounded-full ${
                                                    isSelected ? "bg-[#E3A458] text-[#18110D]" : "border border-current/30"
                                                }`}
                                            >
                                                {isSelected && <Check className="size-2.5 stroke-[3]" />}
                                            </span>
                                            <span>{isSelected ? l("محدد للترقية", "Selected") : l("اختر الباقة", "Select")}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Payment Method Selector */}
                        <div className="mt-6 rounded-[20px] border border-rule bg-sheet p-4 sm:p-5">
                            <p className="text-xs font-extrabold text-ink-2">
                                {currency === "EGP"
                                    ? l("وسيلة الدفع بالجنيه المصري (Paymob / InstaPay):", "EGP Payment Method (Paymob / InstaPay):")
                                    : l("وسيلة الدفع بالدولار (Stripe / Global Checkout):", "USD Payment Method (Stripe / Global Checkout):")}
                            </p>
                            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                                {(currency === "EGP"
                                    ? [
                                          { id: "card" as const, icon: CreditCard, label: l("بطاقة بنكية محلية / ميزة (Paymob)", "Local Card / Meeza (Paymob)") },
                                          { id: "instapay" as const, icon: Wallet, label: l("إنستا باي / فودافون كاش", "InstaPay / Vodafone Cash") },
                                          { id: "invoice" as const, icon: ShieldCheck, label: l("كود فوري / تعاقد مؤسسي", "Fawry Code / Institutional") },
                                      ]
                                    : [
                                          { id: "card" as const, icon: CreditCard, label: l("بطاقة دولية (Visa / Mastercard)", "International Card (Stripe)") },
                                          { id: "instapay" as const, icon: Wallet, label: l("Apple Pay / Google Pay / PayPal", "Apple Pay / Google Pay / PayPal") },
                                          { id: "invoice" as const, icon: ShieldCheck, label: l("تعاقد مؤسسي (جامعات ومدارس)", "Institutional Invoice") },
                                      ]
                                ).map((pm) => (
                                    <button
                                        key={pm.id}
                                        type="button"
                                        onClick={() => setPaymentMethod(pm.id)}
                                        className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-all ${
                                            paymentMethod === pm.id
                                                ? "border-[#6F4E37] bg-[#6F4E37]/12 text-ink"
                                                : "border-rule bg-sheet-2 text-ink-2 hover:text-ink"
                                        }`}
                                    >
                                        <pm.icon className="size-4 shrink-0 text-[#6F4E37]" aria-hidden />
                                        <span>{pm.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {toastMsg && (
                            <div className="mt-4 rounded-xl border border-good/30 bg-good-soft px-4 py-3 text-xs font-bold text-good">
                                {toastMsg}
                            </div>
                        )}

                        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="h-11 rounded-full border border-rule bg-sheet px-5 text-xs sm:text-sm font-bold text-ink-2 hover:bg-sheet-2 hover:text-ink"
                            >
                                {l("إلغاء", "Cancel")}
                            </button>
                            <button
                                type="button"
                                disabled={upgrading}
                                onClick={handleUpgrade}
                                className="oiq-btn-mint inline-flex h-11 items-center gap-2 rounded-full px-6 text-xs sm:text-sm font-bold text-[#FAF6F0] disabled:opacity-50"
                            >
                                <Sparkles className="size-4 text-[#E3A458]" aria-hidden />
                                <span>
                                    {upgrading
                                        ? l("جاري تفعيل الباقة...", "Activating plan...")
                                        : l("تأكيد وتفعيل الباقة فوراً", "Confirm & Activate Plan Now")}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
