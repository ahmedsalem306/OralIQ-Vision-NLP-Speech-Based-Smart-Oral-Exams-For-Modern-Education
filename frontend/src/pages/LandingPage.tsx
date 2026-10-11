import { Link } from "react-router-dom";
import {
    BarChart3, BookOpen, Check, FileDown, Smartphone, Users, Languages, Mail, MapPin, Mic, Phone, ScanFace, ShieldCheck, Sparkles, Eye, Clock, Send, PenLine,
} from "lucide-react";
import { useI18n } from "../i18n";
import { cn } from "../lib/utils";
import Logo from "../components/Logo";
import LanguageToggle, { ThemeToggle } from "../components/LanguageToggle";
import { ButtonLink, buttonClasses } from "../components/ui/button";
import { Avatar } from "../components/ui/avatar";
import { ScoreMark } from "../components/ui/score-mark";
import { usePageTitle } from "../lib/usePageTitle";

const TEAM = [
    { name: "Ahmed Salem", role: { ar: "قائد الفريق", en: "Team leader" } },
    { name: "Afaf Walid", role: { ar: "تطوير", en: "Developer" } },
    { name: "Mohamed Gamal", role: { ar: "تطوير", en: "Developer" } },
    { name: "Roqaia Mohamed", role: { ar: "تطوير", en: "Developer" } },
];

/** A small photo set inside the headline, sized to the line like a word. */
function InlinePhoto({ src, alt, className }: { src: string; alt: string; className?: string }) {
    return (
        <img
            src={src}
            alt={alt}
            width={170}
            height={100}
            className={cn(
                "mx-[0.12em] inline-block h-[0.78em] w-[1.45em] rounded-full object-cover align-[-0.06em] shadow-[0_8px_20px_-8px_rgba(17,27,52,0.5)] ring-[3px] ring-sheet",
                className,
            )}
        />
    );
}

/** Thin static waveform used as an illustration. */
function Wave({ bars = 28, className }: { bars?: number; className?: string }) {
    return (
        <svg viewBox={`0 0 ${bars * 6} 24`} preserveAspectRatio="none" className={className} aria-hidden>
            {Array.from({ length: bars }).map((_, i) => {
                const h = 4 + Math.abs(Math.sin(i * 0.8) * 9 + Math.sin(i * 0.33) * 7);
                return <rect key={i} x={i * 6} y={12 - h / 2} width="3" height={h} rx="1.5" fill="currentColor" />;
            })}
        </svg>
    );
}

function BrowserFrame({ src, alt }: { src: string; alt: string }) {
    return (
        <div className="overflow-hidden rounded-[18px] border border-rule bg-sheet shadow-float" dir="ltr">
            <div className="flex h-9 items-center gap-1.5 border-b border-rule bg-sheet-2 px-4" aria-hidden>
                <span className="size-2.5 rounded-full bg-[#FF5F57]" /><span className="size-2.5 rounded-full bg-[#FEBC2E]" /><span className="size-2.5 rounded-full bg-[#28C840]" />
                <span className="mx-auto h-5 w-60 max-w-[50%] rounded-md bg-rule/70" />
            </div>
            <img src={src} alt={alt} width={1920} height={1200} loading="lazy" className="block w-full" />
        </div>
    );
}

function PhoneFrame({ src, alt, className }: { src: string; alt: string; className?: string }) {
    return (
        <div className={cn("rounded-[2.6rem] bg-[#05080F] p-2.5 shadow-float ring-1 ring-white/10", className)}>
            <div className="relative overflow-hidden rounded-[2.1rem] bg-sheet">
                <img src={src} alt={alt} width={780} height={1688} loading="lazy" className="block w-full" />
            </div>
        </div>
    );
}

