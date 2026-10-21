import { useI18n } from "../../i18n";
import { H2 } from "./ui";

/** 4. The four steps, as a stack of cards beside the title (where the reference had its quotes). */
export function HomeSteps() {
    const { l } = useI18n();
    const steps = [
        { title: l("اكتب السؤال والإجابة النموذجية", "Write the question and model answer"), body: l("بالكتابة أو بصوتك، وحدد الوقت والصعوبة.", "Type it or say it, then set the time and difficulty.") },
        { title: l("ابعت الرابط لطلابك", "Send the link to your students"), body: l("رابط واحد على جروب المادة، أو لطلاب بعينهم.", "One link to the class group, or to chosen students.") },
        { title: l("الطلاب يجاوبوا بصوتهم", "Students answer out loud"), body: l("من الموبايل أو اللابتوب، والكاميرا بتتأكد إن كل واحد هو نفسه.", "From a phone or laptop, while the camera checks each one is who they say.") },
        { title: l("راجع وانشر", "Review and publish"), body: l("الدرجات بتوصلك جاهزة ومعاها التفاصيل، وتنشرها بضغطة.", "Grades arrive ready with the details; publish them in one click.") },
    ];
    return (
        <section id="how" className="scroll-mt-20 border-t border-home-line bg-home-bg text-home-ink">
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:py-32">
                <div className="lg:sticky lg:top-28 lg:self-start">
                    <h2 className={H2}>{l("أربع خطوات، وامتحانك الشفوي جاهز.", "Four steps, and your oral exam is ready.")}</h2>
                    <p className="mt-6 max-w-md text-lg leading-[1.8] text-home-muted">{l("من غير تنزيل أي برنامج. الطالب يفتح الرابط من موبايله أو اللابتوب ويبدأ.", "Nothing to install. Students open the link on a phone or laptop and start.")}</p>
                    <span className="mt-10 block h-px w-full max-w-md bg-home-line" aria-hidden />
                </div>
                <ol className="grid gap-3">
                    {steps.map((s, i) => (
                        <li key={s.title} className="flex items-center gap-6 rounded-2xl bg-home-card p-6 sm:p-7">
                            <div className="min-w-0 flex-1">
                                <h3 className="font-display text-lg font-normal">{s.title}</h3>
                                <p className="mt-1.5 leading-relaxed text-home-muted">{s.body}</p>
                            </div>
                            <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-home-line font-display text-xl font-light tabular" aria-hidden>{i + 1}</span>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}
