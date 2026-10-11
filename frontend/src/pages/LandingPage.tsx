import { Link } from "react-router-dom";
import { Mail, MapPin, Mic, Phone, ScanFace, ShieldCheck } from "lucide-react";
import { useI18n } from "../i18n";
import Logo from "../components/Logo";
import LanguageToggle, { ThemeToggle } from "../components/LanguageToggle";
import { ButtonLink, buttonClasses } from "../components/ui/button";
import { SampleSheet } from "../components/AuthShell";
import { Avatar } from "../components/ui/avatar";

const RULED = { backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 39px, var(--rule) 39px, var(--rule) 40px)" };

const TEAM = [
    { name: "Ahmed Salem", role: { ar: "قائد الفريق", en: "Team leader" } },
    { name: "Afaf Walid", role: { ar: "تطوير", en: "Developer" } },
    { name: "Mohamed Gamal", role: { ar: "تطوير", en: "Developer" } },
    { name: "Roqaia Mohamed", role: { ar: "تطوير", en: "Developer" } },
];

export default function LandingPage() {
    const { l, lang } = useI18n();
    let loggedIn = false;
    try { loggedIn = !!localStorage.getItem("token"); } catch { /* ignore */ }

    const steps = [
        { title: l("اكتب السؤال وإجابته النموذجية", "Write the question and its model answer"), body: l("بالكتابة أو بصوتك. حدد الوقت والصعوبة، ولو حابب كلمات مفتاحية لازم تيجي في الإجابة.", "Type it or dictate it. Set the time and difficulty, plus any keywords the answer must mention.") },
        { title: l("ابعت رابط الامتحان", "Send the exam link"), body: l("رابط واحد للامتحان كله، أو ابعته لطالب معيّن فيظهر عنده في دعوات الامتحانات.", "One link for the whole exam, or send it to specific students so it lands in their invites.") },
        { title: l("الطالب يجاوب بصوته", "Students answer out loud"), body: l("من الموبايل أو اللابتوب. السؤال بيظهر لما يبدأ، والكاميرا بتتأكد من هويته طول الإجابة.", "On a phone or laptop. The question appears when they start, and the camera confirms who's answering.") },
        { title: l("الدرجة توصلك بالتفاصيل", "You get the grade, with reasons"), body: l("نص الإجابة، ودرجة المحتوى والطلاقة والنزاهة. تراجع وتنشر الدرجة للطالب بضغطة.", "The transcript, plus content, fluency and integrity scores. Review, then publish to the student in one click.") },
    ];

    const parts = [
        { pct: 80, title: l("المحتوى", "Content"), body: l("بنقارن معنى كلام الطالب بإجابتك النموذجية (Sentence-BERT)، مع مطابقة الكلمات المفتاحية. التصحيح متسامح مع أخطاء تحويل الكلام العربي لنص، بس مابيدّيش درجة لإجابة غلط.", "We compare the meaning of the answer with your model answer (Sentence-BERT) and check key terms. Grading forgives Arabic speech-to-text slips, but never inflates a wrong answer.") },
        { pct: 10, title: l("الطلاقة", "Fluency"), body: l("كلمات التردد زي «اه» و«يعني»، والوقفات الطويلة، والتكرار، وسرعة الكلام.", "Filler words like “umm”, long pauses, repetition and speaking pace.") },
        { pct: 10, title: l("النزاهة", "Integrity"), body: l("النظر بعيد لفترة، أو ظهور موبايل أو كتاب أو شخص تاني. النظرات العادية مابتتحسبش.", "Looking away for long, or a phone, book or another person in view. Ordinary glances don't count.") },
    ];

    return (
        <div className="min-h-dvh bg-paper text-ink">
            {/* ── Nav ── */}
            <header className="sticky top-0 z-30 border-b border-rule bg-paper/90 backdrop-blur">
                <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6" aria-label={l("الرئيسية", "Main")}>
                    <Link to="/" aria-label="OralIQ"><Logo size={30} /></Link>
                    <div className="hidden items-center gap-1 text-[0.9375rem] md:flex">
                        <a href="#how" className={buttonClasses("ghost", "sm")}>{l("إزاي بيشتغل", "How it works")}</a>
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
                <section className="relative overflow-hidden border-b border-rule" style={RULED}>
                    <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-24">
                        <div>
                            <h1 className="text-[2.4rem] font-bold leading-[1.25] sm:text-[3.1rem] lg:text-[3.5rem]">
                                {lang === "ar" ? (
                                    <>أول منصة عربية <span className="whitespace-nowrap">للامتحانات الشفوية</span> أونلاين.</>
                                ) : "The first Arabic platform for online oral exams."}
                            </h1>
                            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2 sm:text-xl">
                                {l("الطالب يجاوب بصوته من أي مكان، والإجابة بتتصحح لوحدها: OralIQ يحوّلها لنص، ويقارنها بإجابتك النموذجية، ويتأكد إن الطالب نفسه هو اللي بيجاوب.",
                                    "Students answer out loud from anywhere, and every answer grades itself: OralIQ transcribes it, compares it with your model answer, and checks the right student is the one answering.")}
                            </p>
                            <div className="mt-9 flex flex-wrap gap-3">
                                <ButtonLink to={loggedIn ? "/dashboard" : "/register"} size="lg">{l("ابدأ الآن", "Get started")}</ButtonLink>
                                <a href="#how" className={buttonClasses("secondary", "lg")}>{l("شوف إزاي بيشتغل", "See how it works")}</a>
                            </div>
                            <p className="mt-5 text-sm text-ink-3">
                                {l("معاك رابط امتحان من المحاضر؟ افتحه على طول، وهيوصّلك للتسجيل.", "Got an exam link from your lecturer? Just open it — it takes you to sign up.")}
                            </p>
                        </div>
                        <div className="flex justify-center lg:justify-end">
                            <SampleSheet />
                        </div>
                    </div>
                </section>

                {/* ── How it works (a real sequence) ── */}
                <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
                    <h2 className="max-w-2xl text-3xl font-bold sm:text-4xl">{l("من السؤال للدرجة في أربع خطوات", "From question to grade in four steps")}</h2>
                    <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
                        {steps.map((s, i) => (
                            <li key={i} className="relative">
                                <span className="flex size-10 items-center justify-center rounded-full border-2 border-pen font-display text-lg font-semibold text-pen">{i + 1}</span>
                                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                                <p className="mt-2 leading-relaxed text-ink-2">{s.body}</p>
                            </li>
                        ))}
                    </ol>
                </section>

                {/* ── How the grade is made ── */}
                <section id="grading" className="scroll-mt-20 border-y border-rule bg-sheet">
                    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
                        <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
                            <div>
                                <h2 className="text-3xl font-bold sm:text-4xl">{l("الدرجة مش صندوق أسود", "The grade isn't a black box")}</h2>
                                <p className="mt-4 text-lg leading-relaxed text-ink-2">
                                    {l("كل درجة معاها تفاصيلها: نص الإجابة زي ما اتسمع، ونصيب كل جزء من الدرجة. ولو المحتوى أقل من 50%، الطالب مايقدرش ينجح مهما كانت طلاقته.",
                                        "Every grade comes with its working: the transcript as heard, and what each part contributed. If content is under 50%, the student can't pass however fluent they sound.")}
                                </p>
                                {/* Proportion bar: 80 / 10 / 10 */}
                                <div className="mt-8" aria-hidden>
                                    <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
                                        <div className="bg-pen" style={{ width: "80%" }} />
                                        <div className="bg-pen/55" style={{ width: "10%" }} />
                                        <div className="bg-pen/30" style={{ width: "10%" }} />
                                    </div>
                                </div>
                            </div>
                            <dl className="divide-y divide-rule border-y border-rule">
                                {parts.map((p) => (
                                    <div key={p.title} className="grid grid-cols-[4.5rem_1fr] gap-4 py-5">
                                        <dt className="font-display text-3xl font-semibold text-pen">{p.pct}%</dt>
                                        <dd>
                                            <p className="text-lg font-semibold">{p.title}</p>
                                            <p className="mt-1 leading-relaxed text-ink-2">{p.body}</p>
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </div>

                        <div className="mt-16 grid gap-6 rounded-[var(--radius-panel)] border border-rule bg-paper p-6 sm:grid-cols-[auto_1fr] sm:p-8">
                            <div className="flex gap-2 text-pen" aria-hidden>
                                <span className="flex size-12 items-center justify-center rounded-full bg-pen-wash"><ScanFace className="size-6" /></span>
                                <span className="flex size-12 items-center justify-center rounded-full bg-pen-wash"><Mic className="size-6" /></span>
                            </div>
                            <div>
                                <h3 className="flex items-center gap-2 text-xl font-semibold"><ShieldCheck className="size-5 text-pass" aria-hidden />{l("الوجه والصوت لازم الاتنين يطابقوا", "Face and voice must both match")}</h3>
                                <p className="mt-2 max-w-3xl leading-relaxed text-ink-2">
                                    {l("الطالب بيسجّل وشه وصوته مرة واحدة. في كل امتحان بنقارنهم تاني، ولو واحد فيهم بس اللي طابق، الإجابة بتتعلّم «محتاجة مراجعة» بدل ما تتقبل على طول. الطالب مايقدرش يغيّر بصمته غير بإذن المحاضر.",
                                        "Students register their face and voice once. Every exam compares them again; if only one matches, the answer is marked for review instead of accepted. Students can't change their prints without lecturer approval.")}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Contact + team ── */}
                <section id="contact" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
                    <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
                        <div>
                            <h2 className="text-3xl font-bold sm:text-4xl">{l("عايز تجرّبه في مؤسستك؟", "Want it for your institution?")}</h2>
                            <p className="mt-4 text-lg leading-relaxed text-ink-2">
                                {l("بنجهّز OralIQ للجامعات والمدارس ومراكز التدريب. كلّمنا ونرتب معاك تجربة على امتحان حقيقي.", "We set OralIQ up for universities, schools and training centres. Get in touch and we'll arrange a trial on a real exam.")}
                            </p>
                            <ul className="mt-8 space-y-3 text-ink-2">
                                <li className="flex items-center gap-3"><Mail className="size-5 text-ink-3" aria-hidden /><a className="ltr hover:text-pen" href="mailto:ahmedsalem250500@gmail.com">ahmedsalem250500@gmail.com</a></li>
                                <li className="flex items-center gap-3"><Phone className="size-5 text-ink-3" aria-hidden /><a className="ltr hover:text-pen" href="tel:+201065407502">+20 106 540 7502</a></li>
                                <li className="flex items-center gap-3"><MapPin className="size-5 text-ink-3" aria-hidden />{l("المنصورة، مصر", "Mansoura, Egypt")}</li>
                            </ul>
                        </div>
                        <div>
                        <h3 className="mb-3 text-lg font-semibold">{l("فريق OralIQ", "The OralIQ team")}</h3>
                        <ul className="divide-y divide-rule border-y border-rule">
                            {TEAM.map((m) => (
                                <li key={m.name} className="flex items-center gap-4 py-4">
                                    <Avatar name={m.name} size="lg" />
                                    <div>
                                        <p className="text-lg font-semibold" dir="ltr">{m.name}</p>
                                        <p className="text-ink-2">{l(m.role.ar, m.role.en)}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        </div>
                    </div>
                </section>

                {/* ── Closing CTA ── */}
                <section className="border-t border-rule" style={RULED}>
                    <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-20 sm:px-6 md:flex-row md:items-center md:justify-between">
                        <h2 className="max-w-xl text-3xl font-bold sm:text-4xl">{l("جرّبه في امتحانك الشفوي الجاي.", "Try it on your next oral exam.")}</h2>
                        <ButtonLink to={loggedIn ? "/dashboard" : "/register"} size="lg">{l("أنشئ حساب محاضر", "Create a lecturer account")}</ButtonLink>
                    </div>
                </section>
            </main>

            <footer className="border-t border-rule">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-ink-3 sm:px-6">
                    <Logo size={24} />
                    <p>{l("مبني بـ Whisper وSentence-BERT وInsightFace وMediaPipe", "Built with Whisper, Sentence-BERT, InsightFace and MediaPipe")}</p>
                    <p>© 2026 OralIQ</p>
                </div>
            </footer>
        </div>
    );
}
