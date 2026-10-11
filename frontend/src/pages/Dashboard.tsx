import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, ChevronDown, ClipboardList, Clock, Copy, Lock, Plus, Search, Trash2, UserPlus } from "lucide-react";
import api from "../lib/api";
import { useI18n } from "../i18n";
import { cn } from "../lib/utils";
import VoiceRecordButton from "../components/VoiceRecordButton";
import { Button, buttonClasses } from "../components/ui/button";
import { Field, Input, Textarea } from "../components/ui/input";
import { Panel, PageHeader } from "../components/ui/panel";
import { Alert, EmptyState, ListSkeleton, Modal, Segmented } from "../components/ui/feedback";
import { Badge } from "../components/ui/badge";
import { Avatar } from "../components/ui/avatar";
import { difficultyInfo, formatDate, parseServerDate } from "../lib/format";
import { getApiErrorMessage } from "../lib/apiErrors";
import type { Question, StudentRow } from "../lib/types";

type Difficulty = "easy" | "medium" | "hard";

interface ExamGroup {
    token: string;
    questions: Question[];
    createdAt: string | null;
}

const emptyDraft = { text: "", model_answer: "", keywords: "", category: "", difficulty: "medium" as Difficulty, duration_minutes: 2 };

export default function Dashboard() {
    const { l, lang } = useI18n();
    const [params, setParams] = useSearchParams();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState("");
    const [copied, setCopied] = useState<string | null>(null);

    // Editor
    const [editorOpen, setEditorOpen] = useState(false);
    const [draft, setDraft] = useState(emptyDraft);
    const [groupToken, setGroupToken] = useState<string | null>(null);
    const [addedNow, setAddedNow] = useState<Question[]>([]);
    const [saving, setSaving] = useState(false);
    const [editorError, setEditorError] = useState("");

    // Delete
    const [toDelete, setToDelete] = useState<Question | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Assign
    const [assignFor, setAssignFor] = useState<ExamGroup | null>(null);
    const [students, setStudents] = useState<StudentRow[] | null>(null);
    const [studentQuery, setStudentQuery] = useState("");
    const [assigned, setAssigned] = useState<Set<number>>(new Set());
    const [busyStudent, setBusyStudent] = useState<number | null>(null);
    const [assignError, setAssignError] = useState("");

    useEffect(() => {
        api.get("/questions/")
            .then((res) => setQuestions(res.data))
            .catch((err) => setPageError(getApiErrorMessage(err, l("تعذّر تحميل الأسئلة.", "Couldn't load questions."))))
            .finally(() => setLoading(false));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // /dashboard/questions?new=1 opens the editor straight away
    useEffect(() => {
        if (params.get("new")) {
            openEditor(null);
            const next = new URLSearchParams(params);
            next.delete("new");
            setParams(next, { replace: true });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const groups = useMemo<ExamGroup[]>(() => {
        const map = new Map<string, Question[]>();
        for (const q of questions) {
            const key = q.group_token || q.exam_token;
            map.set(key, [...(map.get(key) || []), q]);
        }
        return [...map.entries()]
            .map(([token, qs]) => {
                const sorted = [...qs].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
                return { token, questions: sorted, createdAt: sorted[0]?.created_at ?? null };
            })
            .sort((a, b) => (parseServerDate(b.createdAt)?.getTime() ?? 0) - (parseServerDate(a.createdAt)?.getTime() ?? 0));
    }, [questions]);

    const categories = useMemo(() => [...new Set(questions.map((q) => q.category).filter((c) => c && c !== "general"))], [questions]);

    const examLink = (token: string) => `${window.location.origin}/exam/${token}`;
    const copyLink = async (token: string) => {
        try {
            await navigator.clipboard.writeText(examLink(token));
            setCopied(token);
            setTimeout(() => setCopied((c) => (c === token ? null : c)), 2000);
        } catch {
            setPageError(l("المتصفح منع النسخ. انسخ الرابط يدوياً من الخانة.", "The browser blocked copying. Copy the link from the field."));
        }
    };

    // ── Editor ────────────────────────────────────────────────────────────────
    const openEditor = (group: ExamGroup | null) => {
        setGroupToken(group?.token ?? null);
        setDraft({ ...emptyDraft, category: group?.questions[0]?.category && group.questions[0].category !== "general" ? group.questions[0].category : "" });
        setAddedNow([]);
        setEditorError("");
        setEditorOpen(true);
    };

    const save = async (addAnother: boolean) => {
        if (!draft.text.trim() || !draft.model_answer.trim()) {
            setEditorError(l("اكتب السؤال والإجابة النموذجية الأول.", "Write the question and the model answer first."));
            return;
        }
        setSaving(true);
        setEditorError("");
        try {
            const payload = {
                ...draft,
                text: draft.text.trim(),
                model_answer: draft.model_answer.trim(),
                category: draft.category.trim() || "general",
                ...(groupToken ? { group_token: groupToken } : {}),
            };
            const { data } = await api.post("/questions/", payload);
            setQuestions((p) => [...p, data]);
            setAddedNow((p) => [...p, data]);
            if (!groupToken) setGroupToken(data.group_token);
            setDraft((d) => ({ ...emptyDraft, category: d.category, difficulty: d.difficulty, duration_minutes: d.duration_minutes }));
            if (!addAnother) setEditorOpen(false);
        } catch (err) {
            setEditorError(getApiErrorMessage(err, l("تعذّر حفظ السؤال.", "Couldn't save the question.")));
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const confirmDelete = async () => {
        if (!toDelete) return;
        setDeleting(true);
        try {
            await api.delete(`/questions/${toDelete.id}`);
            setQuestions((p) => p.filter((q) => q.id !== toDelete.id));
            setToDelete(null);
        } catch (err) {
            setPageError(getApiErrorMessage(err, l("تعذّر حذف السؤال. لو عليه إجابات طلاب، مش هينفع يتحذف.", "Couldn't delete. Questions with student answers can't be deleted.")));
            setToDelete(null);
        } finally {
            setDeleting(false);
        }
    };

    // ── Assign ────────────────────────────────────────────────────────────────
    const openAssign = async (g: ExamGroup) => {
        setAssignFor(g);
        setAssigned(new Set());
        setStudentQuery("");
        setAssignError("");
        if (!students) {
            try { setStudents((await api.get("/exams/students")).data); }
            catch (err) { setStudents([]); setAssignError(getApiErrorMessage(err, l("تعذّر تحميل الطلاب.", "Couldn't load students."))); }
        }
    };

    // Assigning the first question opens the whole exam for the student (ExamRoom loads by group).
    const assign = async (sid: number) => {
        const leader = assignFor?.questions[0];
        if (!leader) return;
        setBusyStudent(sid);
        setAssignError("");
        try {
            await api.post("/exams/assign", { question_id: leader.id, student_id: sid });
            setAssigned((s) => new Set(s).add(sid));
        } catch (err) {
            setAssignError(getApiErrorMessage(err, l("تعذّر إرسال الامتحان.", "Couldn't send the exam.")));
        } finally {
            setBusyStudent(null);
        }
    };

    const allowReenroll = async (sid: number) => {
        setBusyStudent(sid);
        try {
            await api.post(`/voice/allow-reenroll/${sid}`);
            setStudents((prev) => prev?.map((s) => (s.id === sid ? { ...s, voice_reenroll_allowed: true } : s)) ?? prev);
        } catch (err) {
            setAssignError(getApiErrorMessage(err, l("تعذّر تغيير الإذن.", "Couldn't change the permission.")));
        } finally {
            setBusyStudent(null);
        }
    };

    const filteredStudents = (students ?? []).filter((s) => {
        const q = studentQuery.trim().toLowerCase();
        return !q || s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    });

    const difficulties: { value: Difficulty; label: string }[] = [
        { value: "easy", label: l("سهل", "Easy") },
        { value: "medium", label: l("متوسط", "Medium") },
        { value: "hard", label: l("صعب", "Hard") },
    ];

    return (
        <>
            <PageHeader
                title={l("أسئلة الامتحانات", "Exam questions")}
                description={l("كل امتحان له رابط واحد. الطالب بيجاوب على أسئلته بالترتيب.", "Each exam has one link. Students answer its questions in order.")}
                actions={<Button onClick={() => openEditor(null)}><Plus className="size-4" aria-hidden />{l("امتحان جديد", "New exam")}</Button>}
            />

            {pageError && <Alert tone="error" className="mb-6" action={<button className="text-sm font-semibold text-pen" onClick={() => setPageError("")}>{l("إغلاق", "Dismiss")}</button>}>{pageError}</Alert>}

            {loading ? (
                <Panel><ListSkeleton rows={4} /></Panel>
            ) : groups.length === 0 ? (
                <Panel>
                    <EmptyState
                        icon={<ClipboardList />}
                        title={l("لسه مفيش امتحانات", "No exams yet")}
                        body={l("اكتب السؤال وإجابته النموذجية، والذكاء الاصطناعي هيصحح إجابات الطلاب على أساسها.", "Write a question and its model answer — the AI grades student answers against it.")}
                        action={<Button onClick={() => openEditor(null)}><Plus className="size-4" aria-hidden />{l("أنشئ أول امتحان", "Create your first exam")}</Button>}
                    />
                </Panel>
            ) : (
                <div className="space-y-6">
                    {groups.map((g) => {
                        const total = g.questions.reduce((s, q) => s + (q.duration_minutes || 0), 0);
                        const category = g.questions[0]?.category;
                        return (
                            <Panel key={g.token} className="overflow-hidden">
                                <header className="flex flex-col gap-4 border-b border-rule px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="min-w-0">
                                        <h2 className="text-lg font-semibold">
                                            {category && category !== "general" ? category : l("امتحان شفوي", "Oral exam")}
                                        </h2>
                                        <p className="mt-0.5 flex flex-wrap gap-x-4 text-sm text-ink-2">
                                            <span>{l(g.questions.length === 1 ? "سؤال واحد" : `${g.questions.length} أسئلة`, g.questions.length === 1 ? "1 question" : `${g.questions.length} questions`)}</span>
                                            <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden />{l(`${total} دقيقة`, `${total} min`)}</span>
                                            <span className="text-ink-3">{formatDate(g.createdAt, lang)}</span>
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button variant="secondary" size="sm" onClick={() => copyLink(g.token)} aria-live="polite">
                                            {copied === g.token ? <Check className="size-4 text-pass" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                                            {copied === g.token ? l("اتنسخ", "Copied") : l("نسخ الرابط", "Copy link")}
                                        </Button>
                                        <Button variant="secondary" size="sm" onClick={() => openAssign(g)}>
                                            <UserPlus className="size-4" aria-hidden />{l("إرسال لطالب", "Send to student")}
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => openEditor(g)}>
                                            <Plus className="size-4" aria-hidden />{l("سؤال", "Question")}
                                        </Button>
                                    </div>
                                </header>

                                <ol className="divide-y divide-rule">
                                    {g.questions.map((q, i) => {
                                        const diff = difficultyInfo(q.difficulty, lang);
                                        return (
                                            <li key={q.id} className="group/q">
                                                <details className="[&[open]_.chev]:rotate-180">
                                                    <summary className="flex cursor-pointer list-none items-start gap-4 px-5 py-4 hover:bg-sheet-2 [&::-webkit-details-marker]:hidden">
                                                        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-rule-strong font-display text-sm font-semibold tabular text-ink-2">{i + 1}</span>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-medium leading-relaxed">{q.text}</p>
                                                            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-3">
                                                                <Badge tone={diff.tone}>{diff.label}</Badge>
                                                                <span>{l(`${q.duration_minutes} دقيقة`, `${q.duration_minutes} min`)}</span>
                                                            </p>
                                                        </div>
                                                        <ChevronDown className="chev mt-1 size-5 shrink-0 text-ink-3 transition-transform" aria-hidden />
                                                    </summary>
                                                    <div className="space-y-4 bg-sheet-2 px-5 pb-5 ps-16 pt-1">
                                                        <div>
                                                            <p className="text-sm font-semibold text-ink-2">{l("الإجابة النموذجية", "Model answer")}</p>
                                                            <p className="mt-1 leading-relaxed">{q.model_answer}</p>
                                                        </div>
                                                        {q.keywords && (
                                                            <div>
                                                                <p className="text-sm font-semibold text-ink-2">{l("كلمات مفتاحية", "Keywords")}</p>
                                                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                                    {q.keywords.split(/[,،]/).map((k) => k.trim()).filter(Boolean).map((k) => <Badge key={k}>{k}</Badge>)}
                                                                </div>
                                                            </div>
                                                        )}
                                                        <Button variant="danger-ghost" size="sm" className="-ms-3" onClick={() => setToDelete(q)}>
                                                            <Trash2 className="size-4" aria-hidden />{l("حذف السؤال", "Delete question")}
                                                        </Button>
                                                    </div>
                                                </details>
                                            </li>
                                        );
                                    })}
                                </ol>
                            </Panel>
                        );
                    })}
                </div>
            )}

            {/* ── Editor ── */}
            <Modal
                open={editorOpen}
                onClose={() => !saving && setEditorOpen(false)}
                size="lg"
                title={groupToken ? l("إضافة سؤال للامتحان", "Add a question") : l("امتحان جديد", "New exam")}
                description={l("الإجابة النموذجية هي اللي هيتقارن بيها كلام الطالب، فاكتبها بالمعنى الكامل.", "Student answers are compared against the model answer, so write out the full meaning.")}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setEditorOpen(false)} disabled={saving} className="me-auto">
                            {addedNow.length ? l("تم", "Done") : l("إلغاء", "Cancel")}
                        </Button>
                        <Button variant="secondary" onClick={() => save(true)} disabled={saving}>{l("حفظ وإضافة سؤال آخر", "Save and add another")}</Button>
                        <Button onClick={() => save(false)} loading={saving}>{l("حفظ", "Save")}</Button>
                    </>
                }
            >
                {addedNow.length > 0 && (
                    <Alert tone="success" className="mb-5" title={l(`اتضاف ${addedNow.length} ${addedNow.length === 1 ? "سؤال" : "أسئلة"} للامتحان`, `${addedNow.length} added to this exam`)}>
                        <ol className="mt-1 list-decimal space-y-0.5 ps-5">
                            {addedNow.map((q) => <li key={q.id} className="truncate">{q.text}</li>)}
                        </ol>
                    </Alert>
                )}
                {editorError && <Alert tone="error" className="mb-5">{editorError}</Alert>}

                <div className="grid gap-5">
                    <Field
                        label={l("السؤال", "Question")} htmlFor="q-text"
                        action={<VoiceRecordButton hint={l("سؤال امتحان شفوي", "oral exam question")} onTranscribed={(t) => setDraft((d) => ({ ...d, text: d.text ? `${d.text} ${t}` : t }))} />}
                    >
                        <Textarea id="q-text" data-autofocus rows={3} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} placeholder={l("مثال: عرّف الذكاء الاصطناعي واذكر مثالين على استخدامه", "e.g. Define artificial intelligence and give two examples")} />
                    </Field>
                    <Field
                        label={l("الإجابة النموذجية", "Model answer")} htmlFor="q-answer"
                        action={<VoiceRecordButton hint={draft.text} onTranscribed={(t) => setDraft((d) => ({ ...d, model_answer: d.model_answer ? `${d.model_answer} ${t}` : t }))} />}
                    >
                        <Textarea id="q-answer" rows={4} value={draft.model_answer} onChange={(e) => setDraft({ ...draft, model_answer: e.target.value })} />
                    </Field>
                    <Field label={l("كلمات مفتاحية", "Keywords")} htmlFor="q-keywords" hint={l("اختياري. مصطلحات لازم تيجي في الإجابة، افصل بينها بفاصلة.", "Optional. Terms the answer must mention, separated by commas.")}>
                        <Input id="q-keywords" value={draft.keywords} onChange={(e) => setDraft({ ...draft, keywords: e.target.value })} placeholder={l("محاكاة، تعلم، بيانات", "simulation, learning, data")} aria-describedby="q-keywords-hint" />
                    </Field>
                    <div className="grid gap-5 sm:grid-cols-[1fr_auto_8rem]">
                        <Field label={l("المادة أو الموضوع", "Subject")} htmlFor="q-category">
                            <Input id="q-category" list="q-categories" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder={l("مثال: تعلم الآلة", "e.g. Machine learning")} />
                            <datalist id="q-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
                        </Field>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-sm font-semibold" id="q-diff-label">{l("الصعوبة", "Difficulty")}</span>
                            <Segmented label={l("الصعوبة", "Difficulty")} value={draft.difficulty} onChange={(v) => setDraft({ ...draft, difficulty: v })} options={difficulties} />
                        </div>
                        <Field label={l("الوقت (دقائق)", "Time (min)")} htmlFor="q-duration">
                            <Input id="q-duration" type="number" min={1} max={10} value={draft.duration_minutes} className="tabular"
                                onChange={(e) => setDraft({ ...draft, duration_minutes: Math.min(10, Math.max(1, parseInt(e.target.value) || 1)) })} />
                        </Field>
                    </div>
                </div>
            </Modal>

            {/* ── Delete confirm ── */}
            <Modal
                open={!!toDelete}
                onClose={() => !deleting && setToDelete(null)}
                size="sm"
                title={l("حذف السؤال؟", "Delete this question?")}
                description={toDelete?.text}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setToDelete(null)} disabled={deleting}>{l("إلغاء", "Cancel")}</Button>
                        <Button variant="danger" onClick={confirmDelete} loading={deleting}>{l("حذف", "Delete")}</Button>
                    </>
                }
            />

            {/* ── Assign ── */}
            <Modal
                open={!!assignFor}
                onClose={() => setAssignFor(null)}
                title={l("إرسال الامتحان لطالب", "Send exam to a student")}
                description={l("الامتحان هيظهر عند الطالب في صفحة دعوات الامتحانات.", "The exam appears on the student's Exam invites page.")}
                footer={<Button onClick={() => setAssignFor(null)}>{l("تم", "Done")}</Button>}
            >
                {assignError && <Alert tone="error" className="mb-4">{assignError}</Alert>}
                <Input data-autofocus icon={<Search />} value={studentQuery} onChange={(e) => setStudentQuery(e.target.value)} placeholder={l("ابحث بالاسم أو البريد", "Search by name or email")} aria-label={l("بحث عن طالب", "Search students")} />
                <div className="mt-4 max-h-[50vh] overflow-y-auto rounded-[var(--radius-control)] border border-rule">
                    {students === null ? (
                        <ListSkeleton rows={3} />
                    ) : filteredStudents.length === 0 ? (
                        <p className="px-4 py-10 text-center text-ink-2">{students.length ? l("مفيش طالب بالاسم ده.", "No student matches that search.") : l("لسه مفيش طلاب مسجلين.", "No students have signed up yet.")}</p>
                    ) : (
                        <ul className="divide-y divide-rule">
                            {filteredStudents.map((s) => {
                                const done = assigned.has(s.id);
                                const bioReady = s.has_voiceprint && s.has_faceprint;
                                return (
                                    <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                                        <Avatar name={s.full_name} size="sm" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-semibold">{s.full_name}</p>
                                            <p className="truncate text-xs text-ink-3 ltr text-start">{s.email}</p>
                                        </div>
                                        {!bioReady && <Badge tone="warn">{l("لم يسجل هويته", "No ID setup")}</Badge>}
                                        {s.voice_locked && !s.voice_reenroll_allowed && (
                                            <button type="button" onClick={() => allowReenroll(s.id)} disabled={busyStudent === s.id}
                                                className={buttonClasses("ghost", "sm", "h-8 px-2 text-xs")} title={l("اسمح له يعيد تسجيل وجهه وصوته", "Let them re-register face and voice")}>
                                                <Lock className="size-3.5" aria-hidden />{l("سماح بإعادة التسجيل", "Allow re-register")}
                                            </button>
                                        )}
                                        <Button size="sm" variant={done ? "secondary" : "primary"} disabled={done} loading={busyStudent === s.id} onClick={() => assign(s.id)} className={cn(done && "text-pass")}>
                                            {done ? <><Check className="size-4" aria-hidden />{l("اتبعت", "Sent")}</> : l("إرسال", "Send")}
                                        </Button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </Modal>
        </>
    );
}
