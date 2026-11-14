import { useEffect, useState } from "react";
import api from "../lib/api";
import { useI18n } from "../i18n";

type DeliveryStatus = {
    issues: string[];
    counts: Record<string, number>;
    pending: number;
    day_reserved: number;
    daily_limit: number;
    pause_until: string | null;
};

export function EmailDeliveryStatus() {
    const { l, lang } = useI18n();
    const [status, setStatus] = useState<DeliveryStatus | null>(null);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        let active = true;
        const load = () => api.get<DeliveryStatus>("/system/email-delivery")
            .then(({ data }) => { if (active) { setStatus(data); setFailed(false); } })
            .catch(() => { if (active) setFailed(true); });
        void load();
        const timer = window.setInterval(() => { void load(); }, 30000);
        return () => { active = false; window.clearInterval(timer); };
    }, []);
    const labels: Record<string, string> = {
        NOT_CONFIGURED: l("إعدادات البريد غير مكتملة.", "Email settings are incomplete."),
        WORKER_UNAVAILABLE: l("خدمة إرسال الرسائل لا تستجيب؛ يلزم فحصها.", "The email sender is not responding; check the service."),
        QUEUE_FULL: l("طابور الرسائل ممتلئ والتسجيل بالبريد متوقف مؤقتًا.", "The email queue is full; email signup is temporarily unavailable."),
        QUEUE_NEAR_CAPACITY: l("طابور الرسائل يقترب من الامتلاء.", "The email queue is nearing capacity."),
        DAILY_BUDGET: l("وصل الموقع إلى حد الإرسال اليومي المحدد؛ الرسائل تنتظر تجدد الحصة.", "The site's daily sending budget is reached; messages await the reset."),
        MONTHLY_BUDGET: l("وصل الموقع إلى حد الإرسال الشهري المحدد.", "The site's monthly sending budget is reached."),
        DAILY_BUDGET_WARNING: l("محاولات الإرسال تقترب من الحد اليومي المحدد.", "Sending attempts are nearing the daily budget."),
        MONTHLY_BUDGET_WARNING: l("محاولات الإرسال تقترب من الحد الشهري المحدد.", "Sending attempts are nearing the monthly budget."),
        AUTH_FAILED: l("خدمة البريد رفضت بيانات الدخول؛ راجع مفتاح الإرسال.", "The email provider rejected authentication; check the sending key."),
        DAILY_QUOTA: l("خدمة البريد أوقفت الإرسال بسبب الحصة اليومية.", "The email provider paused sending at its daily quota."),
        MONTHLY_QUOTA: l("خدمة البريد أوقفت الإرسال بسبب الحصة الشهرية.", "The email provider paused sending at its monthly quota."),
        FAILED_MESSAGES: l("توجد رسائل فشلت بعد المحاولات أو رفضتها خدمة البريد.", "Some messages failed after retries or were rejected."),
        EXPIRED_MESSAGES: l("توجد رسائل انتهت صلاحيتها قبل إرسالها؛ يمكن للمستخدم طلب رابط جديد.", "Some messages expired before sending; users can request a new link."),
    };
    if (!status && !failed) return null;
    return (
        <section className="mb-5 rounded-xl border border-rule bg-sheet p-4 text-ink" aria-label={l("متابعة رسائل الموقع", "Site email monitoring")}>
            <h2 className="font-bold">{l("متابعة رسائل الموقع", "Site email monitoring")}</h2>
            {failed && <p className="mt-2 text-sm text-mark" role="status">{l("تعذّر تحديث حالة البريد. أعد المحاولة لاحقًا.", "Email status could not be refreshed. Try again later.")}</p>}
            {status && <>
                <p className="mt-2 text-sm text-ink-2">
                    {l("في الانتظار", "Waiting")}: {status.pending}
                    {" · "}{l("قبلتها خدمة البريد", "Accepted by provider")}: {status.counts.sent ?? 0}
                    {" · "}{l("محاولات اليوم", "Today's attempts")}: {status.day_reserved}/{status.daily_limit || l("غير محدد", "No limit")}
                </p>
                <p className="mt-1 text-xs text-ink-2">{l("الأرقام تخص محاولات الموقع، وتشمل المحاولات الفاشلة. راجع خدمة البريد لمعرفة استهلاك الحساب كاملًا.", "Counts cover this site's attempts, including failures. Check your provider for total account usage.")}</p>
                {status.issues.length > 0 && <ul className="mt-3 space-y-1 text-sm text-mark" role="status">
                    {status.issues.map((issue) => <li key={issue}>{labels[issue] ?? l("الإرسال متوقف مؤقتًا بسبب مشكلة في خدمة البريد.", "Sending is temporarily paused due to an email-provider issue.")}</li>)}
                </ul>}
                {status.pause_until && <p className="mt-2 text-xs text-ink-2">{l("موعد المحاولة التالية", "Next retry")}: {new Date(status.pause_until).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB")}</p>}
            </>}
        </section>
    );
}
