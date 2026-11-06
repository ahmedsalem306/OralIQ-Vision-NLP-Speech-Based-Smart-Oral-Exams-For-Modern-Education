import { Link } from "react-router-dom";
import { COMPANY } from "../content/company";
import { useI18n } from "../i18n";
import { usePageTitle } from "../lib/usePageTitle";

export default function RefundPolicy() {
    const { l, lang } = useI18n();
    usePageTitle(l("سياسة الاسترجاع والإلغاء", "Refund and cancellation policy"));
    const sections = [
        ["الاشتراك غير المستخدم", "Unused subscriptions",
            "يمكن طلب استرجاع كامل خلال ٧ أيام من الدفع إذا لم يُستخدم الاشتراك في إجراء امتحانات أو تصحيح إجابات أو استهلاك أي رصيد مدفوع. يسري ذلك على الاشتراكات والأرصدة الإضافية غير المستخدمة.",
            "You may request a full refund within 7 days of payment if the subscription has not been used to conduct exams, grade answers or consume paid credits. This also applies to unused add-on credits."],
        ["الخصم المكرر وعدم التفعيل", "Duplicate charges and activation failures",
            "إذا خُصم المبلغ أكثر من مرة لنفس عملية الشراء، نرد المبلغ الزائد بعد التحقق. إذا تم الدفع ولم يُفعّل الاشتراك، تواصل معنا لتفعيله؛ وإذا تعذّر التفعيل نرد المبلغ المدفوع.",
            "Verified duplicate charges for the same purchase are refunded. If payment succeeds but activation fails, contact us to activate your subscription; if activation cannot be completed, we refund the payment."],
        ["الأعطال واستخدام جزء من الخدمة", "Service faults and partial use",
            "إذا منعك عطل من جانب OralIQ من الاستفادة من الخدمة المدفوعة، نراجع الحالة ونرد المبلغ المستحق عن الجزء المتضرر أو نقدم تعويضًا توافق عليه. بعد استخدام الاشتراك، تُراجع طلبات استرجاع الجزء المتبقي حسب الاستخدام وظروف الطلب؛ ولا يُرد ثمن الجزء المستخدم لمجرد تغيير الرأي، مع بقاء حقوقك القانونية كاملة.",
            "If an OralIQ fault prevents use of a paid service, we review the case and refund the affected portion or offer compensation you agree to. After use, requests concerning the remaining portion are reviewed based on usage and circumstances. A change of mind alone does not entitle you to a refund for services already used; your statutory rights remain unaffected."],
        ["طريقة تقديم الطلب", "How to request a refund",
            "أرسل طلبك إلى بريد الدعم الموضح أدناه، مع البريد المسجل بالحساب ورقم عملية الدفع وتاريخها وسبب الطلب. لا ترسل كلمة المرور أو بيانات البطاقة الكاملة أو رمز التحقق البنكي. نرد على الطلب خلال ٣ أيام عمل، ونوضح أي معلومات إضافية مطلوبة والنتيجة أو موعد استكمال المراجعة.",
            "Email the support address below with your account email, payment reference, payment date and reason. Do not send passwords, full card details or banking verification codes. We respond within 3 business days, explaining any additional information required and the outcome or expected review timeline."],
        ["رد الأموال وإلغاء التجديد", "Refund processing and cancellation",
            "عند قبول الاسترجاع، نبدأ رد المبلغ عبر بوابة الدفع إلى وسيلة الدفع الأصلية متى كان ذلك متاحًا. يختلف وقت ظهوره حسب البنك ووسيلة الدفع؛ ونبلغك بتفاصيل العملية والمدة المتوقعة بعد التأكيد مع مقدم الدفع. لإلغاء أي تجديد تلقائي مفعّل، تواصل مع الدعم قبل موعد التجديد. إلغاء التجديد وحده لا يُعد طلب استرجاع، ويظل الوصول متاحًا حتى نهاية الفترة المدفوعة ما لم يتم رد قيمتها.",
            "Once approved, we initiate the refund through the payment gateway to the original payment method where supported. Posting time depends on the bank and payment method; we provide the transaction details and expected timing after confirmation with the payment provider. To cancel any enabled automatic renewal, contact support before renewal. Cancellation alone is not a refund request; access continues until the paid period ends unless that period is refunded."],
        ["حقوق العميل", "Customer rights",
            "لا تنتقص هذه السياسة من أي حقوق مقررة للعميل بموجب القوانين المعمول بها. تسري السياسة المعروضة وقت الشراء على تلك العملية، وأي تحديث لاحق لا يسلب حقوقًا نشأت قبل التحديث.",
            "This policy does not limit customer rights under applicable law. The policy displayed at purchase applies to that transaction; subsequent updates do not remove rights arising before the update."],
    ];
    return <main dir={lang === "ar" ? "rtl" : "ltr"} className="min-h-dvh bg-paper px-5 py-10 text-ink sm:py-16">
        <article className="mx-auto max-w-3xl">
            <Link to="/" className="font-bold text-pen underline underline-offset-4">{l("العودة إلى OralIQ", "Back to OralIQ")}</Link>
            <p className="mt-10 text-sm font-bold text-ink-2">OralIQ · GharTech</p>
            <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">{l("سياسة الاسترجاع والإلغاء", "Refund and cancellation policy")}</h1>
            <p className="mt-4 text-sm text-ink-2">{l("تاريخ السريان: ٦ نوفمبر ٢٠٢٦", "Effective date: November 6, 2026")}</p>
            <p className="mt-6 leading-loose">{l("توضح هذه السياسة شروط استرجاع المدفوعات وإلغاء اشتراكات OralIQ، منصة GharTech للامتحانات الشفوية والتصحيح الإلكتروني.", "This policy explains refunds and cancellation for OralIQ, GharTech's platform for oral exams and automated grading.")}</p>
            <div className="mt-8 divide-y divide-rule">
                {sections.map(([arTitle, enTitle, arBody, enBody]) => <section key={enTitle} className="py-6">
                    <h2 className="text-xl font-bold">{l(arTitle, enTitle)}</h2>
                    <p className="mt-3 leading-loose text-ink-2">{l(arBody, enBody)}</p>
                </section>)}
            </div>
            <address className="mt-6 rounded-2xl border border-rule bg-sheet p-6 not-italic">
                <p className="font-bold">{l("طلبات الاسترجاع والإلغاء والدعم", "Refunds, cancellation and support")}</p>
                <a dir="ltr" className="mt-3 inline-block text-pen underline underline-offset-4" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
            </address>
        </article>
    </main>;
}
