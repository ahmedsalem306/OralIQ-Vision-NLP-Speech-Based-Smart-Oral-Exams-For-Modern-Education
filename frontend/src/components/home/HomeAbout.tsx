import { Link } from "react-router-dom";
import { ArrowLeft, Building2, GraduationCap, Play, UserRoundCheck } from "lucide-react";
import { useI18n } from "../../i18n";
import { BTN, BTN_GHOST, Eyebrow, H2 } from "./ui";

/** 2. Who we are, then what we offer: the about text beside a photo, and three cards. */
export function HomeAbout({ startHref }: { startHref: string }) {
    const { l } = useI18n();
    const tags = [l("بالصوت", "By voice"), l("بالذكاء الاصطناعي", "With AI"), l("عربي وإنجليزي", "Arabic and English")];
    const offer = [
        { icon: UserRoundCheck, href: "#marking", more: l("الدرجة بتتحسب إزاي", "How grading works"), title: l("للمحاضر", "For lecturers"),
            body: l("وفّر ساعات اللجنة. الدفعة كلها تمتحن في نفس الوقت، وكل إجابة توصلك مكتوبة ومصححة ومعاها السبب.", "Save the hours a panel takes. The whole class sits the exam at once, and every answer reaches you written out, graded and explained.") },
        { icon: GraduationCap, href: "#how", more: l("الخطوات", "The steps"), title: l("للطالب", "For students"),
            body: l("يمتحن من بيته وبصوته، من غير ما يستنى دوره قدام باب اللجنة. يشوف نفسه في الكاميرا الأول، والسؤال بعدين.", "They sit the exam from home, in their own voice, without queuing outside the exam room. Camera first, question second.") },
        { icon: Building2, href: "#integrate", more: l("لمنصتك", "For your platform"), title: l("لمنصتك", "For your platform"),
            body: l("بنضيف الامتحان الشفوي كميزة جوّه منصتك، بشكلها وتحت اسمك، والطالب ما يخرجش منها.", "We add the oral exam as a feature inside your platform, in its look and under your name, so students never leave it.") },
    ];

    return (
        <section id="about" className="scroll-mt-20 bg-home-bg text-home-ink">
            <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 pb-20 pt-24 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:pb-28 lg:pt-32">
                <figure className="overflow-hidden rounded-2xl">
                    <img src="/photos/about-student-960.webp" srcSet="/photos/about-student-480.webp 480w, /photos/about-student-720.webp 720w, /photos/about-student-960.webp 960w, /photos/about-student-1280.webp 1280w"
                        sizes="(min-width: 1024px) 40vw, 90vw" width={1280} height={1196} loading="lazy" decoding="async"
                        alt={l("طالب بيجاوب امتحانه من على اللابتوب في الفصل", "A student answering his exam on a laptop in class")}
                        className="block h-auto w-full" />
                </figure>
                <div>
                    <Eyebrow>{l("من نحن", "Who we are")}</Eyebrow>
                    <h2 className={`${H2} mt-6`}>{l("إحنا بنسهّل الامتحان الشفوي على المحاضر والطالب.", "We make oral exams easier for lecturers and students.")}</h2>
                    <p className="mt-6 max-w-xl text-lg leading-[1.85] text-home-muted">
                        {l("اللجنة الشفوية بتاخد ساعات طويلة من وقت المحاضر، والطالب بيدخلها متوتر بعد ما يستنى دوره. مع OralIQ الطالب بيجاوب بصوته من موبايله أو اللابتوب، والمنصة بتكتب إجابته، وتقارن معناها بإجابتك النموذجية، وتتأكد إنه هو اللي بيجاوب. وانت بتراجع وتنشر.",
                            "An oral exam panel takes hours of a lecturer's time, and students walk in nervous after waiting their turn. With OralIQ, students answer out loud from a phone or laptop; the platform writes the answer down, compares its meaning with your model answer and checks it's really them. You review and publish.")}
                    </p>
                    <ul className="mt-7 flex flex-wrap gap-2">
                        {tags.map((t) => <li key={t} className="rounded-full border border-home-line px-4 py-1.5 text-sm text-home-muted">{t}</li>)}
                    </ul>
                    <div className="mt-9 flex flex-wrap items-center gap-2">
                        <Link to={startHref} viewTransition className={BTN}>{l("ابدأ الآن", "Get started")}</Link>
                        <a href="#video" className={BTN_GHOST}><Play className="size-4 fill-current" aria-hidden />{l("شوف الفيديو", "Watch the video")}</a>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:pb-32">
                <h2 className={H2}>{l("بنقدم إيه", "What we offer")}</h2>
                <ul className="mt-12 grid gap-4 md:grid-cols-3">
                    {offer.map((o) => (
                        <li key={o.title} className="flex flex-col items-center rounded-2xl bg-home-card px-7 py-10 text-center">
                            <span className="flex size-14 items-center justify-center rounded-full border border-home-line"><o.icon className="size-6" aria-hidden /></span>
                            <h3 className="mt-6 font-display text-xl font-normal">{o.title}</h3>
                            <p className="mt-3 leading-relaxed text-home-muted">{o.body}</p>
                            <a href={o.href} className="mt-auto inline-flex min-h-11 items-center gap-2 pt-6 text-sm font-semibold hover:underline">
                                {o.more}<ArrowLeft className="size-4 ltr:rotate-180" aria-hidden />
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
