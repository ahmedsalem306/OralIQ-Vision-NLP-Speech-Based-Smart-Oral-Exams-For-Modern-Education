import { Link } from "react-router-dom";
import Logo from "./Logo";
import LanguageToggle, { ThemeToggle } from "./LanguageToggle";
import { ScoreMark } from "./ui/score-mark";
import { useI18n } from "../i18n";
import { COMPANY } from "../content/company";

const scenes = {
    /** Sign in: a student mid-answer, with the graded result floating on top. */
    signin: {
        src: "/photos/study-cafe.webp",
        srcSet: "/photos/study-cafe-800.webp 800w, /photos/study-cafe.webp 1200w",
        position: "center",
    },
    /** Sign up: where it all leads. */
    signup: {
        src: "/photos/graduate.webp",
        srcSet: "/photos/graduate-800.webp 800w, /photos/graduate.webp 1200w",
        position: "center 30%",
    },
} as const;

export function AuthShell({ children, scene = "signin" }: { children: React.ReactNode; scene?: keyof typeof scenes }) {
    const { l } = useI18n();
    const photo = scenes[scene];
    return (
        <div className="grid min-h-dvh bg-paper lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            {/* Form side */}
            <div className="flex flex-col px-5 py-6 sm:px-10">
                <div className="flex items-center justify-between">
                    <Link to="/" aria-label="OralIQ"><Logo size={30} /></Link>
                    <div className="flex items-center gap-1"><LanguageToggle compact /><ThemeToggle /></div>
                </div>
                <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">{children}</main>
                <p className="text-center text-xs text-ink-3">© 2026 {COMPANY.name}</p>
            </div>

            {/* Brand side — a real moment (student answering), with the product floating on top */}
            <aside className="relative hidden overflow-hidden lg:block">
                <img src={photo.src} srcSet={photo.srcSet} sizes="50vw" alt="" className="absolute inset-0 size-full object-cover" style={{ objectPosition: photo.position }} />
                <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/70 to-navy/10" aria-hidden />
                <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(70% 50% at 100% 0%, color-mix(in oklab, var(--pen) 45%, transparent), transparent 70%)" }} aria-hidden />

                <div className="relative flex h-full flex-col justify-end px-12 pb-16 xl:px-16">
                    {/* Floats over the photo, so the blur is real layering. avoid-ai-design-ignore: K3 */}
                    {scene === "signin" && <div className="mb-10 w-72 rounded-2xl border border-white/15 bg-white/10 p-5 text-white shadow-float backdrop-blur-md motion-safe:animate-[oiq-float_7s_ease-in-out_infinite]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-white/70">{l("سؤال 2 من 3", "Question 2 of 3")}</p>
                                <p className="mt-1 font-display font-semibold">{l("عرّف الذكاء الاصطناعي", "Define artificial intelligence")}</p>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                            <span className="[&_.text-ink]:text-white [&_.text-ink-2]:text-white/70"><ScoreMark score={92} size="md" animate /></span>
                            <span className="rounded-md bg-white/15 px-2 py-0.5 text-xs font-semibold">{l("ممتاز", "Excellent")}</span>
                        </div>
                    </div>}
                    <h2 className="max-w-lg text-[2.4rem] font-bold leading-[1.25] text-white xl:text-[2.75rem]">
                        {scene === "signup"
                            ? l("امتحانك الشفوي، من مكانك وبراحتك.", "Your oral exam, from wherever you're comfortable.")
                            : l("الطالب يجاوب بصوته، والتصحيح يوصلك جاهز.", "Students answer out loud. You get the grading done.")}
                    </h2>
                    <p className="mt-4 max-w-md text-lg text-white/75">
                        {scene === "signup"
                            ? l("من غير لجنة ولا رهبة: تجاوب بصوتك، وتشوف درجتك وتفاصيلها أول ما المحاضر ينشرها.",
                                "No panel, no pressure: answer out loud, then see your grade and its breakdown as soon as your lecturer publishes it.")
                            : l("OralIQ بيحوّل الإجابة لنص، ويقارنها بإجابتك النموذجية، ويتأكد إن الطالب هو اللي بيجاوب.",
                                "OralIQ transcribes each answer, compares it with your model answer, and checks the right student is answering.")}
                    </p>
                </div>
            </aside>
        </div>
    );
}
