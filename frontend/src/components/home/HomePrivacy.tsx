import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useI18n } from "../../i18n";
import { Eyebrow, Section } from "./ui";

export function HomePrivacy() {
    const { l } = useI18n();
    return <Section id="privacy" tone="a" className="px-5 py-12 sm:px-10 sm:py-16">
        <div className="mx-auto max-w-4xl rounded-3xl border border-[#6F4E37]/20 bg-[#F3EDE5] p-6 sm:p-10">
            <Eyebrow>{l("احترام الخصوصية", "Respecting your privacy")}</Eyebrow>
            <h2 className="ar-heading mt-3 flex items-start gap-3 font-display text-2xl font-bold text-[#241A14] sm:text-3xl"><ShieldCheck className="mt-1 size-7 shrink-0" aria-hidden />{l("كاميرا للتحقق، من غير تسجيل فيديو", "Camera checks, without video recording")}</h2>
            <p className="ar-body mt-4 leading-loose text-[#493A30]">{l(
                "حفاظًا على خصوصية الطلاب والطالبات، لا نسجّل أو نحفظ فيديو للامتحان. تُعالج لقطات ثابتة للتحقق من الوجه، وإجابتك الصوتية تُسجّل للتصحيح فقط وفق تفاصيل الاحتفاظ بالبيانات. لو محتاجة تيسيرًا يحافظ على تغطية الوجه، تواصلي مع المحاضر قبل الامتحان لترتيب التحقق المناسب.",
                "To protect every student's privacy, exam video is not recorded or stored. Still frames are processed for face checks, while audio answers are recorded for grading under the stated retention policy. If you need an accommodation that keeps your face covered, contact your lecturer before the exam to arrange appropriate verification.",
            )}</p>
            <Link to="/privacy-policy" className="mt-4 inline-block font-bold text-[#6F4E37] underline underline-offset-4">{l("اعرف إيه اللي بيتحفظ وإمتى بيتحذف", "See what is stored and when it is deleted")}</Link>
        </div>
    </Section>;
}
