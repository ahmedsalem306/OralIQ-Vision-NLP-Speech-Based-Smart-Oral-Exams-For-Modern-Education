import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Plus, Mic, ShieldCheck, ScanFace, Inbox, ClipboardList, Lock } from "lucide-react";
import { cn } from "../lib/utils";
import VoiceEnrollmentModal from "../components/VoiceEnrollmentModal";
import api from "../lib/api";
import { useI18n } from "../i18n";
import { Button, ButtonLink } from "../components/ui/button";
import { Panel, PanelHeader, PageHeader, RuledList, StatStrip } from "../components/ui/panel";
import { Alert, EmptyState, ListSkeleton, Skeleton } from "../components/ui/feedback";
import { Avatar } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { ScoreMark } from "../components/ui/score-mark";
import { gradeOf } from "../lib/grades";
import { countOf, difficultyInfo, NOUNS, parseServerDate, timeAgo } from "../lib/format";
import {
    isLecturerRole, needsReview,
    type Assignment, type BiometricStatus, type Me, type Question, type Submission,
} from "../lib/types";

export default function Overview() {
    const { l, lang } = useI18n();
    const navigate = useNavigate();
    const [user, setUser] = useState<Me | null>(null);
    const [bio, setBio] = useState<BiometricStatus | null>(null);
    const [showEnroll, setShowEnroll] = useState(false);
    const [loading, setLoading] = useState(true);

    // Lecturer data
    const [questions, setQuestions] = useState<Question[]>([]);
    const [results, setResults] = useState<Submission[]>([]);
    // Student data
    const [assignments, setAssignments] = useState<Assignment[]>([]);

    const loadBiometrics = () => {
        api.get("/voice/status").then((r) => setBio(r.data)).catch(() => setBio(null));
    };

    useEffect(() => {
        loadBiometrics();
        api.get("/users/me")
            .then(async (res) => {
                setUser(res.data);
                if (isLecturerRole(res.data.role)) {
                    const [q, r] = await Promise.all([
                        api.get("/questions/").catch(() => ({ data: [] })),
                        api.get("/exams/all-results").catch(() => ({ data: [] })),
                    ]);
                    setQuestions(q.data);
                    setResults(r.data);
                } else {
                    const a = await api.get("/exams/my-assignments").catch(() => ({ data: [] }));
                    setAssignments(a.data);
                }
            })
            .catch((err) => {
                const status = err?.response?.status;
                if (status === 401 || status === 403) {
                    localStorage.removeItem("token");
                    navigate("/login", { replace: true });
                }
            })
            .finally(() => setLoading(false));
    }, [navigate]);

    const firstName = (user?.full_name || "").split(/\s+/).filter((w) => !w.endsWith(".")).slice(0, 1).join(" ");
    const lecturer = isLecturerRole(user?.role);

    if (loading) {
        return (
            <div aria-busy>
                <Skeleton className="mb-3 h-9 w-64" />
                <Skeleton className="mb-8 h-5 w-80" />
                <Skeleton className="mb-8 h-24 w-full rounded-[var(--radius-panel)]" />
                <Panel><ListSkeleton rows={4} /></Panel>
            </div>
        );
    }

    // ── Lecturer ──────────────────────────────────────────────────────────────
    if (lecturer) {
        const exams = new Set(questions.map((q) => q.group_token || q.exam_token)).size;
        const scored = results.filter((r) => r.overall_score != null);
        const avg = scored.length ? Math.round(scored.reduce((s, r) => s + (r.overall_score ?? 0), 0) / scored.length) : null;
        const flagged = results.filter(needsReview);
        const recent = [...results]
            .sort((a, b) => (parseServerDate(b.submitted_at)?.getTime() ?? 0) - (parseServerDate(a.submitted_at)?.getTime() ?? 0))
            .slice(0, 6);

        return (
            <>
                <PageHeader
                    title={l(`أهلاً، ${user?.full_name ?? ""}`, `Welcome, ${user?.full_name ?? ""}`)}
                    description={
                        results.length
                            ? `${l("وصلتك", "You have")} ${countOf(lang, results.length, NOUNS.answer)} ${l("حتى الآن.", "so far.")}`
                            : l("ابدأ بإضافة سؤال وأرسل رابطه للطلاب.", "Start by adding a question and sharing its link with students.")
                    }
                    actions={
                        <>
                            <ButtonLink to="/dashboard/results" variant="secondary">{l("كل النتائج", "All results")}</ButtonLink>
                            <ButtonLink to="/dashboard/questions?new=1"><Plus className="size-4" aria-hidden />{l("سؤال جديد", "New question")}</ButtonLink>
                        </>
                    }
                />

                {results.length === 0 && (
                    <Panel className="mb-8">
                        <PanelHeader
                            title={l("ابدأ في 3 خطوات", "Get started in 3 steps")}
                            description={l("بعد أول إجابة توصلك، الصفحة دي هتبقى ملخص لكل امتحاناتك.", "Once your first answer arrives, this page becomes a summary of all your exams.")}
                        />
                        <ol className="divide-y divide-rule">
                            {[
                                {
                                    done: questions.length > 0,
                                    title: l("اكتب أول سؤال وإجابته النموذجية", "Write your first question and model answer"),
                                    body: l("الذكاء الاصطناعي بيصحح على أساس الإجابة النموذجية، فاكتبها بالمعنى الكامل.", "The AI grades against the model answer, so write out the full meaning."),
                                    action: <ButtonLink to="/dashboard/questions?new=1" size="sm">{l("اكتب سؤال", "Write a question")}</ButtonLink>,
                                },
                                {
                                    done: false,
                                    title: l("ابعت الامتحان للطلاب", "Send the exam to students"),
                                    body: l("انسخ رابط الامتحان وابعته على جروب المادة، أو ابعته لطالب معيّن من صفحة الأسئلة.", "Copy the exam link into your class group, or send it to specific students from the Questions page."),
                                    action: questions.length > 0 ? <ButtonLink to="/dashboard/questions" variant="secondary" size="sm">{l("صفحة الأسئلة", "Questions page")}</ButtonLink> : null,
                                },
                                {
                                    done: false,
                                    title: l("راجع الإجابات وانشر الدرجات", "Review answers and publish grades"),
                                    body: l("كل إجابة بتوصلك مصححة، ومعاها نصها وملاحظات النزاهة. الدرجة بتظهر في «درجاتي» عند الطالب بعد ما تنشرها.", "Each answer arrives graded, with its transcript and integrity notes. The grade appears in the student's My grades once you publish it."),
                                    action: null,
                                },
                            ].map((s, i) => (
                                <li key={i} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                                    <span className={cn(
                                        "flex size-8 shrink-0 items-center justify-center rounded-full border-2 font-display text-sm font-semibold",
                                        s.done ? "border-pass bg-pass text-pen-ink" : "border-pen text-pen",
                                    )}>
                                        {s.done ? <Check className="size-4" aria-label={l("تم", "Done")} /> : i + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className={cn("font-semibold", s.done && "text-ink-2 line-through decoration-ink-3")}>{s.title}</p>
                                        <p className="mt-0.5 text-sm text-ink-2">{s.body}</p>
                                    </div>
                                    {!s.done && s.action}
                                </li>
                            ))}
                        </ol>
                    </Panel>
                )}

                {results.length > 0 && <StatStrip
                    className="mb-8"
                    items={[
                        { label: l("الامتحانات", "Exams"), value: exams, hint: countOf(lang, questions.length, NOUNS.question) },
                        { label: l("الإجابات", "Submissions"), value: results.length },
                        { label: l("متوسط الدرجات", "Average score"), value: avg != null ? `${avg}%` : "—" },
                        { label: l("تحتاج مراجعتك", "Need your review"), value: flagged.length, hint: l("النزاهة أو الهوية", "Integrity or identity") },
                    ]}
                />}

                {flagged.length > 0 && (
                    <Alert
                        tone="warning"
                        className="mb-8"
                        title={l(`${countOf("ar", flagged.length, NOUNS.answer)} فيها ملاحظات نزاهة`, flagged.length === 1 ? "1 answer has integrity notes" : `${flagged.length} answers have integrity notes`)}
                        action={<ButtonLink to="/dashboard/results?filter=review" variant="secondary" size="sm">{l("راجعها", "Review")}</ButtonLink>}
                    >
                        {l("الذكاء الاصطناعي رصد سلوكاً يستحق نظرة منك قبل نشر الدرجة.", "The AI flagged behaviour worth a look before you publish the grade.")}
                    </Alert>
                )}

                {results.length > 0 && <Panel>
                    <PanelHeader
                        title={l("آخر الإجابات", "Latest submissions")}
                        actions={results.length > 0 && <ButtonLink to="/dashboard/results" variant="ghost" size="sm">{l("عرض الكل", "View all")}</ButtonLink>}
                    />
                    {recent.length === 0 ? (
                        <EmptyState
                            icon={<Inbox />}
                            title={l("لا توجد إجابات بعد", "No submissions yet")}
                            body={l("ستظهر هنا إجابات الطلاب فور تسليمها، مصحّحة تلقائياً.", "Student answers appear here as soon as they're submitted, already graded.")}
                            action={<ButtonLink to="/dashboard/questions?new=1"><Plus className="size-4" aria-hidden />{l("أضف أول سؤال", "Add your first question")}</ButtonLink>}
                        />
                    ) : (
                        <RuledList>
                            {recent.map((s) => {
                                const g = gradeOf(s.overall_score);
                                return (
                                    <li key={s.id}>
                                        <Link
                                            to={`/dashboard/results?open=${s.id}`}
                                            className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-sheet-2"
                                        >
                                            <Avatar name={s.student_name} />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-semibold">{s.student_name}</p>
                                                <p className="truncate text-sm text-ink-2">
                                                    {s.question_text || l("سؤال محذوف", "Deleted question")}
                                                </p>
                                            </div>
                                            <div className="hidden items-center gap-2 sm:flex">
                                                <span className="text-sm text-ink-3">{timeAgo(s.submitted_at, lang)}</span>
                                                {needsReview(s) && <Badge tone="warn">{l("مراجعة", "Review")}</Badge>}
                                                {g ? <Badge tone={g.tone}>{l(g.ar, g.en)}</Badge> : <Badge>{l("قيد التصحيح", "Grading")}</Badge>}
                                            </div>
                                            <ScoreMark score={s.overall_score} size="sm" plain className="w-14" />
                                        </Link>
                                    </li>
                                );
                            })}
                        </RuledList>
                    )}
                </Panel>}
            </>
        );
    }

    // ── Student ───────────────────────────────────────────────────────────────
    const pending = assignments.filter((a) => a.status === "pending");
    const ready = !!bio?.biometrics_complete;
    let inviteToken: string | null = null;
    try { inviteToken = localStorage.getItem("pendingExamToken"); } catch { /* ignore */ }
    const inviteOutsideList = inviteToken && !pending.some((a) => a.exam_token === inviteToken);

    const startExam = (token: string | null) => {
        if (!token) return;
        localStorage.setItem("pendingExamToken", token);
        navigate("/exam/start");
    };

    return (
        <>
            <PageHeader
                title={l(`أهلاً، ${firstName}`, `Hi, ${firstName}`)}
                description={
                    pending.length
                        ? l(
                            `عندك ${countOf("ar", pending.length, NOUNS.exam)} في انتظارك.`,
                            pending.length === 1 ? "You have one exam waiting." : `You have ${pending.length} exams waiting.`,
                        )
                        : l("لا توجد امتحانات مطلوبة منك الآن.", "No exams are waiting for you right now.")
                }
            />

            {/* Identity setup */}
            {bio && !ready ? (
                <Alert
                    tone="warning"
                    className="mb-8"
                    title={l("سجّل وجهك وصوتك قبل أول امتحان", "Register your face and voice before your first exam")}
                    action={<Button size="sm" onClick={() => setShowEnroll(true)}>{l("سجّل الآن", "Register now")}</Button>}
                >
                    {l("بنستخدمهم للتأكد إن انت اللي بتجاوب. التسجيل بياخد حوالي دقيقتين.", "We use them to confirm it's you answering. It takes about two minutes.")}
                </Alert>
            ) : bio && ready ? (
                <div className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-2">
                    <span className="inline-flex items-center gap-1.5"><ScanFace className="size-4 text-pass" aria-hidden />{l("الوجه مسجّل", "Face registered")}</span>
                    <span className="inline-flex items-center gap-1.5"><Mic className="size-4 text-pass" aria-hidden />{l("الصوت مسجّل", "Voice registered")}</span>
                    {bio.can_reenroll ? (
                        <button type="button" onClick={() => setShowEnroll(true)} className="font-semibold text-pen hover:underline">
                            {l("إعادة التسجيل", "Register again")}
                        </button>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 text-ink-3"><Lock className="size-3.5" aria-hidden />{l("التعديل بإذن المحاضر", "Changes need lecturer approval")}</span>
                    )}
                </div>
            ) : null}

            {inviteOutsideList && ready && (
                <Alert
                    tone="info"
                    className="mb-8"
                    title={l("عندك امتحان من رابط دعوة", "You opened an exam invite link")}
                    action={<Button size="sm" onClick={() => startExam(inviteToken)}>{l("ابدأ الامتحان", "Start exam")}</Button>}
                />
            )}

            <Panel>
                <PanelHeader title={l("امتحاناتك المطلوبة", "Your exams")} />
                {pending.length === 0 ? (
                    <EmptyState
                        icon={<ClipboardList />}
                        title={l("كل امتحاناتك خلصت", "You're all caught up")}
                        body={l("أي امتحان يرسله المحاضر هيظهر هنا. ودرجاتك المنشورة في صفحة الدرجات.", "Any exam your lecturer sends shows up here. Published grades are on the Grades page.")}
                        action={<ButtonLink to="/dashboard/grades" variant="secondary">{l("درجاتي", "My grades")}</ButtonLink>}
                    />
                ) : (
                    <RuledList>
                        {pending.map((a) => {
                            const diff = difficultyInfo(a.question_difficulty, lang);
                            return (
                                <li key={a.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-5">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold leading-snug">{a.question_text || l("امتحان شفوي", "Oral exam")}</p>
                                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
                                            <span>{a.assigned_by_name || l("المحاضر", "Lecturer")}</span>
                                            <span className="text-ink-3">{timeAgo(a.assigned_at, lang)}</span>
                                            {a.question_difficulty && <Badge tone={diff.tone}>{diff.label}</Badge>}
                                        </p>
                                    </div>
                                    <Button
                                        onClick={() => startExam(a.exam_token)}
                                        disabled={!ready}
                                        title={!ready ? l("سجّل وجهك وصوتك أولاً", "Register your face and voice first") : undefined}
                                        className="sm:w-auto"
                                    >
                                        <Mic className="size-4" aria-hidden />
                                        {l("ابدأ الامتحان", "Start exam")}
                                    </Button>
                                </li>
                            );
                        })}
                    </RuledList>
                )}
            </Panel>

            {ready && (
                <p className="mt-4 flex items-center gap-1.5 text-sm text-ink-3">
                    <ShieldCheck className="size-4" aria-hidden />
                    {l("الامتحان بيتسجّل بالصوت، والكاميرا بتتأكد من هويتك أثناء الإجابة.", "Your answer is recorded as audio; the camera confirms your identity while you answer.")}
                </p>
            )}

            <VoiceEnrollmentModal
                isOpen={showEnroll}
                onClose={() => setShowEnroll(false)}
                onSuccess={() => { setShowEnroll(false); loadBiometrics(); }}
            />
        </>
    );
}
