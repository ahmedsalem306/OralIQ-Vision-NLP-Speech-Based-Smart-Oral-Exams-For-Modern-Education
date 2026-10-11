import { Check, Mic } from "lucide-react";
import { useI18n } from "../../i18n";
import { cn } from "../../lib/utils";
import { buttonClasses } from "../ui/button";
import { LogoMark } from "../Logo";

/**
 * Two ways to work with OralIQ: use the platform as-is, or have the oral exam
 * built into the client's own website. Copy stays at the level of the offer;
 * the technical route is agreed per client, so none is promised here.
 */
export function IntegrationSection() {
    const { l } = useI18n();

    const ways = [
        {
            title: l("على منصة OralIQ", "On the OralIQ platform"),
            body: l("تعمل حساب وتبدأ النهارده: تكتب السؤال، تبعت الرابط، والنتايج توصلك هنا.", "Create an account and start today: write the question, send the link, results arrive here."),
            points: [l("جاهز من غير أي تجهيز", "Ready with no setup"), l("مناسب للمدرس أو القسم", "Suits a teacher or a department")],
        },
        {
            title: l("جوّه موقعك أنت", "Inside your own website"),
            body: l("عندك موقع أو منصة تعليمية؟ بنضيف الامتحان الشفوي جوّاها، فالطالب يمتحن من غير ما يخرج من موقعك.", "Have a website or learning platform? We add the oral exam to it, so students never leave your site."),
            points: [l("بشكل وألوان موقعك", "In your site's look and colours"), l("بنتفق سوا على طريقة الربط ونجهّزها معاك", "We agree the setup with you and build it together"), l("للجامعات والمدارس ومراكز التدريب والمدرسين", "For universities, schools, centres and teachers")],
            featured: true,
        },
    ];

    return (
        <section id="integrate" className="scroll-mt-20 border-y border-rule/70 bg-sheet">
            <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.05fr]">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-tight">
                        {l("مش لازم تنقل لمنصة جديدة. OralIQ ممكن ييجي لحد موقعك.", "No need to move to a new platform. OralIQ can come to your site.")}
                    </h2>
                    <div className="mt-10 space-y-4">
                        {ways.map((w) => (
                            <div key={w.title} className={cn("rounded-[22px] p-6", w.featured ? "border-2 border-pen/40 bg-paper" : "border border-rule bg-paper/60")}>
                                <h3 className={cn("font-display text-lg font-semibold", w.featured && "text-pen")}>{w.title}</h3>
                                <p className="mt-1.5 leading-relaxed text-ink-2">{w.body}</p>
                                <ul className="mt-3 space-y-1.5 text-sm text-ink-2">
                                    {w.points.map((pt) => (
                                        <li key={pt} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-pass" aria-hidden />{pt}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <a href="#contact" className={buttonClasses("primary", "lg", "mt-8")}>{l("كلّمنا عن إضافته لموقعك", "Talk to us about your site")}</a>
                </div>

                {/* Illustration: someone else's site, with the OralIQ exam living inside it */}
                <figure aria-label={l("مثال: امتحان OralIQ جوّه موقع جامعة", "Example: an OralIQ exam inside a university website")}>
                    <div className="overflow-hidden rounded-[22px] border border-rule bg-paper shadow-float">
                        {/* The client's own header */}
                        <div className="flex items-center gap-3 border-b border-rule bg-navy px-5 py-3.5 text-white">
                            <span className="flex size-8 items-center justify-center rounded-lg bg-white/15 font-display text-sm font-bold" aria-hidden>{l("ج", "U")}</span>
                            <span className="font-display font-semibold">{l("موقع جامعتك", "Your university")}</span>
                            <span className="ms-auto hidden gap-4 text-sm text-white/60 sm:flex" aria-hidden>
                                <span>{l("المقررات", "Courses")}</span><span>{l("الامتحانات", "Exams")}</span><span>{l("حسابي", "My account")}</span>
                            </span>
                        </div>
                        <div className="p-5 sm:p-7">
                            <p className="text-sm text-ink-3">{l("الامتحانات › مبادئ الذكاء الاصطناعي", "Exams › Intro to AI")}</p>
                            {/* The OralIQ part */}
                            <div className="mt-4 rounded-2xl border-2 border-dashed border-pen/35 bg-sheet p-5">
                                <div className="flex items-center justify-between gap-3 text-sm">
                                    <span className="text-ink-2">{l("سؤال 1 من 3", "Question 1 of 3")}</span>
                                    <span className="font-display font-semibold tabular text-ink" dir="ltr">01:48</span>
                                </div>
                                <p className="mt-3 font-display text-lg font-semibold leading-snug">{l("عرّف الذكاء الاصطناعي واذكر مثالين على استخدامه", "Define AI and give two examples of its use")}</p>
                                <div className="mt-5 flex items-center gap-3 rounded-xl bg-sheet-2 px-4 py-3">
                                    <Mic className="size-5 text-pen" aria-hidden />
                                    <span className="flex h-6 flex-1 items-center gap-[3px]" aria-hidden>
                                        {Array.from({ length: 30 }).map((_, i) => (
                                            <span key={i} className="w-[3px] rounded-full bg-pen/70" style={{ height: `${25 + Math.abs(Math.sin(i * 0.7) * 55 + Math.sin(i * 0.23) * 20)}%` }} />
                                        ))}
                                    </span>
                                </div>
                                <p className="mt-4 flex items-center justify-end gap-1.5 text-xs text-ink-3" dir="ltr">
                                    <LogoMark size={16} /> <span>powered by OralIQ</span>
                                </p>
                            </div>
                        </div>
                    </div>
                    <figcaption className="mt-4 text-center text-sm text-ink-3">{l("مثال توضيحي: الامتحان بيظهر جوّه صفحة من موقعك.", "Illustration: the exam appears inside a page on your site.")}</figcaption>
                </figure>
            </div>
        </section>
    );
}
