import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { onServerSlow, onServiceMaintenance } from "../lib/api";
import { useI18n } from "../i18n";

/** Thin top notice while the API is slow to answer, and when the device goes offline. */
export function ServerStatus() {
    const { l } = useI18n();
    const [slow, setSlow] = useState(false);
    const [maintenance, setMaintenance] = useState(false);
    const [accountsOnly, setAccountsOnly] = useState(false);
    const [offline, setOffline] = useState(typeof navigator !== "undefined" && navigator.onLine === false);

    useEffect(() => onServerSlow(setSlow), []);
    useEffect(() => onServiceMaintenance(setMaintenance), []);
    useEffect(() => {
        const controller = new AbortController();
        fetch("/service-status.json", { cache: "no-store", signal: controller.signal })
            .then((response) => response.ok ? response.json() : null)
            .then((status: unknown) => {
                if (!status || typeof status !== "object") return;
                const data = status as { accounts_available?: unknown; exams_available?: unknown };
                if (typeof data.accounts_available !== "boolean" || typeof data.exams_available !== "boolean") return;
                setMaintenance(!data.accounts_available);
                setAccountsOnly(data.accounts_available && !data.exams_available);
            })
            .catch(() => { /* API errors and the offline listener still describe failures. */ });
        return () => controller.abort();
    }, []);
    useEffect(() => {
        const on = () => setOffline(false);
        const off = () => setOffline(true);
        window.addEventListener("online", on);
        window.addEventListener("offline", off);
        return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
    }, []);

    if (!slow && !offline && !maintenance && !accountsOnly) return null;

    return (
        <div role="status" aria-live="polite" className="fixed inset-x-0 top-0 z-[90] flex justify-center px-4 pt-2 print:hidden">
            <div className="flex items-center gap-2.5 rounded-full bg-ink px-4 py-2 text-sm text-paper shadow-pop animate-[oiq-pop-in_180ms_ease-out]">
                {offline ? (
                    <>
                        <WifiOff className="size-4 text-warn" aria-hidden />
                        {l("مفيش إنترنت. هنكمّل أول ما الاتصال يرجع.", "You're offline. We'll continue once you're back online.")}
                    </>
                ) : maintenance ? (
                    <span>{l("الخدمة تحت التجهيز. التسجيل والدخول والامتحانات متوقفة مؤقتًا.", "Service preparation is underway. Registration, sign-in and exams are temporarily paused.")}</span>
                ) : accountsOnly ? (
                    <span>{l("الحسابات متاحة. الامتحانات والدفع لم يُفتحا بعد.", "Accounts are available. Exams and payments have not opened yet.")}</span>
                ) : (
                    <>
                        <span className="size-3.5 animate-spin rounded-full border-2 border-paper/40 border-t-paper" aria-hidden />
                        {l("الرد متأخر شوية. خليك في الصفحة لحد ما الطلب يكتمل.", "The response is taking longer. Keep this page open until the request finishes.")}
                    </>
                )}
            </div>
        </div>
    );
}
