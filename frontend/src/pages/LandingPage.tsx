import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MotionConfig, useMotionValueEvent } from "motion/react";
import {
    BarChart3, BookOpen, Check, Clock, Eye, FileDown, Inbox, Languages, Mail, MapPin, Mic, PenLine, Phone, Plus, ScanFace, Send,
    Smartphone, Sparkles, Users, X,
} from "lucide-react";
import { useI18n } from "../i18n";
import { cn } from "../lib/utils";
import Logo from "../components/Logo";
import LanguageToggle, { ThemeToggle } from "../components/LanguageToggle";
import { ButtonLink, buttonClasses } from "../components/ui/button";
import { Avatar } from "../components/ui/avatar";
import { LiveGradingDemo } from "../components/landing/LiveGradingDemo";
import { HeroStage } from "../components/landing/HeroStage";
import { usePageTitle } from "../lib/usePageTitle";
import {
    CountUp, EASE, Reveal, ScrollProgress, Spotlight, Stagger, TiltCard, motion, staggerChild, useEnterProgress, useScroll, useSpring, useTransform,
} from "../components/motion";

const TEAM = [
    { name: "Ahmed Salem", role: { ar: "قائد الفريق", en: "Team leader" } },
    { name: "Afaf Walid", role: { ar: "تطوير", en: "Developer" } },
    { name: "Mohamed Gamal", role: { ar: "تطوير", en: "Developer" } },
    { name: "Roqaia Mohamed", role: { ar: "تطوير", en: "Developer" } },
];

/* ───────────────────────── small building blocks ───────────────────────── */

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

/** Short label above a section heading. */
function Eyebrow({ children, onDark = false, center = false }: { children: React.ReactNode; onDark?: boolean; center?: boolean }) {
    return (
        <p className={cn("mb-4 flex items-center gap-2.5 text-sm font-semibold", onDark ? "text-[#A9BBFF]" : "text-pen", center && "justify-center")}>
            <span className="h-px w-7 bg-current opacity-50" aria-hidden />
            {children}
            {center && <span className="h-px w-7 bg-current opacity-50" aria-hidden />}
        </p>
    );
}

function BrowserFrame({ src, alt, narrowSrc }: { src: string; alt: string; /** A readable crop for phones. */ narrowSrc?: string }) {
    return (
        <div className="overflow-hidden rounded-[18px] border border-rule bg-sheet shadow-float" dir="ltr">
            <div className="flex h-9 items-center gap-1.5 border-b border-rule bg-sheet-2 px-4" aria-hidden>
                <span className="size-2.5 rounded-full bg-[#FF5F57]" /><span className="size-2.5 rounded-full bg-[#FEBC2E]" /><span className="size-2.5 rounded-full bg-[#28C840]" />
                <span className="mx-auto h-5 w-60 max-w-[50%] rounded-md bg-rule/70" />
            </div>
            <picture>
                {narrowSrc && <source media="(max-width: 639px)" srcSet={narrowSrc} width={746} height={1000} />}
                <img src={src} alt={alt} width={1920} height={1200} loading="lazy" className="block w-full" />
            </picture>
        </div>
    );
}

function PhoneFrame({ src, alt }: { src: string; alt: string }) {
    return (
        <div className="rounded-[2.6rem] bg-[#05080F] p-2.5 shadow-float ring-1 ring-white/10">
            <div className="relative overflow-hidden rounded-[2.1rem] bg-sheet">
                <img src={src} alt={alt} width={780} height={1688} loading="lazy" className="block w-full" />
            </div>
        </div>
    );
}

/** Endless band of subjects — OralIQ isn't tied to one field. */
function SubjectsMarquee({ items, label }: { items: string[]; label: string }) {
    const row = (hidden: boolean) => (
        <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-3 pe-3">
            {items.map((s) => (
                <li key={s} className="flex items-center gap-3 whitespace-nowrap rounded-full border border-rule/80 bg-sheet px-5 py-2.5 font-display text-[1.0625rem] font-semibold text-ink-2 shadow-card">
                    <Mic className="size-4 text-pen" aria-hidden />{s}
                </li>
            ))}
        </ul>
    );
    return (
        <div aria-label={label} className="group relative flex overflow-hidden py-2 [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
            <div className="flex w-max motion-safe:animate-[oiq-marquee_38s_linear_infinite] group-hover:[animation-play-state:paused]">
                {row(false)}
                {row(true)}
            </div>
        </div>
    );
}

/* ───────────────────────────────── page ───────────────────────────────── */

