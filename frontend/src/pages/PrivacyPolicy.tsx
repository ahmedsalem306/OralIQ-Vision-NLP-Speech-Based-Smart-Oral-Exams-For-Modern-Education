import { Link } from "react-router-dom";
import { COMPANY } from "../content/company";
import { useI18n } from "../i18n";
import { usePageTitle } from "../lib/usePageTitle";

export default function PrivacyPolicy() {
    const { l, lang } = useI18n();
    usePageTitle(l("خصوصية الامتحان والبيانات", "Exam and data privacy"));
    const sections = [
        ["الكاميرا: تحقق مباشر دون تسجيل فيديو", "Camera: live checks without video recording",
            "حفاظًا على خصوصية الطلاب والطالبات، لا ينشئ مسار الامتحان تسجيل فيديو ولا يحفظ فيديو للكاميرا. تعمل معاينة الكاميرا والتحليلات المحلية أثناء الامتحان. تُرسل لقطات ثابتة إلى خادم التحقق من الوجه؛ تُعالج للتحقق ثم تُستبعد، ولا نحتفظ بها كسجل صور للامتحان. تشغيل الكاميرا لا يعني وجود بث فيديو يشاهده المحاضر مباشرة.",
            "To protect every student's privacy, the exam flow does not create or store camera video recordings. Camera preview and local analysis run during the exam. Still frames are sent to the face-verification server, processed and discarded rather than retained as an exam photo gallery. Camera use does not mean your lecturer watches a live video broadcast."],
        ["الصوت والتصحيح", "Audio and grading",
            "تُسجّل الإجابة الصوتية وتُرسل للخادم لتفريغها وتصحيحها ومقارنتها ببصمة الصوت. يبقى الصوت في طابور التصحيح إلى أن تنجح المعالجة، ثم يُحذف منه. عند فشل المعالجة قد يبقى مؤقتًا لإعادة المحاولة؛ إعداد النشر الافتراضي يحذف صوت المهام الفاشلة بعد ٧٢ ساعة من فشلها النهائي. لا توجد مدة ثابتة للتصحيح قبل قياس السيرفر.",
            "Oral answers are recorded and sent to the server for transcription, grading and voice comparison. Audio remains in the grading queue until processing succeeds, then is removed from it. Failed processing may retain audio for retry; the default deployment removes failed-job audio 72 hours after final failure. Grading turnaround is not fixed before server measurement."],
        ["البصمات والنتائج", "Biometric templates and results",
            "بصمة الوجه والصوت تُحفظ كقوالب رقمية حساسة، وليست صورًا أو فيديو. القالب الرقمي ليس بيانات مجهولة الهوية. تُحفظ أيضًا بيانات الحساب ونص الإجابة بعد التفريغ والدرجات ونتائج فحوص التحقق. يطّلع المحاضر المخوّل على نتائج طلاب امتحاناته وفق الصلاحيات؛ لا تتيح واجهة النتائج تنزيل قوالب البصمات.",
            "Face and voice templates are sensitive numerical records, not photographs or video; they are not anonymous data. Account information, transcribed answers, grades and verification outcomes are also stored. Authorized lecturers can view results for their own exams within their permissions; the results interface does not expose biometric templates."],
        ["تغطية الوجه والتيسيرات", "Face coverings and accommodations",
            "يمكن اختيار وضع النقاب قبل تسجيل البصمة؛ يُسجّل الصوت دون طلب كشف الوجه، وتُرسل حالة التيسير لمحاضر الامتحان لاعتماد الهوية لكل امتحان. أثناء الإجابة قد تُعالج لقطة من الجزء العلوي للكاميرا لرصد ظهور منطقة العين فقط؛ هذه ليست بصمة قزحية ولا تحدد اتجاه النظر أو تثبت الهوية. عند تعذر القراءة تظهر الحالة غير متاحة وتحتاج مراجعة، ولا تُحسب وحدها مخالفة أو درجة غش. لا ترسلي صور هوية أو وجه إلى بريد الدعم.",
            "Covered-face mode can be selected before enrollment. It registers voice without requiring uncovering and shares an accommodation request with the exam lecturer for approval per exam. During answers, an upper-camera still frame may be processed for eye-region visibility only. This is not iris recognition, gaze direction or proof of identity. Unavailable readings require review and are not alone treated as cheating or a grading penalty. Do not email identity documents or face photos."],
        ["النسخ الاحتياطية والاحتفاظ", "Backups and retention",
            "حذف الصوت من قاعدة البيانات النشطة لا يمسح فورًا نسخة احتياطية سابقة، وقد تتضمن النسخة بيانات الطابور وقت إنشائها حتى انتهاء دورة الاحتفاظ. إعداد النسخ المحلية الافتراضي يحتفظ بـ١٤ يومًا، ومدة النسخ الخارجية حسب إعداد النشر. تبقى الحسابات والبصمات والنتائج لأغراض الخدمة إلى أن يُنفذ طلب حذف مناسب أو تنتهي مدة احتفاظ تقررها المؤسسة، مع مراعاة الالتزامات المتعلقة بالامتحانات والمدفوعات.",
            "Removing audio from the active database does not immediately erase an earlier backup, which may include queue data present at creation until rotation. Local backups default to 14 days; off-site retention depends on deployment settings. Accounts, templates and results remain for service use until an applicable deletion request is fulfilled or the institution's retention period ends, subject to exam and payment record obligations."],
        ["الخدمات الخارجية", "External services",
            "الوصول محكوم بصلاحيات الحسابات، ويجب تشغيل الخدمة عبر HTTPS. تُستخدم خدمات الاستضافة والبريد والدفع بحسب إعداد المؤسسة. عند تفعيل تتبع الأعطال تُرسل بيانات تقنية محدودة لمزوّد المراقبة، مع استبعاد محتوى الطلبات والوسائط وقوالب البصمات. موقع تخزين البيانات ومقدمو الخدمة يتحددان وفق إعدادات النشر الفعلية.",
            "Account permissions control access and the service must use HTTPS. Hosting, email and payment providers depend on deployment settings. When error monitoring is enabled, limited technical diagnostics are sent to its provider, excluding request bodies, media and biometric templates. Data location and providers depend on the actual deployment."],
        ["تفريغ الصوت بواسطة Groq", "Transcription by Groq",
            "نستخدم Groq لتحويل إجابات الامتحان الصوتية إلى نص. يُرسل صوت الإجابة باسم ملف لا يتضمن هوية الطالب، دون إرفاق اسمه أو بيانات حسابه أو الإجابة المرجعية أو قوالب البصمات أو لقطات الكاميرا؛ وقد يتضمن الصوت نفسه ما يقوله الطالب من معلومات. يبقى التصحيح بالمعنى ومقارنة بصمة الصوت على خادم OralIQ. بحسب سياسة Groq، لا يُحتفظ بمحتوى طلبات التفريغ افتراضيًا، مع استثناءات موضحة للأعطال ومراقبة إساءة الاستخدام قد تستمر حتى ٣٠ يومًا أو أطول عند وجود التزام قانوني. تُحفظ بيانات الاستخدام التقنية، وقد تتم معالجة البيانات خارج بلدك؛ تُخزن البيانات التي يحتفظ بها Groq في الولايات المتحدة. لا ندّعي تفعيل خيار عدم الاحتفاظ لدى Groq قبل التحقق من إعداد الحساب.",
            "We use Groq to transcribe spoken exam answers. Answer audio is sent under an anonymous filename without attaching the student's name, account details, reference answer, biometric templates or camera frames; the audio itself may contain information the student speaks. Semantic grading and voice comparison remain on the OralIQ server. Groq states that inference content is not retained by default, with documented reliability and abuse-monitoring exceptions lasting up to 30 days or longer where legally required. Technical usage metadata is retained. Processing may occur outside your country; data retained by Groq is stored in the United States. We do not claim Zero Data Retention is enabled until the account setting is verified."],
        ["الاستفسارات وطلبات الحذف", "Questions and deletion requests",
            "للاستفسار أو طلب مراجعة بياناتك أو حذفها، راسلنا من بريد الحساب مع توضيح الطلب واسم المؤسسة إن وُجد. لا ترسل كلمة المرور أو تسجيلات أو صورًا حساسة. قد نحتاج للتحقق من ملكية الحساب والتنسيق مع المؤسسة. سنوضح ما يمكن حذفه وما يلزم الاحتفاظ به ومدة معالجة الطلب.",
            "For questions or a request to review or delete your data, email us from your account address with the request and institution name where relevant. Do not send passwords, recordings or sensitive images. Account ownership checks and institution coordination may be needed. We will explain what can be deleted, what must be retained and the expected handling time."],
    ];
    return <main dir={lang === "ar" ? "rtl" : "ltr"} className="min-h-dvh bg-paper px-5 py-10 text-ink sm:py-16">
        <article className="mx-auto max-w-3xl">
            <Link to="/" className="font-bold text-pen underline underline-offset-4">{l("العودة إلى OralIQ", "Back to OralIQ")}</Link>
            <p className="mt-10 text-sm font-bold text-ink-2">OralIQ · GharTech</p>
            <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">{l("خصوصية الامتحان والبيانات", "Exam and data privacy")}</h1>
            <p className="mt-4 text-sm text-ink-2">{l("آخر تحديث: ١٦ نوفمبر ٢٠٢٦", "Last updated: November 16, 2026")}</p>
            <div className="mt-8 divide-y divide-rule">{sections.map(([arTitle, enTitle, arBody, enBody]) => <section key={enTitle} className="py-6">
                <h2 className="text-xl font-bold">{l(arTitle, enTitle)}</h2>
                <p className="mt-3 leading-loose text-ink-2">{l(arBody, enBody)}</p>
            </section>)}</div>
            <p className="mt-6 text-sm"><a href="https://console.groq.com/docs/your-data" target="_blank" rel="noopener noreferrer" className="text-pen underline underline-offset-4">{l("تفاصيل معالجة البيانات لدى Groq", "Groq data processing details")}</a></p>
            <address className="mt-6 rounded-2xl border border-rule bg-sheet p-6 not-italic">
                <p className="font-bold">{l("التواصل بشأن الخصوصية", "Privacy contact")}</p>
                <a href={`mailto:${COMPANY.email}`} className="mt-2 block text-pen underline underline-offset-4" dir="ltr">{COMPANY.email}</a>
            </address>
        </article>
    </main>;
}
