import { ArrowLeft } from "lucide-react";
import { useI18n } from "../../i18n";
import { Eyebrow, H2 } from "./ui";

/** 6. We join your platform: the four kinds of place, as ruled rows beside the offer. */
export function HomePlatform() {
    const { l } = useI18n();
    const places = [
        { title: l("الجامعات", "Universities"), body: l("الامتحان الشفوي جوّه بوابة الجامعة، لكل الكليات والأقسام.", "The oral exam inside the university portal, for every faculty and department.") },
        { title: l("المدارس", "Schools"), body: l("تقييم شفوي سهل على الطلبة، والمدرس بيتابع الدرجات من مكانه.", "Easy oral assessment for pupils, with teachers following grades from their desk.") },
        { title: l("السناتر ومراكز التدريب", "Centres and training providers"), body: l("اختبارات شفوية للمجموعات الكبيرة من غير ما تسمع كل تسجيل بنفسك.", "Oral tests for large groups without listening to every recording yourself.") },
        { title: l("المنصات التعليمية", "Learning platforms"), body: l("ميزة امتحان شفوي جاهزة جوّه منصتك، بشكلها وتحت اسمك.", "A ready oral-exam feature inside your platform, in its look and under your name.") },
    ];
    return (
        <section id="integrate" className="scroll-mt-20 bg-home-bg text-home-ink">
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:py-32">
                <div>
                    <Eyebrow>{l("لمنصتك", "For your platform")}</Eyebrow>
                    <h2 className={`${H2} mt-6`}>{l("بننضم لمنصتك، وتفضل باسمك.", "We join your platform, under your name.")}</h2>
                    <p className="mt-6 max-w-xl text-lg leading-[1.85] text-home-muted">
                        {l("مش لازم طلابك يتعلموا موقع جديد. بنضيف الامتحان الشفوي كميزة جوّه منصتك، بشكلها وتحت اسمك، والطالب يمتحن من غير ما يخرج منها.",
                            "Your students don't need to learn a new site. We add the oral exam as a feature inside your platform, in its look and under your name, and students take it without leaving.")}
                    </p>
                    <a href="#contact" className="mt-8 inline-flex min-h-11 items-center gap-2 font-semibold hover:underline">
                        {l("كلّمنا ونشوف إزاي نضيفه لمنصتك", "Talk to us about adding it to your platform")}<ArrowLeft className="size-4 ltr:rotate-180" aria-hidden />
                    </a>
                </div>
                <ul className="border-t border-home-line">
                    {places.map((p) => (
                        <li key={p.title} className="grid gap-2 border-b border-home-line py-6 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:gap-8">
                            <h3 className="font-display text-xl font-normal">{p.title}</h3>
                            <p className="leading-relaxed text-home-muted">{p.body}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