export default function LandingPage() {
    const { l, lang } = useI18n();
    usePageTitle(l("أول منصة عربية للامتحانات الشفوية أونلاين", "The first Arabic platform for online oral exams"));
    let loggedIn = false;
    try { loggedIn = !!localStorage.getItem("token"); } catch { /* ignore */ }
    const startHref = loggedIn ? "/dashboard" : "/register";

    // Header gains a shadow once the page moves
    const { scrollY } = useScroll();
    const [scrolled, setScrolled] = useState(false);
    useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));

    // Product screenshot straightens from a 3D tilt as it scrolls in
    const { ref: productRef, progress: productP } = useEnterProgress<HTMLDivElement>();
    const tilt = useSpring(useTransform(productP, [0, 1], [22, 0]), { stiffness: 120, damping: 24 });
    const tiltScale = useTransform(productP, [0, 1], [0.88, 1]);
    const tiltY = useTransform(productP, [0, 1], [60, 0]);

    // Steps connector fills while the section crosses the screen
    const stepsRef = useRef<HTMLOListElement>(null);
    const { scrollYProgress: stepsP } = useScroll({ target: stepsRef, offset: ["start 85%", "end 55%"] });
    const stepsFill = useSpring(stepsP, { stiffness: 120, damping: 26 });

    // Phone rises inside its tile
    const { ref: phoneRef, progress: phoneP } = useEnterProgress<HTMLDivElement>();
    const phoneY = useTransform(phoneP, [0, 1], [140, 0]);

    const steps = [
        { icon: PenLine, title: l("اكتب السؤال والإجابة النموذجية", "Write the question and model answer"), body: l("بالكتابة أو بصوتك. حدد الوقت والصعوبة والكلمات المفتاحية.", "Type or dictate it. Set the time, difficulty and key terms.") },
        { icon: Send, title: l("ابعت رابط الامتحان", "Send the exam link"), body: l("رابط واحد للامتحان كله على جروب المادة، أو لطلاب بعينهم.", "One link for the whole exam — to the class group or specific students.") },
        { icon: Mic, title: l("الطالب يجاوب بصوته", "Students answer out loud"), body: l("من الموبايل أو اللابتوب، والكاميرا بتتأكد من هويته.", "From a phone or laptop, while the camera confirms who's answering.") },
        { icon: Sparkles, title: l("الدرجة توصلك جاهزة", "The grade arrives, ready"), body: l("مع نص الإجابة وتفاصيل الدرجة. تراجع وتنشر بضغطة.", "With the transcript and a breakdown. Review and publish in one click.") },
    ];

    const parts = [
        { pct: 80, color: "#8EA6FF", title: l("المحتوى", "Content"), body: l("معنى الإجابة مقارنةً بإجابتك النموذجية، مع الكلمات المفتاحية. متسامح مع أخطاء تحويل الكلام العربي لنص، ومابيدّيش درجة لإجابة غلط.", "The answer's meaning against your model answer, plus key terms. Forgives Arabic speech-to-text slips without rewarding wrong answers.") },
        { pct: 10, color: "#B9A8FF", title: l("الطلاقة", "Fluency"), body: l("كلمات التردد، والوقفات الطويلة، والتكرار، وسرعة الكلام.", "Filler words, long pauses, repetition and pace.") },
        { pct: 10, color: "#7FE0D2", title: l("النزاهة", "Integrity"), body: l("النظر بعيد لفترة، أو موبايل أو كتاب أو شخص تاني في الكادر.", "Looking away for long, or a phone, book or another person in view.") },
    ];

    const before = [
        l("طالب ورا طالب قدام اللجنة، والباقيين مستنيين برّه.", "One student at a time before the panel, the rest waiting outside."),
        l("الدرجة ممكن تختلف من لجنة للتانية.", "Grades can vary from one panel to the next."),
        l("مفيش تسجيل يرجعله حد لو في تظلّم.", "No record to go back to if a grade is challenged."),
        l("رهبة اللجنة بتأثر على أداء الطالب.", "Panel nerves get in the way of the answer."),
        l("الحضور والهوية بالورقة والكشف.", "Attendance and identity checked on paper."),
    ];
    const after = [
        l("كل الطلبة يجاوبوا في نفس الوقت، كل واحد من مكانه.", "Every student answers at once, each from their own place."),
        l("نفس المعايير لكل الطلبة، وكل درجة معاها السبب.", "The same criteria for everyone, and every grade shows its reasons."),
        l("نص الإجابة وتفاصيل الدرجة محفوظين للمراجعة.", "The transcript and the grade breakdown are kept for review."),
        l("الطالب بيجاوب وهو مرتاح، من غير ضغط اللجنة.", "Students answer at ease, without the panel's pressure."),
        l("الهوية بتتأكد بالوش والصوت تلقائياً.", "Identity is checked by face and voice automatically."),
    ];
    const faqs = [
        { q: l("الطالب محتاج يسطّب برنامج؟", "Do students need to install anything?"), a: l("لأ. بيفتح رابط الامتحان من المتصفح على الموبايل أو اللابتوب، ويسمح بالكاميرا والميكروفون، وخلاص.", "No. They open the exam link in a browser on a phone or laptop, allow the camera and microphone, and that's it.") },
        { q: l("الدرجة بتتحسب إزاي؟", "How is the grade calculated?"), a: l("80% للمحتوى (معنى الإجابة مقارنةً بإجابتك النموذجية)، و10% للطلاقة، و10% للنزاهة. ولو المحتوى أقل من 50%، الطالب مايقدرش ينجح مهما كانت طلاقته.", "80% content (the answer's meaning against your model answer), 10% fluency and 10% integrity. If content is under 50%, the student can't pass however fluent they are.") },
        { q: l("لو الطالب جاوب صح بأسلوبه هو؟", "What if a student answers correctly in their own words?"), a: l("بياخد حقه. التصحيح بيقارن المعنى، مش الكلمات بالحرف، فمش لازم يحفظ نص الكتاب.", "They get the credit. Grading compares meaning, not exact wording, so there's no need to recite the book.") },
        { q: l("إزاي بتتأكدوا إن الطالب هو اللي بيجاوب؟", "How do you know the right student is answering?"), a: l("الطالب بيسجّل وشه وصوته مرة واحدة، وفي كل امتحان بيتقارنوا. لو في اختلاف، الإجابة بتتعلّم «مراجعة» عشان المحاضر يشوفها.", "Each student registers their face and voice once, and both are checked on every exam. If something doesn't match, the answer is flagged for the lecturer to review.") },
        { q: l("الطالب بيشوف درجته إمتى؟", "When does a student see their grade?"), a: l("بعد ما المحاضر يراجعها وينشرها. لحد كده الدرجة بتفضل مخفية عن الطالب.", "Once the lecturer has reviewed and published it. Until then it stays hidden from the student.") },
        { q: l("بيشتغل بالعربي بس؟", "Is it Arabic only?"), a: l("لأ، عربي وإنجليزي، في الواجهة وفي الإجابات.", "No — Arabic and English, in the interface and in the answers.") },
    ];

    const subjects = lang === "ar"
        ? ["الطب", "الهندسة", "اللغة العربية", "البرمجة", "الفيزياء", "الصيدلة", "إدارة الأعمال", "القانون", "اللغة الإنجليزية", "التاريخ", "التمريض", "المحاسبة"]
        : ["Medicine", "Engineering", "Arabic", "Programming", "Physics", "Pharmacy", "Business", "Law", "English", "History", "Nursing", "Accounting"];

    return (
        <MotionConfig reducedMotion="user">
            <div className="min-h-dvh overflow-x-clip bg-paper text-ink">
                <ScrollProgress />

                {/* ── Nav ── */}
                <header className={cn(
                    "sticky top-0 z-40 border-b backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-300",
                    scrolled ? "border-rule/70 bg-paper/85 shadow-[0_8px_30px_-18px_rgba(17,27,52,0.35)]" : "border-transparent bg-paper/40",
                )}>
                    <nav className="mx-auto flex h-[4.25rem] max-w-7xl items-center gap-6 px-4 sm:px-6" aria-label={l("الرئيسية", "Main")}>
                        <Link to="/" aria-label="OralIQ"><Logo size={32} /></Link>
                        <div className="hidden items-center gap-1 text-[0.9375rem] lg:flex">
                            <a href="#how" className={buttonClasses("ghost", "sm")}>{l("إزاي بيشتغل", "How it works")}</a>
                            <a href="#features" className={buttonClasses("ghost", "sm")}>{l("المميزات", "Features")}</a>
                            <a href="#grading" className={buttonClasses("ghost", "sm")}>{l("التصحيح", "Grading")}</a>
                            <a href="#faq" className={buttonClasses("ghost", "sm")}>{l("أسئلة شائعة", "FAQ")}</a>
                            <a href="#contact" className={buttonClasses("ghost", "sm")}>{l("تواصل معنا", "Contact")}</a>
                        </div>
                        <div className="ms-auto flex items-center gap-1">
                            <LanguageToggle compact />
                            <ThemeToggle />
                            {loggedIn ? (
                                <ButtonLink to="/dashboard" size="sm" className="ms-2">{l("لوحة التحكم", "Dashboard")}</ButtonLink>
                            ) : (
                                <>
                                    <ButtonLink to="/login" viewTransition variant="ghost" size="sm" className="hidden sm:inline-flex">{l("تسجيل الدخول", "Sign in")}</ButtonLink>
                                    <ButtonLink to="/register" viewTransition size="sm" className="ms-1">{l("أنشئ حساب", "Create account")}</ButtonLink>
                                </>
                            )}
                        </div>
                    </nav>
                </header>

                <main>
                    {/* ── Hero ── */}
                    <section className="relative">
                        <HeroStage startHref={startHref} />

                        {/* Subjects band */}
                        <Reveal delay={0.2} className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6">
                            <p className="mb-4 text-center text-sm font-medium text-ink-3">{l("مناسب لأي مادة فيها إجابة بالكلام", "Works for any subject answered out loud")}</p>
                            <SubjectsMarquee items={subjects} label={l("أمثلة على المواد", "Example subjects")} />
                        </Reveal>
                    </section>

                    {/* ── Product: the answer sheet ── */}
                    <section className="relative mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6">
                        <Reveal className="mx-auto max-w-3xl text-center">
                            <Eyebrow center>{l("ورقة الإجابة", "The answer sheet")}</Eyebrow>
                            <h2 className="text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-tight">{l("كل إجابة بتوصلك مصححة، ومعاها السبب", "Every answer arrives graded — with the reasons")}</h2>
                            <p className="mt-4 text-lg text-ink-2">{l("نص كلام الطالب، ونصيب كل جزء من الدرجة، والتحقق من الهوية. تراجع، وتنشر الدرجة بضغطة، أو تطبعها PDF.", "The student's words, what each part contributed, and the identity check. Review, publish in one click, or print to PDF.")}</p>
                        </Reveal>
                        <div ref={productRef} className="relative mt-14 [perspective:1600px]">
                            <div className="absolute inset-x-10 -bottom-6 top-10 rounded-[40px] bg-gradient-to-b from-pen/20 to-violet/10 blur-3xl" aria-hidden />
                            <motion.div style={{ rotateX: tilt, scale: tiltScale, y: tiltY, transformOrigin: "50% 0%" }} className="relative">
                                <TiltCard max={3}><BrowserFrame src="/screens/results.webp" narrowSrc="/screens/results-sheet.webp" alt={l("صفحة النتائج وورقة إجابة طالب", "The results page with a student's answer sheet open")} /></TiltCard>
                            </motion.div>
                        </div>
                    </section>

                    {/* ── How it works ── */}
                    <section id="how" className="scroll-mt-20 border-y border-rule/70 bg-sheet">
                        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
                            <Reveal>
                                <Eyebrow>{l("إزاي بيشتغل", "How it works")}</Eyebrow>
                                <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-tight">{l("من السؤال للدرجة في أربع خطوات", "From question to grade in four steps")}</h2>
                            </Reveal>
                            <div className="relative mt-14">
                                {/* Connector that fills with scroll (desktop) */}
                                <div className="absolute inset-x-[12.5%] top-[3.25rem] hidden h-[3px] overflow-hidden rounded-full bg-rule lg:block" aria-hidden>
                                    <motion.div style={{ scaleX: stepsFill }} className="h-full origin-[0%] rounded-full bg-gradient-to-r from-pen to-violet rtl:origin-[100%]" />
                                </div>
                                <Stagger as="ol" gap={0.14} className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                                    {steps.map((s, i) => {
                                        const Icon = s.icon;
                                        return (
                                            <motion.li
                                                key={i}
                                                variants={staggerChild}
                                                whileHover={{ y: -6 }}
                                                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                                                className="relative overflow-hidden rounded-[22px] border border-rule/80 bg-paper/60 p-6 transition-shadow hover:shadow-card"
                                            >
                                                <span className="pointer-events-none absolute -bottom-4 end-3 font-display text-[5.5rem] font-extrabold leading-none text-ink/[0.045] tabular" aria-hidden>0{i + 1}</span>
                                                <span className="relative flex size-14 items-center justify-center rounded-2xl bg-pen text-pen-ink shadow-[0_10px_24px_-10px_var(--pen)]">
                                                    <Icon className="size-6" aria-hidden />
                                                    <span className="absolute -end-2 -top-2 flex size-6 items-center justify-center rounded-full bg-sheet font-display text-xs font-bold text-pen ring-2 ring-pen/20">{i + 1}</span>
                                                </span>
                                                <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                                                <p className="mt-2 leading-relaxed text-ink-2">{s.body}</p>
                                            </motion.li>
                                        );
                                    })}
                                </Stagger>
                            </div>
                        </div>
                    </section>

                    {/* ── Features bento ── */}
                    <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6">
                        <Reveal>
                            <Eyebrow>{l("المميزات", "Features")}</Eyebrow>
                            <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-tight">{l("كل اللي امتحان شفوي محتاجه، في مكان واحد", "Everything an oral exam needs, in one place")}</h2>
                        </Reveal>
                        <Stagger gap={0.1} amount={0.1} className="mt-12 grid gap-5 lg:grid-cols-3">
                            {/* Phone tile */}
                            <motion.div
                                variants={staggerChild}
                                ref={phoneRef}
                                className="oiq-noise relative overflow-hidden rounded-[26px] bg-navy p-8 pb-0 text-white lg:row-span-2"
                                style={{ backgroundImage: "radial-gradient(90% 60% at 100% 0%, color-mix(in oklab, var(--pen) 55%, transparent), transparent 60%)" }}
                            >
                                <h3 className="text-2xl font-bold text-white">{l("يجاوب من موبايله", "Answers from their phone")}</h3>
                                <p className="mt-2 max-w-sm text-white/70">{l("مفيش برنامج يتسطّب. السؤال، والتايمر، والكاميرا كلهم في صفحة واحدة مصممة للموبايل.", "Nothing to install. Question, timer and camera on one screen built for phones.")}</p>
                                <div className="relative mx-auto mt-8 h-[460px] w-[min(270px,80%)] overflow-hidden">
                                    <motion.div style={{ y: phoneY }}>
                                        <PhoneFrame src="/screens/exam-mobile.webp" alt={l("أوضة الامتحان على الموبايل", "The exam room on a phone")} />
                                    </motion.div>
                                </div>
                            </motion.div>

                            {/* Identity */}
                            <motion.div variants={staggerChild} whileHover={{ y: -4 }} className="rounded-[26px] border border-rule/80 bg-sheet shadow-card">
                            <Spotlight className="h-full rounded-[26px] p-7">
                                <span className="flex size-11 items-center justify-center rounded-xl bg-violet-wash text-violet"><ScanFace className="size-5" aria-hidden /></span>
                                <h3 className="mt-5 text-xl font-semibold">{l("الوش والصوت لازم يطابقوا", "Face and voice must match")}</h3>
                                <p className="mt-2 text-ink-2">{l("بصمة بتتسجل مرة واحدة، وتتقارن في كل امتحان. لو واحدة بس طابقت، الإجابة بتتعلّم «مراجعة».", "Registered once, checked every exam. If only one matches, the answer is flagged for review.")}</p>
                                <div className="mt-5 flex -space-x-3 rtl:space-x-reverse">
                                    {["/photos/chip-smile.webp", "/photos/chip-student.webp", "/photos/chip-lecturer-desk.webp"].map((src, i) => (
                                        <motion.img
                                            key={src}
                                            src={src}
                                            alt=""
                                            loading="lazy"
                                            initial={{ opacity: 0, scale: 0.6 }}
                                            whileInView={{ opacity: 1, scale: 1 }}
                                            viewport={{ once: true }}
                                            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.2 + i * 0.1 }}
                                            className="size-11 rounded-full object-cover ring-[3px] ring-sheet"
                                        />
                                    ))}
                                    <motion.span
                                        initial={{ opacity: 0, scale: 0.6 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.55 }}
                                        className="flex size-11 items-center justify-center rounded-full bg-pass-wash text-pass ring-[3px] ring-sheet"
                                    >
                                        <Check className="size-5" aria-hidden />
                                    </motion.span>
                                </div>
                            </Spotlight>
                            </motion.div>

                            {/* Meaning-based grading */}
                            <motion.div variants={staggerChild} whileHover={{ y: -4 }} className="rounded-[26px] border border-rule/80 bg-sheet shadow-card">
                            <Spotlight className="h-full rounded-[26px] p-7">
                                <span className="flex size-11 items-center justify-center rounded-xl bg-pen-wash text-pen"><Sparkles className="size-5" aria-hidden /></span>
                                <h3 className="mt-5 text-xl font-semibold">{l("بيفهم المعنى", "Understands meaning")}</h3>
                                <p className="mt-2 text-ink-2">{l("الطالب مش لازم يحفظ نفس الكلام. لو قال المعنى صح بأسلوبه، بياخد الدرجة.", "Students don't need your exact words. The right idea in their own words earns the marks.")}</p>
                                <p className="mt-5 rounded-xl bg-sheet-2 px-4 py-3 text-[0.9375rem] leading-loose text-ink-2">
                                    {l("آلة ", "A machine that ")}
                                    <Highlight>{l("بتحاكي تفكير الإنسان", "imitates human thinking")}</Highlight>
                                    {l(" و", " and ")}
                                    <Highlight delay={0.35}>{l("بتتعلّم من البيانات", "learns from data")}</Highlight>…
                                </p>
                            </Spotlight>
                            </motion.div>

                            {/* Proctoring */}
                            <motion.div variants={staggerChild} whileHover={{ y: -4 }} className="rounded-[26px] border border-rule/80 bg-sheet shadow-card">
                            <Spotlight className="h-full rounded-[26px] p-7">
                                <span className="flex size-11 items-center justify-center rounded-xl bg-warn-wash text-warn"><Eye className="size-5" aria-hidden /></span>
                                <h3 className="mt-5 text-xl font-semibold">{l("مراقبة عادلة", "Fair proctoring")}</h3>
                                <p className="mt-2 text-ink-2">{l("بيرصد الموبايل والكتاب والنظر بعيد لفترة طويلة. النظرة العادية مش بتتحسب.", "Detects phones, books and long looks away. Ordinary glances don't count.")}</p>
                                <Stagger as="ul" gap={0.08} className="mt-5 flex flex-wrap gap-2 text-sm">
                                    {[
                                        { icon: Smartphone, t: l("موبايل في الكادر", "Phone in view") },
                                        { icon: BookOpen, t: l("كتاب أو ورق", "Book or notes") },
                                        { icon: Users, t: l("شخص تاني", "Another person") },
                                        { icon: Eye, t: l("نظر بعيد لفترة", "Long look away") },
                                    ].map(({ icon: Icon, t }) => (
                                        <motion.li variants={staggerChild} key={t} className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-sheet-2 px-3 py-1.5 text-ink-2"><Icon className="size-4 text-warn" aria-hidden />{t}</motion.li>
                                    ))}
                                </Stagger>
                            </Spotlight>
                            </motion.div>

                            {/* Small facts */}
                            <motion.div variants={staggerChild} className="grid grid-cols-2 gap-5">
                                {[
                                    { icon: BarChart3, tone: "bg-teal-wash text-teal", title: l("تحليلات", "Analytics"), body: l("الأسئلة الأصعب على طلابك", "Your hardest questions") },
                                    { icon: FileDown, tone: "bg-pen-wash text-pen", title: l("Excel و PDF", "Excel & PDF"), body: l("صدّر النتائج واطبع الأوراق", "Export and print") },
                                    { icon: Languages, tone: "bg-violet-wash text-violet", title: l("عربي أولاً", "Arabic first"), body: l("وإنجليزي كمان", "English too") },
                                    { icon: Clock, tone: "bg-warn-wash text-warn", title: l("حضور لحظي", "Live attendance"), body: l("مين دخل ومين لسه", "Who's done, who isn't") },
                                ].map(({ icon: Icon, tone, title, body }) => (
                                    <motion.div key={title} whileHover={{ y: -4 }} className="rounded-[22px] border border-rule/80 bg-sheet p-5 shadow-card">
                                        <span className={cn("flex size-9 items-center justify-center rounded-lg", tone)}><Icon className="size-[18px]" aria-hidden /></span>
                                        <p className="mt-3 font-semibold">{title}</p>
                                        <p className="mt-0.5 text-sm text-ink-2">{body}</p>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </Stagger>
                    </section>

                    {/* ── Grading formula (navy) ── */}
                    <section
                        id="grading"
                        className="oiq-noise scroll-mt-20 bg-navy text-white"
                        style={{ backgroundImage: "radial-gradient(60% 80% at 0% 0%, color-mix(in oklab, var(--pen) 45%, transparent), transparent 60%), radial-gradient(50% 70% at 100% 100%, color-mix(in oklab, var(--violet) 35%, transparent), transparent 60%)" }}
                    >
                        <div className="mx-auto grid max-w-7xl gap-14 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.25fr]">
                            <Reveal>
                                <Eyebrow onDark>{l("التصحيح", "Grading")}</Eyebrow>
                                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-[2.6rem] sm:leading-tight">{l("الدرجة مش صندوق أسود", "The grade isn't a black box")}</h2>
                                <p className="mt-5 text-lg leading-relaxed text-white/70">
                                    {l("كل درجة معاها تفاصيلها. ولو المحتوى أقل من 50%، الطالب مايقدرش ينجح مهما كانت طلاقته.",
                                        "Every grade shows its working. If content is under 50%, the student can't pass however fluent they sound.")}
                                </p>
                                <LiveGradingDemo className="mt-10 max-w-md text-ink" />
                            </Reveal>
                            <Stagger as="dl" gap={0.15} className="space-y-4">
                                {parts.map((p) => (
                                    <motion.div variants={staggerChild} key={p.title} className="flex gap-5 rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-colors hover:bg-white/[0.07]">
                                        <dt className="w-20 shrink-0 font-display text-4xl font-extrabold tabular" style={{ color: p.color }}><CountUp to={p.pct} suffix="%" /></dt>
                                        <dd>
                                            <p className="text-lg font-semibold text-white">{p.title}</p>
                                            <p className="mt-1 leading-relaxed text-white/65">{p.body}</p>
                                        </dd>
                                    </motion.div>
                                ))}
                            </Stagger>
                        </div>
                    </section>

                    {/* ── Before / after ── */}
                    <section id="why" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-28 sm:px-6">
                        <Reveal className="mx-auto max-w-3xl text-center">
                            <Eyebrow center>{l("ليه OralIQ", "Why OralIQ")}</Eyebrow>
                            <h2 className="text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-tight">{l("نفس الامتحان الشفوي، من غير اللجنة والطابور", "The same oral exam, without the panel and the queue")}</h2>
                        </Reveal>
                        <div className="mt-14 grid items-stretch gap-5 lg:grid-cols-2">
                            <Reveal className="h-full">
                                <div className="h-full rounded-[26px] border border-rule bg-sheet-2/70 p-7 sm:p-9">
                                    <p className="flex items-center gap-3 font-display text-lg font-semibold text-ink-2">
                                        <span className="flex size-10 items-center justify-center rounded-xl bg-rule/60 text-ink-3"><Users className="size-5" aria-hidden /></span>
                                        {l("الشفوي التقليدي", "The traditional oral exam")}
                                    </p>
                                    <ul className="mt-7 space-y-4">
                                        {before.map((t) => (
                                            <li key={t} className="flex items-start gap-3 text-ink-2">
                                                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-rule/70 text-ink-3"><X className="size-3.5" aria-hidden /></span>{t}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </Reveal>
                            <Reveal delay={0.12} className="h-full">
                                <div className="relative h-full">
                                    <div className="absolute -inset-2 rounded-[32px] bg-gradient-to-br from-pen/25 via-violet/15 to-sun/20 blur-xl" aria-hidden />
                                    <div className="relative h-full rounded-[26px] border border-pen/25 bg-sheet p-7 shadow-float sm:p-9">
                                        <p className="flex items-center gap-3 font-display text-lg font-semibold">
                                            <span className="flex size-10 items-center justify-center rounded-xl bg-pen text-pen-ink"><Mic className="size-5" aria-hidden /></span>
                                            {l("مع OralIQ", "With OralIQ")}
                                        </p>
                                        <Stagger as="ul" gap={0.1} className="mt-7 space-y-4">
                                            {after.map((t) => (
                                                <motion.li variants={staggerChild} key={t} className="flex items-start gap-3 font-medium text-ink">
                                                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-pass-wash text-pass"><Check className="size-3.5" aria-hidden /></span>{t}
                                                </motion.li>
                                            ))}
                                        </Stagger>
                                    </div>
                                </div>
                            </Reveal>
                        </div>
                    </section>

                    {/* ── For lecturers / for students ── */}
                    <section className="mx-auto max-w-7xl space-y-28 px-4 py-28 sm:px-6">
                        {[
                            {
                                img: "/photos/lecturer-desk.webp", alt: l("محاضر على مكتبه قدام اللابتوب", "A lecturer at his desk with a laptop"),
                                chip: (
                                    <div className="flex items-center gap-3 rounded-2xl border border-rule/70 bg-sheet/95 py-3 pe-4 ps-3 shadow-float backdrop-blur">
                                        <span className="flex size-10 items-center justify-center rounded-xl bg-pen-wash text-pen"><Inbox className="size-5" aria-hidden /></span>
                                        <div className="leading-tight">
                                            <p className="text-sm font-semibold">{l("7 إجابات جديدة اتصححت", "7 new answers graded")}</p>
                                            <p className="mt-1 text-xs text-ink-3">{l("واحدة بس محتاجة نظرة منك", "Only one needs a look")}</p>
                                        </div>
                                    </div>
                                ),
                                title: l("للمحاضر: وقتك للتدريس، مش للتصحيح", "For lecturers: teach, don't grade all night"),
                                points: [l("امتحان شفوي لـ 200 طالب من غير ما تسمع 200 تسجيل", "Oral exams for 200 students without listening to 200 recordings"), l("ملاحظات النزاهة والهوية قدامك قبل ما تنشر", "Integrity and identity notes before you publish"), l("صدّر Excel أو اطبع ورقة كل طالب", "Export to Excel or print each answer sheet")],
                            },
                            {
                                img: "/photos/student-library.webp", alt: l("طالبة مبتسمة في مكتبة الجامعة", "A smiling student in the university library"),
                                chip: (
                                    <div className="flex items-center gap-3 rounded-2xl border border-rule/70 bg-sheet/95 py-3 pe-4 ps-3 shadow-float backdrop-blur">
                                        <span className="flex size-10 items-center justify-center rounded-xl bg-pass-wash text-pass"><Check className="size-5" aria-hidden /></span>
                                        <div className="leading-tight">
                                            <p className="text-sm font-semibold">{l("درجتك اتنشرت", "Your grade is out")}</p>
                                            <p className="mt-1 text-xs text-ink-3">{l("تعريف الذكاء الاصطناعي", "Defining AI")} · <span className="font-semibold text-pass tabular" dir="ltr">91.5%</span></p>
                                        </div>
                                    </div>
                                ),
                                title: l("للطالب: امتحان شفوي من غير رهبة اللجنة", "For students: oral exams without the panel nerves"),
                                points: [l("يجاوب من بيته على الموبايل أو اللابتوب", "Answer from home on a phone or laptop"), l("يشوف درجته وتفاصيلها أول ما المحاضر ينشرها", "See the grade and its breakdown once published"), l("يعرف هو كان متردد فين وإزاي يتحسن", "Learn where they hesitated and how to improve")],
                            },
                        ].map((b, i) => (
                            <div key={b.title} className={cn("grid items-center gap-12 lg:grid-cols-2", i === 1 && "lg:[&>*:first-child]:order-2")}>
                                <div className="relative">
                                    <div className="absolute -inset-3 rounded-[36px] bg-gradient-to-br from-pen/15 to-violet/10 blur-xl" aria-hidden />
                                    <motion.div
                                        initial={{ clipPath: "inset(12% 12% 12% 12% round 28px)", opacity: 0.4 }}
                                        whileInView={{ clipPath: "inset(0% 0% 0% 0% round 28px)", opacity: 1 }}
                                        viewport={{ once: true, amount: 0.35 }}
                                        transition={{ duration: 1.2, ease: EASE }}
                                        className="relative overflow-hidden rounded-[28px] shadow-float"
                                    >
                                        <motion.img
                                            src={b.img} alt={b.alt} width={1200} height={750} loading="lazy"
                                            srcSet={`${b.img.replace(".webp", "-640.webp")} 640w, ${b.img} 1200w`}
                                            sizes="(min-width: 1024px) 600px, 92vw"
                                            initial={{ scale: 1.2 }}
                                            whileInView={{ scale: 1 }}
                                            viewport={{ once: true, amount: 0.35 }}
                                            transition={{ duration: 1.6, ease: EASE }}
                                            className="block aspect-[16/11] w-full object-cover"
                                        />
                                    </motion.div>
                                    <motion.div
                                        initial={{ opacity: 0, y: 24, scale: 0.95 }}
                                        whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                        viewport={{ once: true, amount: 0.6 }}
                                        transition={{ duration: 0.8, ease: EASE, delay: 0.5 }}
                                        className={cn("absolute -bottom-7 motion-safe:[&>div]:animate-[oiq-float_7s_ease-in-out_infinite]", i === 0 ? "start-4 sm:-start-6" : "end-4 sm:-end-6")}
                                    >
                                        {b.chip}
                                    </motion.div>
                                </div>
                                <div>
                                    <Reveal>
                                        <h2 className="text-3xl font-bold tracking-tight sm:text-[2.3rem] sm:leading-tight">{b.title}</h2>
                                    </Reveal>
                                    <Stagger as="ul" gap={0.12} className="mt-7 space-y-4">
                                        {b.points.map((p) => (
                                            <motion.li variants={staggerChild} key={p} className="flex items-start gap-3 text-lg text-ink-2">
                                                <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-pen text-pen-ink"><Check className="size-4" aria-hidden /></span>{p}
                                            </motion.li>
                                        ))}
                                    </Stagger>
                                </div>
                            </div>
                        ))}
                    </section>

                    {/* ── FAQ ── */}
                    <section id="faq" className="mx-auto max-w-4xl scroll-mt-20 px-4 pb-28 sm:px-6">
                        <Reveal className="text-center">
                            <Eyebrow center>{l("أسئلة شائعة", "FAQ")}</Eyebrow>
                            <h2 className="text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-tight">{l("أسئلة بتتسأل كتير", "Questions we hear a lot")}</h2>
                        </Reveal>
                        <Stagger gap={0.07} amount={0.1} className="mt-12 space-y-3">
                            {faqs.map((f) => (
                                <motion.details variants={staggerChild} key={f.q} className="group rounded-2xl border border-rule bg-sheet px-5 shadow-card transition-shadow open:shadow-float sm:px-7">
                                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-display text-[1.0625rem] font-semibold [&::-webkit-details-marker]:hidden">
                                        {f.q}
                                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pen-wash text-pen transition-transform duration-300 group-open:rotate-45" aria-hidden><Plus className="size-4" /></span>
                                    </summary>
                                    <p className="pb-6 leading-relaxed text-ink-2">{f.a}</p>
                                </motion.details>
                            ))}
                        </Stagger>
                    </section>

                    {/* ── Contact + team ── */}
                    <section id="contact" className="scroll-mt-20 border-t border-rule/70 bg-sheet">
                        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
                            <Reveal>
                                <h2 className="text-3xl font-bold tracking-tight sm:text-[2.4rem] sm:leading-tight">{l("عايز تجرّبه في مؤسستك؟", "Want it for your institution?")}</h2>
                                <p className="mt-4 text-lg leading-relaxed text-ink-2">
                                    {l("بنجهّز OralIQ للجامعات والمدارس ومراكز التدريب. كلّمنا ونرتب معاك تجربة على امتحان حقيقي.", "We set OralIQ up for universities, schools and training centres. Get in touch and we'll arrange a trial on a real exam.")}
                                </p>
                                <ul className="mt-8 space-y-3 text-ink-2">
                                    <li className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-pen-wash text-pen"><Mail className="size-5" aria-hidden /></span><a className="ltr hover:text-pen" href="mailto:ahmedsalem250500@gmail.com">ahmedsalem250500@gmail.com</a></li>
                                    <li className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-pen-wash text-pen"><Phone className="size-5" aria-hidden /></span><a className="ltr hover:text-pen" href="tel:+201065407502">+20 106 540 7502</a></li>
                                    <li className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-pen-wash text-pen"><MapPin className="size-5" aria-hidden /></span>{l("المنصورة، مصر", "Mansoura, Egypt")}</li>
                                </ul>
                            </Reveal>
                            <div>
                                <Reveal><h3 className="mb-4 text-lg font-semibold">{l("فريق OralIQ", "The OralIQ team")}</h3></Reveal>
                                <Stagger as="ul" gap={0.08} className="grid gap-3 sm:grid-cols-2">
                                    {TEAM.map((m) => (
                                        <motion.li variants={staggerChild} whileHover={{ y: -3 }} key={m.name} className="flex items-center gap-4 rounded-2xl border border-rule/80 bg-paper/60 p-4">
                                            <Avatar name={m.name} size="lg" />
                                            <div>
                                                <p className="font-semibold" dir="ltr">{m.name}</p>
                                                <p className="text-sm text-ink-2">{l(m.role.ar, m.role.en)}</p>
                                            </div>
                                        </motion.li>
                                    ))}
                                </Stagger>
                            </div>
                        </div>
                    </section>

                    {/* ── Closing CTA ── */}
                    <section className="px-4 py-20 sm:px-6">
                        <motion.div
                            initial={{ opacity: 0, y: 40, scale: 0.96 }}
                            whileInView={{ opacity: 1, y: 0, scale: 1 }}
                            viewport={{ once: true, amount: 0.4 }}
                            transition={{ duration: 0.9, ease: EASE }}
                            className="oiq-noise relative mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-navy px-8 py-14 text-white shadow-float sm:px-14"
                            style={{ backgroundImage: "radial-gradient(70% 120% at 100% 0%, color-mix(in oklab, var(--pen) 70%, transparent), transparent 60%)" }}
                        >
                            <Wave bars={90} className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full text-white/[0.07]" />
                            <div className="relative grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
                                <div className="max-w-xl">
                                    <h2 className="text-3xl font-bold tracking-tight text-white sm:text-[2.6rem] sm:leading-tight">{l("جرّبه في امتحانك الشفوي الجاي.", "Try it on your next oral exam.")}</h2>
                                    <p className="mt-3 text-lg text-white/70">{l("أنشئ حساب محاضر، واكتب أول سؤال في أقل من دقيقتين. وطلابك يجاوبوا من أي مكان.", "Create a lecturer account and write your first question in under two minutes. Your students answer from anywhere.")}</p>
                                    <div className="mt-8 flex flex-wrap gap-3">
                                        <ButtonLink to={startHref} viewTransition size="lg" className="h-[3.25rem] bg-white px-7 text-[1.0625rem] text-navy shadow-none hover:bg-white/90">{l("أنشئ حساب محاضر", "Create a lecturer account")}</ButtonLink>
                                        <a href="#contact" className={buttonClasses("secondary", "lg", "h-[3.25rem] border-white/25 bg-white/10 px-7 text-[1.0625rem] text-white hover:border-white/40 hover:bg-white/15")}>{l("كلّمنا", "Talk to us")}</a>
                                    </div>
                                </div>
                                <div className="relative mx-auto hidden w-full max-w-sm lg:block">
                                    <motion.img
                                        src="/photos/student-waving-640.webp"
                                        srcSet="/photos/student-waving-640.webp 640w, /photos/student-waving.webp 1200w"
                                        sizes="384px"
                                        alt={l("طالبة بتسلّم على الكاميرا قبل امتحانها", "A student waving to the camera before her exam")}
                                        loading="lazy"
                                        initial={{ rotate: 0, opacity: 0, y: 30 }}
                                        whileInView={{ rotate: -3, opacity: 1, y: 0 }}
                                        viewport={{ once: true, amount: 0.5 }}
                                        transition={{ duration: 1, ease: EASE, delay: 0.2 }}
                                        className="aspect-[4/3] w-full rounded-[24px] object-cover shadow-float ring-4 ring-white/10"
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.85 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true, amount: 0.5 }}
                                        transition={{ type: "spring", stiffness: 240, damping: 18, delay: 0.7 }}
                                        className="absolute -bottom-5 start-[-1.5rem] flex items-center gap-2.5 rounded-2xl bg-white py-2.5 pe-4 ps-2.5 text-navy shadow-float"
                                    >
                                        <span className="flex size-9 items-center justify-center rounded-xl bg-pass-wash text-pass"><Check className="size-5" aria-hidden /></span>
                                        <span className="text-sm font-semibold">{l("جاهزة للامتحان", "Ready for the exam")}</span>
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    </section>
                </main>

                <footer className="border-t border-rule/70 bg-sheet">
                    <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.6fr_1fr_1fr]">
                        <div className="col-span-2 md:col-span-1">
                            <Logo size={30} />
                            <p className="mt-4 max-w-sm leading-relaxed text-ink-2">{l("أول منصة عربية للامتحانات الشفوية أونلاين: الطالب يجاوب بصوته، والتصحيح يوصل جاهز.", "The first Arabic platform for online oral exams: students answer out loud, and the grading arrives done.")}</p>
                        </div>
                        <nav aria-label={l("المنتج", "Product")}>
                            <p className="font-semibold">{l("المنتج", "Product")}</p>
                            <ul className="mt-4 space-y-2.5 text-ink-2">
                                <li><a href="#how" className="hover:text-pen">{l("إزاي بيشتغل", "How it works")}</a></li>
                                <li><a href="#features" className="hover:text-pen">{l("المميزات", "Features")}</a></li>
                                <li><a href="#grading" className="hover:text-pen">{l("التصحيح", "Grading")}</a></li>
                                <li><a href="#faq" className="hover:text-pen">{l("أسئلة شائعة", "FAQ")}</a></li>
                            </ul>
                        </nav>
                        <nav aria-label={l("ابدأ", "Get started")}>
                            <p className="font-semibold">{l("ابدأ", "Get started")}</p>
                            <ul className="mt-4 space-y-2.5 text-ink-2">
                                <li><Link to="/register" className="hover:text-pen">{l("أنشئ حساب", "Create account")}</Link></li>
                                <li><Link to="/login" className="hover:text-pen">{l("تسجيل الدخول", "Sign in")}</Link></li>
                                <li><a href="#contact" className="hover:text-pen">{l("تواصل معنا", "Contact")}</a></li>
                            </ul>
                        </nav>
                    </div>
                    <div className="border-t border-rule/70">
                        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-ink-3 sm:px-6">
                            <p>© 2026 OralIQ</p>
                            <p>{l("مبني بـ Whisper وSentence-BERT وInsightFace وMediaPipe", "Built with Whisper, Sentence-BERT, InsightFace and MediaPipe")}</p>
                        </div>
                    </div>
                </footer>
            </div>
        </MotionConfig>
    );
}

/** Marker-pen highlight that sweeps across the words when they scroll into view. */
function Highlight({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
    return (
        <span className="relative inline-block px-1 text-pen">
            <motion.span
                aria-hidden
                className="absolute inset-0 -z-0 rounded bg-pen-wash ltr:origin-left rtl:origin-right"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, amount: 0.8 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.3 + delay }}
            />
            <span className="relative">{children}</span>
        </span>
    );
}
