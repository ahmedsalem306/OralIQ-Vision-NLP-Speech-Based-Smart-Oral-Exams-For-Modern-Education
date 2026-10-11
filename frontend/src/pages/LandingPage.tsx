import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MotionConfig, useMotionValueEvent } from "motion/react";
import {
    BarChart3, BookOpen, Check, Clock, Eye, FileDown, Inbox, Languages, Mail, MapPin, Phone, Plus, Smartphone, Users, X,
} from "lucide-react";
import { useI18n } from "../i18n";
import { cn } from "../lib/utils";
import Logo from "../components/Logo";
import LanguageToggle, { ThemeToggle } from "../components/LanguageToggle";
import { ButtonLink, buttonClasses } from "../components/ui/button";
import { Avatar } from "../components/ui/avatar";
import { LiveGradingDemo } from "../components/landing/LiveGradingDemo";
import { HeroStage } from "../components/landing/HeroStage";
import { ClientsStrip } from "../components/landing/ClientsStrip";
import { IntegrationSection } from "../components/landing/IntegrationSection";
import { usePageTitle } from "../lib/usePageTitle";
import {
    EASE, ScrollProgress, motion, useEnterProgress, useScroll, useSpring, useTransform,
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

/** A real screenshot of the product. No fake window chrome: the page itself is the frame. */
function ProductShot({ src, alt, narrowSrc }: { src: string; alt: string; /** A readable crop for phones. */ narrowSrc?: string }) {
    return (
        <picture className="block overflow-hidden rounded-[18px] border border-rule bg-sheet shadow-float">
            {narrowSrc && <source media="(max-width: 639px)" srcSet={narrowSrc} width={746} height={1000} />}
            <img src={src} alt={alt} width={1920} height={1200} loading="lazy" className="block w-full" />
        </picture>
    );
}

/** Step number circled in ballpoint blue: the same hand-drawn loop as the grade mark, for a real sequence. */
function StepNumber({ n }: { n: number }) {
    return (
        <span className="relative flex h-12 w-16 items-center justify-center">
            <svg viewBox="-6 -4 132 88" preserveAspectRatio="none" className="absolute inset-0 h-full w-full -rotate-3 overflow-visible text-pen" aria-hidden>
                <path d="M92 10C113 17 121 44 102 62C82 80 33 80 14 63C-3 48 6 19 33 9C53 2 80 3 98 15" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" />
            </svg>
            <span className="relative font-display text-xl font-bold text-pen tabular">{n}</span>
        </span>
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

/* ───────────────────────────────── page ───────────────────────────────── */

export default function LandingPage() {
    const { l } = useI18n();
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

    const steps = [
        { title: l("اكتب السؤال والإجابة النموذجية", "Write the question and model answer"), body: l("بالكتابة أو بصوتك. حدد الوقت والصعوبة والكلمات المفتاحية.", "Type or dictate it. Set the time, difficulty and key terms.") },
        { title: l("ابعت رابط الامتحان", "Send the exam link"), body: l("رابط واحد للامتحان كله على جروب المادة، أو لطلاب بعينهم.", "One link for the whole exam — to the class group or specific students.") },
        { title: l("الطالب يجاوب بصوته", "Students answer out loud"), body: l("من الموبايل أو اللابتوب، والكاميرا بتتأكد من هويته.", "From a phone or laptop, while the camera confirms who's answering.") },
        { title: l("الدرجة توصلك جاهزة", "The grade arrives, ready"), body: l("مع نص الإجابة وتفاصيل الدرجة. تراجع وتنشر بضغطة.", "With the transcript and a breakdown. Review and publish in one click.") },
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
    const audiences = [
        {
            img: "/photos/lecturer-desk.webp", alt: l("محاضر على مكتبه قدام اللابتوب", "A lecturer at his desk with a laptop"),
            chip: (
                <div className="flex items-center gap-3 rounded-2xl border border-rule bg-sheet py-3 pe-4 ps-3 shadow-float">
                    <Inbox className="size-5 text-pen" aria-hidden />
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
                <div className="flex items-center gap-3 rounded-2xl border border-rule bg-sheet py-3 pe-4 ps-3 shadow-float">
                    <Check className="size-5 text-pass" aria-hidden />
                    <div className="leading-tight">
                        <p className="text-sm font-semibold">{l("درجتك اتنشرت", "Your grade is out")}</p>
                        <p className="mt-1 text-xs text-ink-3">{l("تعريف الذكاء الاصطناعي: ", "Defining AI: ")}<span className="font-semibold text-pass tabular" dir="ltr">91.5%</span></p>
                    </div>
                </div>
            ),
            title: l("للطالب: امتحان شفوي من غير رهبة اللجنة", "For students: oral exams without the panel nerves"),
            points: [l("يجاوب من بيته على الموبايل أو اللابتوب", "Answer from home on a phone or laptop"), l("يشوف درجته وتفاصيلها أول ما المحاضر ينشرها", "See the grade and its breakdown once published"), l("يعرف هو كان متردد فين وإزاي يتحسن", "Learn where they hesitated and how to improve")],
        },
    ];
    const faqs = [
        { q: l("الطالب محتاج يسطّب برنامج؟", "Do students need to install anything?"), a: l("لأ. بيفتح رابط الامتحان من المتصفح على الموبايل أو اللابتوب، ويسمح بالكاميرا والميكروفون، وخلاص.", "No. They open the exam link in a browser on a phone or laptop, allow the camera and microphone, and that's it.") },
        { q: l("الدرجة بتتحسب إزاي؟", "How is the grade calculated?"), a: l("80% للمحتوى (معنى الإجابة مقارنةً بإجابتك النموذجية)، و10% للطلاقة، و10% للنزاهة. ولو المحتوى أقل من 50%، الطالب مايقدرش ينجح مهما كانت طلاقته.", "80% content (the answer's meaning against your model answer), 10% fluency and 10% integrity. If content is under 50%, the student can't pass however fluent they are.") },
        { q: l("لو الطالب جاوب صح بأسلوبه هو؟", "What if a student answers correctly in their own words?"), a: l("بياخد حقه. التصحيح بيقارن المعنى، مش الكلمات بالحرف، فمش لازم يحفظ نص الكتاب.", "They get the credit. Grading compares meaning, not exact wording, so there's no need to recite the book.") },
        { q: l("إزاي بتتأكدوا إن الطالب هو اللي بيجاوب؟", "How do you know the right student is answering?"), a: l("الطالب بيسجّل وشه وصوته مرة واحدة، وفي كل امتحان بيتقارنوا. لو في اختلاف، الإجابة بتتعلّم «مراجعة» عشان المحاضر يشوفها.", "Each student registers their face and voice once, and both are checked on every exam. If something doesn't match, the answer is flagged for the lecturer to review.") },
        { q: l("الطالب بيشوف درجته إمتى؟", "When does a student see their grade?"), a: l("بعد ما المحاضر يراجعها وينشرها. لحد كده الدرجة بتفضل مخفية عن الطالب.", "Once the lecturer has reviewed and published it. Until then it stays hidden from the student.") },
        { q: l("ينفع أضيف OralIQ لموقعي بدل ما أستخدم منصتكم؟", "Can I add OralIQ to my own website instead?"), a: l("أيوه. لو عندك موقع أو منصة تعليمية، بنتفق معاك على طريقة الربط ونضيف الامتحان الشفوي جوّاها بشكل موقعك، والطالب يمتحن من غير ما يخرج منه. كلّمنا ونشوف المناسب ليك.", "Yes. If you have a website or learning platform, we agree the setup with you and add the oral exam inside it, in your site's look, so students never leave it. Get in touch and we'll find what suits you.") },
        { q: l("بيشتغل بالعربي بس؟", "Is it Arabic only?"), a: l("لأ، عربي وإنجليزي، في الواجهة وفي الإجابات.", "No — Arabic and English, in the interface and in the answers.") },
    ];

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
                            <a href="#grading" className={buttonClasses("ghost", "sm")}>{l("التصحيح", "Grading")}</a>
                            <a href="#features" className={buttonClasses("ghost", "sm")}>{l("المميزات", "Features")}</a>
                            <a href="#integrate" className={buttonClasses("ghost", "sm")}>{l("لموقعك", "For your site")}</a>
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
                    <HeroStage startHref={startHref} />

                    {/* ── How it works: a real sequence, so it is numbered ── */}
                    <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-24 pt-24 sm:px-6">
                        <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-tight">{l("من السؤال للدرجة في أربع خطوات", "From question to grade in four steps")}</h2>
                        <div className="relative mt-14">
                            {/* The line fills as the section crosses the screen (desktop) */}
                            <div className="absolute inset-x-0 top-6 hidden h-0.5 overflow-hidden bg-rule lg:block" aria-hidden>
                                <motion.div style={{ scaleX: stepsFill }} className="h-full origin-[0%] bg-pen rtl:origin-[100%]" />
                            </div>
                            <ol ref={stepsRef} className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
                                {steps.map((st, i) => (
                                    <li key={st.title}>
                                        <span className="inline-flex bg-paper pe-3"><StepNumber n={i + 1} /></span>
                                        <h3 className="mt-4 text-lg font-semibold">{st.title}</h3>
                                        <p className="mt-2 leading-relaxed text-ink-2">{st.body}</p>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </section>

                    {/* ── Product: the answer sheet (the page's one scroll moment) ── */}
                    <section className="border-y border-rule/70 bg-sheet">
                        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
                            <div className="mx-auto max-w-3xl text-center">
                                <h2 className="text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-tight">{l("كل إجابة بتوصلك مصححة، ومعاها السبب", "Every answer arrives graded, with the reasons")}</h2>
                                <p className="mt-4 text-lg text-ink-2">{l("نص كلام الطالب، ونصيب كل جزء من الدرجة، والتحقق من الهوية. تراجع، وتنشر الدرجة بضغطة، أو تطبعها PDF.", "The student's words, what each part contributed, and the identity check. Review, publish in one click, or print to PDF.")}</p>
                            </div>
                            <div ref={productRef} className="mt-14 [perspective:1600px]">
                                <motion.div style={{ rotateX: tilt, scale: tiltScale, y: tiltY, transformOrigin: "50% 0%" }}>
                                    <ProductShot src="/screens/results.webp" narrowSrc="/screens/results-sheet.webp" alt={l("صفحة النتائج وورقة إجابة طالب", "The results page with a student's answer sheet open")} />
                                </motion.div>
                                <p className="mt-4 text-center text-sm text-ink-3">{l("صفحة النتائج عند المحاضر، وفيها ورقة إجابة طالب مفتوحة.", "The lecturer's results page, with one student's answer sheet open.")}</p>
                            </div>
                        </div>
                    </section>

                    {/* ── Grading formula (navy) ── */}
                    <section
                        id="grading"
                        className="oiq-noise scroll-mt-20 bg-navy text-white"
                        style={{ backgroundImage: "radial-gradient(60% 80% at 0% 0%, color-mix(in oklab, var(--pen) 40%, transparent), transparent 60%)" }}
                    >
                        <div className="mx-auto grid max-w-7xl gap-14 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.25fr]">
                            <div>
                                <h2 className="text-white text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-tight">{l("الدرجة مش صندوق أسود", "The grade isn't a black box")}</h2>
                                <p className="mt-5 text-lg leading-relaxed text-white/70">
                                    {l("كل درجة معاها تفاصيلها. ولو المحتوى أقل من 50%، الطالب مايقدرش ينجح مهما كانت طلاقته.",
                                        "Every grade shows its working. If content is under 50%, the student can't pass however fluent they sound.")}
                                </p>
                                <LiveGradingDemo className="mt-10 max-w-md text-ink" />
                            </div>
                            <dl className="space-y-4 self-center">
                                {parts.map((pt) => (
                                    <div key={pt.title} className="flex gap-5 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                                        <dt className="w-20 shrink-0 font-display text-4xl font-extrabold tabular" style={{ color: pt.color }} dir="ltr">{pt.pct}%</dt>
                                        <dd>
                                            <p className="text-lg font-semibold text-white">{pt.title}</p>
                                            <p className="mt-1 leading-relaxed text-white/65">{pt.body}</p>
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    </section>

                    {/* ── Features: sizes follow importance; no icon chips, the content is the picture ── */}
                    <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6">
                        <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-tight">{l("كل اللي امتحان شفوي محتاجه، في مكان واحد", "Everything an oral exam needs, in one place")}</h2>
                        <div className="mt-12 grid gap-5 lg:grid-cols-3">
                            {/* Phone */}
                            <div
                                className="relative overflow-hidden rounded-[26px] bg-navy p-8 pb-0 text-white lg:row-span-2"
                                style={{ backgroundImage: "radial-gradient(90% 60% at 100% 0%, color-mix(in oklab, var(--pen) 45%, transparent), transparent 60%)" }}
                            >
                                <h3 className="text-2xl font-bold text-white">{l("يجاوب من موبايله", "Answers from their phone")}</h3>
                                <p className="mt-2 max-w-sm text-white/70">{l("مفيش برنامج يتسطّب. السؤال، والتايمر، والكاميرا كلهم في صفحة واحدة مصممة للموبايل.", "Nothing to install. Question, timer and camera on one screen built for phones.")}</p>
                                <div className="mx-auto mt-8 h-[440px] w-[min(270px,80%)] overflow-hidden">
                                    <PhoneFrame src="/screens/exam-mobile.webp" alt={l("أوضة الامتحان على الموبايل", "The exam room on a phone")} />
                                </div>
                            </div>

                            {/* Identity */}
                            <div className="rounded-[26px] border border-rule bg-sheet p-7">
                                <h3 className="text-xl font-semibold">{l("الوش والصوت لازم يطابقوا", "Face and voice must match")}</h3>
                                <p className="mt-2 text-ink-2">{l("بصمة بتتسجل مرة واحدة، وتتقارن في كل امتحان. لو واحدة بس طابقت، الإجابة بتتعلّم «مراجعة».", "Registered once, checked every exam. If only one matches, the answer is flagged for review.")}</p>
                                <div className="mt-5 flex -space-x-3 rtl:space-x-reverse">
                                    {["/photos/chip-smile.webp", "/photos/chip-student.webp", "/photos/chip-lecturer-desk.webp"].map((src) => (
                                        <img key={src} src={src} alt="" loading="lazy" className="size-11 rounded-full object-cover ring-[3px] ring-sheet" />
                                    ))}
                                    <span className="flex size-11 items-center justify-center rounded-full bg-pass-wash text-pass ring-[3px] ring-sheet"><Check className="size-5" aria-hidden /></span>
                                </div>
                            </div>

                            {/* Meaning-based grading */}
                            <div className="rounded-[26px] border border-rule bg-sheet p-7">
                                <h3 className="text-xl font-semibold">{l("بيفهم المعنى", "Understands meaning")}</h3>
                                <p className="mt-2 text-ink-2">{l("الطالب مش لازم يحفظ نفس الكلام. لو قال المعنى صح بأسلوبه، بياخد الدرجة.", "Students don't need your exact words. The right idea in their own words earns the marks.")}</p>
                                <p className="mt-5 rounded-xl bg-sheet-2 px-4 py-3 text-[0.9375rem] leading-loose text-ink-2">
                                    {l("آلة ", "A machine that ")}
                                    <Highlight>{l("بتحاكي تفكير الإنسان", "imitates human thinking")}</Highlight>
                                    {l(" و", " and ")}
                                    <Highlight delay={0.35}>{l("بتتعلّم من البيانات", "learns from data")}</Highlight>…
                                </p>
                            </div>

                            {/* Proctoring */}
                            <div className="rounded-[26px] border border-rule bg-sheet p-7">
                                <h3 className="text-xl font-semibold">{l("مراقبة عادلة", "Fair proctoring")}</h3>
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

                            {/* And also: one list, not four look-alike cards */}
                            <div className="rounded-[26px] border border-rule bg-sheet-2 p-7">
                                <h3 className="text-xl font-semibold">{l("وكمان", "And also")}</h3>
                                <dl className="mt-4 divide-y divide-rule">
                                    {[
                                        { icon: BarChart3, title: l("تحليلات", "Analytics"), body: l("الأسئلة الأصعب على طلابك", "Your hardest questions") },
                                        { icon: FileDown, title: l("Excel و PDF", "Excel & PDF"), body: l("صدّر النتائج واطبع الأوراق", "Export and print") },
                                        { icon: Clock, title: l("حضور لحظي", "Live attendance"), body: l("مين دخل ومين لسه", "Who's done, who isn't") },
                                        { icon: Languages, title: l("عربي أولاً", "Arabic first"), body: l("وإنجليزي كمان", "English too") },
                                    ].map(({ icon: Icon, title, body }) => (
                                        <div key={title} className="flex items-center gap-3 py-2.5">
                                            <Icon className="size-[18px] shrink-0 text-ink-3" aria-hidden />
                                            <dt className="font-semibold">{title}</dt>
                                            <dd className="ms-auto text-sm text-ink-2">{body}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        </div>
                    </section>

                    {/* ── Why: the old way against this one, then who it is for ── */}
                    <section id="why" className="scroll-mt-20 border-t border-rule/70 bg-sheet">
                        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
                            <h2 className="mx-auto max-w-3xl text-center text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-tight">{l("نفس الامتحان الشفوي، من غير اللجنة والطابور", "The same oral exam, without the panel and the queue")}</h2>
                            <div className="mt-12 grid items-stretch gap-5 lg:grid-cols-2">
                                <div className="rounded-[26px] border border-rule bg-paper p-7 sm:p-9">
                                    <h3 className="font-display text-lg font-semibold text-ink-2">{l("الشفوي التقليدي", "The traditional oral exam")}</h3>
                                    <ul className="mt-6 space-y-4">
                                        {before.map((t) => (
                                            <li key={t} className="flex items-start gap-3 text-ink-2">
                                                <X className="mt-1 size-4 shrink-0 text-ink-3" aria-hidden />{t}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="rounded-[26px] border-2 border-pen/40 bg-sheet p-7 shadow-float sm:p-9">
                                    <h3 className="font-display text-lg font-semibold text-pen">{l("مع OralIQ", "With OralIQ")}</h3>
                                    <ul className="mt-6 space-y-4">
                                        {after.map((t) => (
                                            <li key={t} className="flex items-start gap-3 font-medium text-ink">
                                                <Check className="mt-1 size-4 shrink-0 text-pass" aria-hidden />{t}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="mt-20 grid gap-14 lg:grid-cols-2 lg:gap-10">
                                {audiences.map((a) => (
                                    <article key={a.title}>
                                        <div className="relative">
                                            <img
                                                src={a.img} alt={a.alt} width={1200} height={750} loading="lazy"
                                                srcSet={`${a.img.replace(".webp", "-640.webp")} 640w, ${a.img} 1200w`}
                                                sizes="(min-width: 1024px) 560px, 92vw"
                                                className="block aspect-[16/10] w-full rounded-[22px] object-cover shadow-card"
                                            />
                                            <div className="absolute -bottom-7 start-4 sm:start-6">{a.chip}</div>
                                        </div>
                                        <h3 className="mt-14 text-2xl font-bold tracking-tight">{a.title}</h3>
                                        <ul className="mt-5 space-y-3">
                                            {a.points.map((pt) => (
                                                <li key={pt} className="flex items-start gap-3 text-ink-2">
                                                    <Check className="mt-1 size-4 shrink-0 text-pen" aria-hidden />{pt}
                                                </li>
                                            ))}
                                        </ul>
                                    </article>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* ── Who uses it (real clients only; see content/clients.ts) ── */}
                    <ClientsStrip />

                    {/* ── Two ways to work with us: the platform, or inside the client's site ── */}
                    <IntegrationSection />

                    {/* ── FAQ ── */}
                    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-24 sm:px-6">
                        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-tight">{l("أسئلة بتتسأل كتير", "Questions we hear a lot")}</h2>
                        <div className="mt-12 space-y-3">
                            {faqs.map((f) => (
                                <details key={f.q} className="group rounded-2xl border border-rule bg-sheet px-5 sm:px-7">
                                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-display text-[1.0625rem] font-semibold [&::-webkit-details-marker]:hidden">
                                        {f.q}
                                        <Plus className="size-5 shrink-0 text-pen transition-transform duration-300 group-open:rotate-45" aria-hidden />
                                    </summary>
                                    <p className="pb-6 leading-relaxed text-ink-2">{f.a}</p>
                                </details>
                            ))}
                        </div>
                    </section>

                    {/* ── Contact + team ── */}
                    <section id="contact" className="scroll-mt-20 border-y border-rule/70 bg-sheet">
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
                                    <img
                                        src="/photos/student-waving-640.webp"
                                        srcSet="/photos/student-waving-640.webp 640w, /photos/student-waving.webp 1200w"
                                        sizes="384px"
                                        alt={l("طالبة بتسلّم على الكاميرا قبل امتحانها", "A student waving to the camera before her exam")}
                                        loading="lazy"
                                        className="aspect-[4/3] w-full -rotate-3 rounded-[24px] object-cover shadow-float ring-4 ring-white/10"
                                    />
                                    <div
                                        className="absolute -bottom-5 start-[-1.5rem] flex items-center gap-2.5 rounded-2xl bg-white py-2.5 pe-4 ps-2.5 text-navy shadow-float"
                                    >
                                        <span className="flex size-9 items-center justify-center rounded-xl bg-pass-wash text-pass"><Check className="size-5" aria-hidden /></span>
                                        <span className="text-sm font-semibold">{l("جاهزة للامتحان", "Ready for the exam")}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
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
                                <li><a href="#grading" className="hover:text-pen">{l("التصحيح", "Grading")}</a></li>
                                <li><a href="#features" className="hover:text-pen">{l("المميزات", "Features")}</a></li>
                                <li><a href="#integrate" className="hover:text-pen">{l("إضافته لموقعك", "Add it to your site")}</a></li>
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
