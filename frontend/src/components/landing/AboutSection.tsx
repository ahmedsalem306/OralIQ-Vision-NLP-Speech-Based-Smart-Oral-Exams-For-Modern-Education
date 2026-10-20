import { useRef } from "react";
import { useI18n } from "../../i18n";
import { cn } from "../../lib/utils";
import { gsap, useGSAP, withMotion } from "../../lib/gsap";

/**
 * 2. Who we are, then what we offer.
 * A full-bleed photo under a dark veil (the photo settles as it scrolls in), followed by
 * three service cards on white; the first is black, with the real product sheet tilted over it.
 */
export function AboutSection() {
    const { l } = useI18n();
    const root = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        withMotion(() => {
            gsap.fromTo("[data-about-bg]", { scale: 1.18 }, {
                scale: 1, ease: "none",
                scrollTrigger: { trigger: "[data-about]", start: "top bottom", end: "bottom top", scrub: true },
            });
            gsap.from("[data-about-text] > *", {
                y: 36, opacity: 0, duration: 0.9, stagger: 0.12, ease: "power3.out",
                scrollTrigger: { trigger: "[data-about-text]", start: "top 80%" },
            });
            gsap.from("[data-offer-card]", {
                y: 60, opacity: 0, duration: 0.9, stagger: 0.14, ease: "power3.out",
                scrollTrigger: { trigger: "[data-offer-grid]", start: "top 78%" },
            });
            gsap.from("[data-offer-shot]", {
                y: 40, opacity: 0, duration: 1.1, ease: "power3.out",
                scrollTrigger: { trigger: "[data-offer-grid]", start: "top 70%" },
            });
        });
    }, { scope: root });

    const cards = [
        {
            title: l("للمحاضر", "For lecturers"),
            body: l("امتحان شفوي لكل طلابك في نفس الوقت. كل إجابة بتوصلك مصححة بالمعنى، ومعاها نص كلام الطالب وملاحظات النزاهة، وتنشر الدرجة بضغطة.",
                "An oral exam for all your students at once. Each answer arrives graded by meaning, with the transcript and integrity notes, and you publish the grade in one click."),
            dark: true,
        },
        {
            title: l("للطالب", "For students"),
            body: l("يمتحن من بيته على الموبايل أو اللابتوب، من غير رهبة اللجنة، ويشوف درجته وتفاصيلها أول ما المحاضر ينشرها.",
                "Take the exam from home on a phone or laptop, without the panel nerves, and see the grade and its breakdown as soon as it's published."),
        },
        {
            title: l("نزاهة وهوية", "Integrity and identity"),
            body: l("الوش والصوت بيتقارنوا في كل امتحان، والكاميرا بترصد الموبايل والكتاب والنظر بعيد لفترة طويلة. النظرة العادية مش بتتحسب.",
                "Face and voice are checked on every exam, and the camera notices phones, books and long looks away. Ordinary glances don't count."),
        },
    ];

    return (
        <div ref={root}>
            {/* Who we are */}
            <section id="about" data-about className="relative isolate scroll-mt-16 overflow-hidden bg-black text-white">
                <img
                    data-about-bg
                    src="/photos/wide-library.webp"
                    srcSet="/photos/wide-library-960.webp 960w, /photos/wide-library.webp 1920w"
                    sizes="100vw"
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 -z-10 size-full object-cover"
                />
                <div className="absolute inset-0 -z-10 bg-black/65" aria-hidden />
                <div data-about-text className="mx-auto max-w-3xl px-4 py-28 text-center sm:px-6 sm:py-36">
                    <h2 className="text-[clamp(2.5rem,5vw,4rem)] font-black text-white">{l("من نحن؟", "Who we are")}</h2>
                    <p className="mt-6 text-lg leading-loose text-white/80">
                        {l("OralIQ منصة عربية للامتحانات الشفوية أونلاين. الطالب بيجاوب بصوته، والمنصة بتحوّل إجابته لنص، وتقارن معناها بإجابة المحاضر النموذجية، وتتأكد إنه هو اللي بيجاوب. والمحاضر بيستلم كل إجابة مصححة ومعاها السبب.",
                            "OralIQ is an Arabic platform for online oral exams. Students answer out loud; the platform transcribes the answer, compares its meaning with the lecturer's model answer, and checks the right student is answering. The lecturer receives every answer graded, with the reasons.")}
                    </p>
                    <a href="#offer" className="mt-9 inline-flex h-11 items-center bg-white px-6 text-sm font-semibold text-black transition-colors hover:bg-white/85">
                        {l("خدماتنا", "Our services")}
                    </a>
                </div>
            </section>

            {/* What we offer */}
            <section id="offer" className="scroll-mt-16 bg-sheet">
                <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-28">
                    <h2 className="text-[clamp(2.25rem,4.4vw,3.5rem)] font-black">{l("بنقدّم إيه؟", "What we offer")}</h2>
                    <div data-offer-grid className="relative mt-12 grid gap-5 sm:mt-32 lg:grid-cols-3">
                        <img
                            data-offer-shot
                            src="/screens/results-sheet.webp"
                            alt={l("ورقة إجابة طالب في OralIQ", "A student's answer sheet in OralIQ")}
                            width={746} height={1000}
                            loading="lazy"
                            className="absolute -top-24 start-8 z-10 hidden w-36 -rotate-6 border-4 border-sheet shadow-float sm:block"
                        />
                        {cards.map((c) => (
                            <article
                                key={c.title}
                                data-offer-card
                                className={cn("flex flex-col justify-end p-7 sm:min-h-80 sm:p-8", c.dark ? "bg-black text-white" : "border border-ink/80 bg-sheet")}
                            >
                                <h3 className={cn("text-[1.75rem] font-extrabold", c.dark && "text-white")}>{c.title}</h3>
                                <p className={cn("mt-3 leading-relaxed", c.dark ? "text-white/75" : "text-ink-2")}>{c.body}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