export default function LandingPage() {
    const { l, lang } = useI18n();
    usePageTitle(l("أول منصة عربية للامتحانات الشفوية أونلاين", "The first Arabic platform for online oral exams"));
    let loggedIn = false;
    try { loggedIn = !!localStorage.getItem("token"); } catch { /* ignore */ }
    const startHref = loggedIn ? "/dashboard" : "/register";

    const steps = [
        { icon: PenLine, title: l("اكتب السؤال والإجابة النموذجية", "Write the question and model answer"), body: l("بالكتابة أو بصوتك. حدد الوقت والصعوبة والكلمات المفتاحية.", "Type or dictate it. Set the time, difficulty and key terms.") },
        { icon: Send, title: l("ابعت رابط الامتحان", "Send the exam link"), body: l("رابط واحد للامتحان كله على جروب المادة، أو لطلاب بعينهم.", "One link for the whole exam — to the class group or specific students.") },
        { icon: Mic, title: l("الطالب يجاوب بصوته", "Students answer out loud"), body: l("من الموبايل أو اللابتوب، والكاميرا بتتأكد من هويته.", "From a phone or laptop, while the camera confirms who's answering.") },
        { icon: Sparkles, title: l("الدرجة توصلك جاهزة", "The grade arrives, ready"), body: l("مع نص الإجابة وتفاصيل الدرجة. تراجع وتنشر بضغطة.", "With the transcript and a breakdown. Review and publish in one click.") },
    ];

    const parts = [
        { pct: 80, title: l("المحتوى", "Content"), body: l("معنى الإجابة مقارنةً بإجابتك النموذجية، مع الكلمات المفتاحية. متسامح مع أخطاء تحويل الكلام العربي لنص، ومابيدّيش درجة لإجابة غلط.", "The answer's meaning against your model answer, plus key terms. Forgives Arabic speech-to-text slips without rewarding wrong answers.") },
        { pct: 10, title: l("الطلاقة", "Fluency"), body: l("كلمات التردد، والوقفات الطويلة، والتكرار، وسرعة الكلام.", "Filler words, long pauses, repetition and pace.") },
        { pct: 10, title: l("النزاهة", "Integrity"), body: l("النظر بعيد لفترة، أو موبايل أو كتاب أو شخص تاني في الكادر.", "Looking away for long, or a phone, book or another person in view.") },
    ];

    return (
        <div className="min-h-dvh overflow-x-clip bg-paper text-ink">
            {/* ── Nav ── */}
            <header className="sticky top-0 z-30 border-b border-rule/70 bg-paper/80 backdrop-blur-xl">
                <nav className="mx-auto flex h-[4.25rem] max-w-7xl items-center gap-6 px-4 sm:px-6" aria-label={l("الرئيسية", "Main")}>
                    <Link to="/" aria-label="OralIQ"><Logo size={32} /></Link>
                    <div className="hidden items-center gap-1 text-[0.9375rem] md:flex">
                        <a href="#how" className={buttonClasses("ghost", "sm")}>{l("إزاي بيشتغل", "How it works")}</a>
                        <a href="#features" className={buttonClasses("ghost", "sm")}>{l("المميزات", "Features")}</a>
                        <a href="#grading" className={buttonClasses("ghost", "sm")}>{l("التصحيح", "Grading")}</a>
                        <a href="#contact" className={buttonClasses("ghost", "sm")}>{l("تواصل معنا", "Contact")}</a>
                    </div>
                    <div className="ms-auto flex items-center gap-1">
                        <LanguageToggle compact />
                        <ThemeToggle />
                        {loggedIn ? (
                            <ButtonLink to="/dashboard" size="sm" className="ms-2">{l("لوحة التحكم", "Dashboard")}</ButtonLink>
                        ) : (
                            <>
                                <ButtonLink to="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">{l("تسجيل الدخول", "Sign in")}</ButtonLink>
                                <ButtonLink to="/register" size="sm" className="ms-1">{l("أنشئ حساب", "Create account")}</ButtonLink>
                            </>
                        )}
                    </div>
                </nav>
            </header>

            <main>
                {/* ── Hero ── */}
                <section className="relative">
                    {/* Glows + fine grid, fading out */}
                    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                        <div className="absolute -top-40 start-[-10%] size-[640px] rounded-full bg-pen/20 blur-[120px]" />
                        <div className="absolute top-20 end-[-8%] size-[520px] rounded-full bg-violet/15 blur-[120px]" />
                        <div
                            className="absolute inset-0 opacity-60"
                            style={{
                                backgroundImage: "linear-gradient(var(--rule) 1px, transparent 1px), linear-gradient(90deg, var(--rule) 1px, transparent 1px)",
                                backgroundSize: "56px 56px",
                                maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black 20%, transparent 75%)",
                                WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black 20%, transparent 75%)",
                            }}
                        />
                    </div>

                    <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pb-28 lg:pt-20">
                        <div>
                            <h1 className="font-display text-[2.05rem] font-extrabold leading-[1.25] tracking-tight min-[400px]:text-[2.3rem] sm:text-[3.5rem] sm:leading-[1.2] lg:text-[4rem]">
                                {lang === "ar" ? (
                                    <>
                                        <span className="sm:whitespace-nowrap">أول منصة عربية</span>
                                        <InlinePhoto src="/photos/chip-student.webp" alt="طالبة بتجاوب بصوتها" />
                                        <br />
                                        <span className="bg-gradient-to-l from-pen to-violet bg-clip-text text-transparent sm:whitespace-nowrap">للامتحانات الشفوية</span>
                                        <br />
                                        <InlinePhoto src="/photos/chip-lecturer.webp" alt="محاضرة" className="ms-0" />
                                        <span> أونلاين.</span>
                                    </>
                                ) : (
                                    <>
                                        The first Arabic <InlinePhoto src="/photos/chip-student.webp" alt="A student answering out loud" /> platform for{" "}
                                        <span className="bg-gradient-to-r from-pen to-violet bg-clip-text text-transparent">online oral exams</span>{" "}
                                        <InlinePhoto src="/photos/chip-lecturer.webp" alt="A lecturer" />
                                    </>
                                )}
                            </h1>
                            <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink-2 sm:text-xl">
                                {l("الطالب يجاوب بصوته من أي مكان، والإجابة بتتصحح لوحدها: OralIQ يحوّلها لنص، ويقارنها بإجابتك النموذجية، ويتأكد إن الطالب نفسه هو اللي بيجاوب.",
                                    "Students answer out loud from anywhere and every answer grades itself: OralIQ transcribes it, compares it with your model answer, and checks the right student is answering.")}
                            </p>
                            <div className="mt-9 flex flex-wrap gap-3">
                                <ButtonLink to={startHref} size="lg" className="h-[3.25rem] px-7 text-[1.0625rem]">{l("ابدأ الآن", "Get started")}</ButtonLink>
                                <a href="#how" className={buttonClasses("secondary", "lg", "h-[3.25rem] px-7 text-[1.0625rem]")}>{l("شوف إزاي بيشتغل", "See how it works")}</a>
                            </div>
                            <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-[0.9375rem] text-ink-2">
                                {[l("تصحيح بالمعنى مش بالحفظ", "Grades meaning, not memorising"), l("تحقق من الوش والصوت", "Face and voice checks"), l("عربي وإنجليزي", "Arabic and English")].map((t) => (
                                    <li key={t} className="flex items-center gap-2">
                                        <span className="flex size-5 items-center justify-center rounded-full bg-pass-wash text-pass"><Check className="size-3.5" aria-hidden /></span>{t}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Photo with floating product cards */}
                        <div className="relative mx-auto w-full max-w-[480px] lg:mx-0 lg:justify-self-end">
                            <div className="absolute -inset-4 rounded-[40px] bg-gradient-to-br from-pen/25 via-violet/15 to-transparent blur-2xl" aria-hidden />
                            <div className="relative overflow-hidden rounded-[32px] shadow-float ring-1 ring-black/5">
                                <img src="/photos/hero-student.webp" alt={l("طالبة بتجاوب على امتحان شفوي من اللابتوب", "A student answering an oral exam on her laptop")} width={960} height={1200} className="block aspect-[4/5] w-full object-cover" fetchPriority="high" />
                                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-navy/50 to-transparent" aria-hidden />
                                {/* Live recording pill */}
                                <div className="absolute bottom-5 start-5 flex items-center gap-2 rounded-full bg-white/90 py-1.5 pe-3 ps-2 text-sm font-semibold text-navy shadow-lg backdrop-blur" dir="ltr">
                                    <span className="relative flex size-2.5"><span className="absolute inset-0 rounded-full bg-mark motion-safe:animate-[oiq-pulse-ring_1.4s_ease-out_infinite]" /><span className="relative size-2.5 rounded-full bg-mark" /></span>
                                    <Wave bars={12} className="h-4 w-14 text-[#2348C8]" />
                                    <span className="tabular">01:12</span>
                                </div>
                            </div>

                            {/* Score card */}
                            <div className="absolute start-2 top-6 w-48 rounded-2xl sm:-start-14 sm:top-10 sm:w-52 lg:-start-14 border border-rule/70 bg-sheet/95 p-4 shadow-float backdrop-blur motion-safe:animate-[oiq-float_6s_ease-in-out_infinite]">
                                <p className="text-xs text-ink-3">{l("سؤال 2 من 3", "Question 2 of 3")}</p>
                                <div className="mt-1 flex items-center justify-between">
                                    <ScoreMark score={92} size="md" animate />
                                    <span className="rounded-md bg-pass-wash px-2 py-0.5 text-xs font-semibold text-pass">{l("ممتاز", "Excellent")}</span>
                                </div>
                                <div className="mt-2 grid grid-cols-3 border-t border-rule pt-2 text-center">
                                    {([[l("المحتوى", "Content"), 94], [l("الطلاقة", "Fluency"), 86], [l("النزاهة", "Integrity"), 100]] as const).map(([k, v]) => (
                                        <div key={k}><p className="text-[0.6875rem] text-ink-3">{k}</p><p className="font-display text-sm font-bold tabular">{v}</p></div>
                                    ))}
                                </div>
                            </div>

                            {/* Identity card */}
                            <div className="absolute bottom-16 end-2 w-56 rounded-2xl sm:-end-10 sm:bottom-10 sm:w-60 border border-rule/70 bg-sheet/95 p-4 shadow-float backdrop-blur motion-safe:animate-[oiq-float_7s_ease-in-out_1s_infinite]">
                                <div className="flex items-center gap-2">
                                    <span className="flex size-8 items-center justify-center rounded-full bg-pass-wash text-pass"><ShieldCheck className="size-[18px]" aria-hidden /></span>
                                    <p className="text-sm font-semibold">{l("الهوية متأكدة", "Identity confirmed")}</p>
                                </div>
                                <ul className="mt-3 space-y-1.5 text-sm text-ink-2">
                                    <li className="flex items-center justify-between"><span className="flex items-center gap-1.5"><ScanFace className="size-4 text-ink-3" aria-hidden />{l("الوجه", "Face")}</span><span className="font-semibold text-pass tabular">96%</span></li>
                                    <li className="flex items-center justify-between"><span className="flex items-center gap-1.5"><Mic className="size-4 text-ink-3" aria-hidden />{l("الصوت", "Voice")}</span><span className="font-semibold text-pass tabular">91%</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Product: the answer sheet ── */}
                <section className="relative mx-auto max-w-7xl px-4 pb-24 sm:px-6">
                    <div className="mx-auto max-w-3xl text-center">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-tight">{l("كل إجابة بتوصلك مصححة، ومعاها السبب", "Every answer arrives graded — with the reasons")}</h2>
                        <p className="mt-4 text-lg text-ink-2">{l("نص كلام الطالب، ونصيب كل جزء من الدرجة، والتحقق من الهوية. تراجع، وتنشر الدرجة بضغطة، أو تطبعها PDF.", "The student's words, what each part contributed, and the identity check. Review, publish in one click, or print to PDF.")}</p>
                    </div>
                    <div className="relative mt-14">
                        <div className="absolute inset-x-10 -bottom-6 top-10 rounded-[40px] bg-gradient-to-b from-pen/20 to-violet/10 blur-3xl" aria-hidden />
                        <div className="relative">
                            <BrowserFrame src="/screens/results.webp" alt={l("صفحة النتائج وورقة إجابة طالب", "The results page with a student's answer sheet open")} />
                        </div>
                    </div>
                </section>

                {/* ── How it works ── */}
                <section id="how" className="scroll-mt-20 border-y border-rule/70 bg-sheet">
                    <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
                        <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-tight">{l("من السؤال للدرجة في أربع خطوات", "From question to grade in four steps")}</h2>
                        <ol className="relative mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {steps.map((s, i) => {
                                const Icon = s.icon;
                                return (
                                    <li key={i} className="relative rounded-[22px] border border-rule/80 bg-paper/60 p-6">
                                        <span className="relative flex size-14 items-center justify-center rounded-2xl bg-pen text-pen-ink shadow-[0_10px_24px_-10px_var(--pen)]">
                                            <Icon className="size-6" aria-hidden />
                                            <span className="absolute -end-2 -top-2 flex size-6 items-center justify-center rounded-full bg-sheet font-display text-xs font-bold text-pen ring-2 ring-pen/20">{i + 1}</span>
                                        </span>
                                        <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                                        <p className="mt-2 leading-relaxed text-ink-2">{s.body}</p>
                                    </li>
                                );
                            })}
                        </ol>
                    </div>
                </section>

                {/* ── Features bento ── */}
                <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6">
                    <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-tight">{l("كل اللي امتحان شفوي محتاجه، في مكان واحد", "Everything an oral exam needs, in one place")}</h2>
                    <div className="mt-12 grid gap-5 lg:grid-cols-3">
                        {/* Phone tile */}
                        <div
                            className="relative overflow-hidden rounded-[26px] bg-navy p-8 pb-0 text-white lg:row-span-2"
                            style={{ backgroundImage: "radial-gradient(90% 60% at 100% 0%, color-mix(in oklab, var(--pen) 55%, transparent), transparent 60%)" }}
                        >
                            <h3 className="text-2xl font-bold text-white">{l("يجاوب من موبايله", "Answers from their phone")}</h3>
                            <p className="mt-2 max-w-sm text-white/70">{l("مفيش برنامج يتسطّب. السؤال، والتايمر، والكاميرا كلهم في صفحة واحدة مصممة للموبايل.", "Nothing to install. Question, timer and camera on one screen built for phones.")}</p>
                            <div className="relative mx-auto mt-8 h-[460px] w-[min(270px,80%)] overflow-hidden">
                                <PhoneFrame src="/screens/exam-mobile.webp" alt={l("أوضة الامتحان على الموبايل", "The exam room on a phone")} />
                            </div>
                        </div>

                        {/* Identity */}
                        <div className="rounded-[26px] border border-rule/80 bg-sheet p-7 shadow-card">
                            <span className="flex size-11 items-center justify-center rounded-xl bg-violet-wash text-violet"><ScanFace className="size-5" aria-hidden /></span>
                            <h3 className="mt-5 text-xl font-semibold">{l("الوش والصوت لازم يطابقوا", "Face and voice must match")}</h3>
                            <p className="mt-2 text-ink-2">{l("بصمة بتتسجل مرة واحدة، وتتقارن في كل امتحان. لو واحدة بس طابقت، الإجابة بتتعلّم «مراجعة».", "Registered once, checked every exam. If only one matches, the answer is flagged for review.")}</p>
                            <div className="mt-5 flex -space-x-3 rtl:space-x-reverse">
                                {["/photos/chip-portrait.webp", "/photos/chip-student.webp", "/photos/chip-lecturer.webp"].map((src) => (
                                    <img key={src} src={src} alt="" className="size-11 rounded-full object-cover ring-[3px] ring-sheet" loading="lazy" />
                                ))}
                                <span className="flex size-11 items-center justify-center rounded-full bg-pass-wash text-pass ring-[3px] ring-sheet"><Check className="size-5" aria-hidden /></span>
                            </div>
                        </div>

                        {/* Meaning-based grading */}
                        <div className="rounded-[26px] border border-rule/80 bg-sheet p-7 shadow-card">
                            <span className="flex size-11 items-center justify-center rounded-xl bg-pen-wash text-pen"><Sparkles className="size-5" aria-hidden /></span>
                            <h3 className="mt-5 text-xl font-semibold">{l("بيفهم المعنى", "Understands meaning")}</h3>
                            <p className="mt-2 text-ink-2">{l("الطالب مش لازم يحفظ نفس الكلام. لو قال المعنى صح بأسلوبه، بياخد الدرجة.", "Students don't need your exact words. The right idea in their own words earns the marks.")}</p>
                            <p className="mt-5 rounded-xl bg-sheet-2 px-4 py-3 text-[0.9375rem] leading-loose text-ink-2">
                                {l("آلة ", "A machine that ")}<mark className="rounded bg-pen-wash px-1 text-pen">{l("بتحاكي تفكير الإنسان", "imitates human thinking")}</mark>{l(" و", " and ")}<mark className="rounded bg-pen-wash px-1 text-pen">{l("بتتعلّم من البيانات", "learns from data")}</mark>…
                            </p>
                        </div>

                        {/* Proctoring */}
                        <div className="rounded-[26px] border border-rule/80 bg-sheet p-7 shadow-card">
                            <span className="flex size-11 items-center justify-center rounded-xl bg-warn-wash text-warn"><Eye className="size-5" aria-hidden /></span>
                            <h3 className="mt-5 text-xl font-semibold">{l("مراقبة عادلة", "Fair proctoring")}</h3>
                            <p className="mt-2 text-ink-2">{l("بيرصد الموبايل والكتاب والنظر بعيد لفترة طويلة. النظرة العادية مش بتتحسب.", "Detects phones, books and long looks away. Ordinary glances don't count.")}</p>
                            <ul className="mt-5 flex flex-wrap gap-2 text-sm">
                                {[
                                    { icon: Smartphone, t: l("موبايل في الكادر", "Phone in view") },
                                    { icon: BookOpen, t: l("كتاب أو ورق", "Book or notes") },
                                    { icon: Users, t: l("شخص تاني", "Another person") },
                                    { icon: Eye, t: l("نظر بعيد لفترة", "Long look away") },
                                ].map(({ icon: Icon, t }) => (
                                    <li key={t} className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-sheet-2 px-3 py-1.5 text-ink-2"><Icon className="size-4 text-warn" aria-hidden />{t}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Small facts */}
                        <div className="grid grid-cols-2 gap-5">
                            {[
                                { icon: BarChart3, tone: "bg-teal-wash text-teal", title: l("تحليلات", "Analytics"), body: l("الأسئلة الأصعب على طلابك", "Your hardest questions") },
                                { icon: FileDown, tone: "bg-pen-wash text-pen", title: l("Excel و PDF", "Excel & PDF"), body: l("صدّر النتائج واطبع الأوراق", "Export and print") },
                                { icon: Languages, tone: "bg-violet-wash text-violet", title: l("عربي أولاً", "Arabic first"), body: l("وإنجليزي كمان", "English too") },
                                { icon: Clock, tone: "bg-warn-wash text-warn", title: l("حضور لحظي", "Live attendance"), body: l("مين دخل ومين لسه", "Who's done, who isn't") },
                            ].map(({ icon: Icon, tone, title, body }) => (
                                <div key={title} className="rounded-[22px] border border-rule/80 bg-sheet p-5 shadow-card">
                                    <span className={cn("flex size-9 items-center justify-center rounded-lg", tone)}><Icon className="size-[18px]" aria-hidden /></span>
                                    <p className="mt-3 font-semibold">{title}</p>
                                    <p className="mt-0.5 text-sm text-ink-2">{body}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Grading formula (navy) ── */}
                <section
                    id="grading"
                    className="scroll-mt-20 bg-navy text-white"
                    style={{ backgroundImage: "radial-gradient(60% 80% at 0% 0%, color-mix(in oklab, var(--pen) 45%, transparent), transparent 60%), radial-gradient(50% 70% at 100% 100%, color-mix(in oklab, var(--violet) 35%, transparent), transparent 60%)" }}
                >
                    <div className="mx-auto grid max-w-7xl gap-14 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.25fr]">
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-[2.6rem] sm:leading-tight">{l("الدرجة مش صندوق أسود", "The grade isn't a black box")}</h2>
                            <p className="mt-5 text-lg leading-relaxed text-white/70">
                                {l("كل درجة معاها تفاصيلها. ولو المحتوى أقل من 50%، الطالب مايقدرش ينجح مهما كانت طلاقته.",
                                    "Every grade shows its working. If content is under 50%, the student can't pass however fluent they sound.")}
                            </p>
                            <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.05] p-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-white/60">{l("درجة نهائية", "Final grade")}</span>
                                    <span className="font-display text-4xl font-bold" dir="ltr">91.5<span className="text-xl text-white/50">%</span></span>
                                </div>
                                <div className="mt-4 flex h-3 gap-1 overflow-hidden rounded-full" aria-hidden>
                                    <div className="rounded-full bg-[#8EA6FF]" style={{ width: "80%" }} />
                                    <div className="rounded-full bg-[#B9A8FF]" style={{ width: "10%" }} />
                                    <div className="rounded-full bg-[#7FE0D2]" style={{ width: "10%" }} />
                                </div>
                            </div>
                        </div>
                        <dl className="space-y-4">
                            {parts.map((p, i) => (
                                <div key={p.title} className="flex gap-5 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                                    <dt className={cn("w-20 shrink-0 font-display text-4xl font-extrabold tabular", ["text-[#8EA6FF]", "text-[#B9A8FF]", "text-[#7FE0D2]"][i])}>{p.pct}%</dt>
                                    <dd>
                                        <p className="text-lg font-semibold text-white">{p.title}</p>
                                        <p className="mt-1 leading-relaxed text-white/65">{p.body}</p>
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </section>

                {/* ── For lecturers / for students ── */}
                <section className="mx-auto max-w-7xl space-y-24 px-4 py-24 sm:px-6">
                    {[
                        {
                            img: "/photos/lecturer.webp", alt: l("محاضرة قدام السبورة", "A lecturer at the board"),
                            title: l("للمحاضر: وقتك للتدريس، مش للتصحيح", "For lecturers: teach, don't grade all night"),
                            points: [l("امتحان شفوي لـ 200 طالب من غير ما تسمع 200 تسجيل", "Oral exams for 200 students without listening to 200 recordings"), l("ملاحظات النزاهة والهوية قدامك قبل ما تنشر", "Integrity and identity notes before you publish"), l("صدّر Excel أو اطبع ورقة كل طالب", "Export to Excel or print each answer sheet")],
                        },
                        {
                            img: "/photos/study-headphones.webp", alt: l("طالبة بتذاكر بسماعات ولابتوب", "A student with headphones and a laptop"),
                            title: l("للطالب: امتحان شفوي من غير رهبة اللجنة", "For students: oral exams without the panel nerves"),
                            points: [l("يجاوب من بيته على الموبايل أو اللابتوب", "Answer from home on a phone or laptop"), l("يشوف درجته وتفاصيلها أول ما المحاضر ينشرها", "See the grade and its breakdown once published"), l("يعرف هو كان متردد فين وإزاي يتحسن", "Learn where they hesitated and how to improve")],
                        },
                    ].map((b, i) => (
                        <div key={b.title} className={cn("grid items-center gap-12 lg:grid-cols-2", i === 1 && "lg:[&>*:first-child]:order-2")}>
                            <div className="relative">
                                <div className="absolute -inset-3 rounded-[36px] bg-gradient-to-br from-pen/15 to-violet/10 blur-xl" aria-hidden />
                                <img src={b.img} alt={b.alt} width={1200} height={750} loading="lazy" className="relative aspect-[16/11] w-full rounded-[28px] object-cover shadow-float" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold tracking-tight sm:text-[2.3rem] sm:leading-tight">{b.title}</h2>
                                <ul className="mt-7 space-y-4">
                                    {b.points.map((p) => (
                                        <li key={p} className="flex items-start gap-3 text-lg text-ink-2">
                                            <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-pen text-pen-ink"><Check className="size-4" aria-hidden /></span>{p}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </section>

                {/* ── Contact + team ── */}
                <section id="contact" className="scroll-mt-20 border-t border-rule/70 bg-sheet">
                    <div className="mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight sm:text-[2.4rem] sm:leading-tight">{l("عايز تجرّبه في مؤسستك؟", "Want it for your institution?")}</h2>
                            <p className="mt-4 text-lg leading-relaxed text-ink-2">
                                {l("بنجهّز OralIQ للجامعات والمدارس ومراكز التدريب. كلّمنا ونرتب معاك تجربة على امتحان حقيقي.", "We set OralIQ up for universities, schools and training centres. Get in touch and we'll arrange a trial on a real exam.")}
                            </p>
                            <ul className="mt-8 space-y-3 text-ink-2">
                                <li className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-pen-wash text-pen"><Mail className="size-5" aria-hidden /></span><a className="ltr hover:text-pen" href="mailto:ahmedsalem250500@gmail.com">ahmedsalem250500@gmail.com</a></li>
                                <li className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-pen-wash text-pen"><Phone className="size-5" aria-hidden /></span><a className="ltr hover:text-pen" href="tel:+201065407502">+20 106 540 7502</a></li>
                                <li className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-pen-wash text-pen"><MapPin className="size-5" aria-hidden /></span>{l("المنصورة، مصر", "Mansoura, Egypt")}</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="mb-4 text-lg font-semibold">{l("فريق OralIQ", "The OralIQ team")}</h3>
                            <ul className="grid gap-3 sm:grid-cols-2">
                                {TEAM.map((m) => (
                                    <li key={m.name} className="flex items-center gap-4 rounded-2xl border border-rule/80 bg-paper/60 p-4">
                                        <Avatar name={m.name} size="lg" />
                                        <div>
                                            <p className="font-semibold" dir="ltr">{m.name}</p>
                                            <p className="text-sm text-ink-2">{l(m.role.ar, m.role.en)}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ── Closing CTA ── */}
                <section className="px-4 py-20 sm:px-6">
                    <div
                        className="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-navy px-8 py-14 text-white shadow-float sm:px-14"
                        style={{ backgroundImage: "radial-gradient(70% 120% at 100% 0%, color-mix(in oklab, var(--pen) 70%, transparent), transparent 60%)" }}
                    >
                        <Wave bars={90} className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full text-white/[0.07]" />
                        <div className="relative flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
                            <div className="max-w-xl">
                                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-[2.6rem] sm:leading-tight">{l("جرّبه في امتحانك الشفوي الجاي.", "Try it on your next oral exam.")}</h2>
                                <p className="mt-3 text-lg text-white/70">{l("أنشئ حساب محاضر، واكتب أول سؤال في أقل من دقيقتين.", "Create a lecturer account and write your first question in under two minutes.")}</p>
                            </div>
                            <ButtonLink to={startHref} size="lg" className="h-[3.25rem] bg-white px-7 text-[1.0625rem] text-navy shadow-none hover:bg-white/90">{l("أنشئ حساب محاضر", "Create a lecturer account")}</ButtonLink>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-rule/70">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-ink-3 sm:px-6">
                    <Logo size={26} />
                    <p>{l("مبني بـ Whisper وSentence-BERT وInsightFace وMediaPipe", "Built with Whisper, Sentence-BERT, InsightFace and MediaPipe")}</p>
                    <p>© 2026 OralIQ</p>
                </div>
            </footer>
        </div>
    );
}
