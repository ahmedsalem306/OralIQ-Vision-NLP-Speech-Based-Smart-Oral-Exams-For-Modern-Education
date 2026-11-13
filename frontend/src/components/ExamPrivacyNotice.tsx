import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useI18n } from "../i18n";

export function ExamPrivacyNotice() {
    const { l } = useI18n();
    return <aside className="rounded-2xl border border-rule bg-sheet-2 p-4 text-start text-sm leading-relaxed text-ink-2" aria-label={l("خصوصية الكاميرا والصوت", "Camera and audio privacy")}>
        <p className="flex items-center gap-2 font-semibold text-ink"><ShieldCheck className="size-4 shrink-0" aria-hidden />{l("خصوصيتك مهمة", "Your privacy matters")}</p>
        <p className="mt-2">{l(
            "حفاظًا على خصوصية جميع الطلاب والطالبات، لا نسجّل أو نحفظ فيديو للامتحان. الكاميرا تعمل للتحقق أثناء الامتحان، وتُرسل لقطات ثابتة للتحقق من الهوية دون حفظها كسجل صور. إجابتك الصوتية تُسجّل وتُرسل للتصحيح، ثم تُحذف من طابور المعالجة بعد نجاحه؛ وقد تُحتفظ مؤقتًا عند فشل التصحيح لإعادة المحاولة.",
            "To protect every student's privacy, exam video is not recorded or stored. The camera is used for checks during the exam; still frames are sent for identity verification without a retained photo gallery. Your audio answer is recorded and sent for grading, then removed from the processing queue after success; failed grading may retain it temporarily for retry.",
        )}</p>
        <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-semibold text-pen underline underline-offset-4">{l("تفاصيل الخصوصية والاحتفاظ بالبيانات", "Privacy and data retention details")}</Link>
    </aside>;
}
