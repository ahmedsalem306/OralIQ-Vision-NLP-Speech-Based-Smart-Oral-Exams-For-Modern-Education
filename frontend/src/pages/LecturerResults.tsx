import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Download, Eye, EyeOff, Inbox, Search, Send, X } from "lucide-react";
import api from "../lib/api";
import { useI18n } from "../i18n";
import { cn } from "../lib/utils";
import { Button, buttonClasses } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Panel, PageHeader, RuledList, StatStrip } from "../components/ui/panel";
import { Alert, Drawer, EmptyState, ListSkeleton, Modal, Segmented } from "../components/ui/feedback";
import { Avatar } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { ScoreMark } from "../components/ui/score-mark";
import { AnswerSheet } from "../components/AnswerSheet";
import { gradeOf, formatScore } from "../lib/grades";
import { formatDate, parseServerDate } from "../lib/format";
import { needsReview, type Submission } from "../lib/types";
import { getApiErrorMessage } from "../lib/apiErrors";

type Filter = "all" | "review" | "unpublished" | "published";

function downloadCsv(rows: Submission[], lang: "ar" | "en") {
    const head = lang === "ar"
        ? ["الطالب", "الرقم", "السؤال", "التاريخ", "الدرجة", "المحتوى", "الطلاقة", "النزاهة", "الوجه", "الصوت", "منشورة"]
        : ["Student", "Number", "Question", "Date", "Score", "Content", "Fluency", "Integrity", "Face", "Voice", "Published"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = rows.map((r) => [
        r.student_name, r.student_number, r.question_text, formatDate(r.submitted_at, lang, true),
        r.overall_score, r.nlp_score, r.speech_score, r.facial_score, r.face_score, r.voice_score,
        r.grade_visible ? "1" : "0",
    ].map(esc).join(","));
    // BOM so Excel opens Arabic text correctly
    const blob = new Blob(["﻿" + [head.map(esc).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `oraliq-results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
}

export default function LecturerResults() {
    const { l, lang } = useI18n();
    const [params, setParams] = useSearchParams();
    const [results, setResults] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [query, setQuery] = useState("");
    const [busyId, setBusyId] = useState<number | null>(null);
    const [actionError, setActionError] = useState("");
    const [confirmBulk, setConfirmBulk] = useState(false);
    const [bulkBusy, setBulkBusy] = useState(false);

    const filter = (params.get("filter") as Filter) || "all";
    const openId = Number(params.get("open")) || null;

    const setParam = (key: string, value: string | null) => {
        const next = new URLSearchParams(params);
        if (value == null || value === "" || (key === "filter" && value === "all")) next.delete(key);
        else next.set(key, value);
        setParams(next, { replace: true });
    };

    useEffect(() => {
        api.get("/exams/all-results")
            .then((res) => setResults(res.data))
            .catch((err) => setLoadError(getApiErrorMessage(err, l("تعذّر تحميل النتائج.", "Couldn't load results."))))
            .finally(() => setLoading(false));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const sorted = useMemo(
        () => [...results].sort((a, b) => (parseServerDate(b.submitted_at)?.getTime() ?? 0) - (parseServerDate(a.submitted_at)?.getTime() ?? 0)),
        [results],
    );

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return sorted.filter((r) => {
            if (filter === "review" && !needsReview(r)) return false;
            if (filter === "unpublished" && r.grade_visible) return false;
            if (filter === "published" && !r.grade_visible) return false;
            if (!q) return true;
            return [r.student_name, r.student_number, r.question_text].some((v) => (v || "").toLowerCase().includes(q));
        });
    }, [sorted, filter, query]);

    const scored = results.filter((r) => r.overall_score != null);
    const avg = scored.length ? Math.round(scored.reduce((s, r) => s + (r.overall_score ?? 0), 0) / scored.length) : null;
    const top = scored.length ? Math.max(...scored.map((r) => r.overall_score ?? 0)) : null;
    const unpublished = results.filter((r) => !r.grade_visible);
    const reviewCount = results.filter(needsReview).length;
    const bulkEligible = results.filter((r) => !r.grade_visible && r.overall_score != null && !needsReview(r));

    const setVisibility = async (id: number, visibleFlag: boolean) => {
        setBusyId(id);
        setActionError("");
        try {
            await api.patch(`/exams/submissions/${id}/visibility?visible=${visibleFlag}`);
            setResults((prev) => prev.map((r) => (r.id === id ? { ...r, grade_visible: visibleFlag ? 1 : 0 } : r)));
        } catch (err) {
            setActionError(getApiErrorMessage(err, l("تعذّر تحديث حالة النشر.", "Couldn't update the grade.")));
        } finally {
            setBusyId(null);
        }
    };

    const publishAll = async () => {
        setBulkBusy(true);
        setActionError("");
        const done: number[] = [];
        for (const r of bulkEligible) {
            try {
                await api.patch(`/exams/submissions/${r.id}/visibility?visible=true`);
                done.push(r.id);
            } catch { /* keep going; report below */ }
        }
        setResults((prev) => prev.map((r) => (done.includes(r.id) ? { ...r, grade_visible: 1 } : r)));
        if (done.length < bulkEligible.length) {
            setActionError(l(`اتنشر ${done.length} من ${bulkEligible.length}. جرّب الباقي تاني.`, `Published ${done.length} of ${bulkEligible.length}. Try the rest again.`));
        }
        setBulkBusy(false);
        setConfirmBulk(false);
    };

    // Drawer navigation follows the current filtered order
    const openIndex = openId ? visible.findIndex((r) => r.id === openId) : -1;
    const current = openId ? results.find((r) => r.id === openId) ?? null : null;
    const goTo = (i: number) => { if (visible[i]) setParam("open", String(visible[i].id)); };

    // Arrow keys move between submissions while the drawer is open
    useEffect(() => {
        if (!current) return;
        const onKey = (e: KeyboardEvent) => {
            const forward = lang === "ar" ? "ArrowLeft" : "ArrowRight";
            const back = lang === "ar" ? "ArrowRight" : "ArrowLeft";
            if (e.key === forward) goTo(openIndex + 1);
            if (e.key === back) goTo(openIndex - 1);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    const filters: { value: Filter; label: string }[] = [
        { value: "all", label: l(`الكل (${results.length})`, `All (${results.length})`) },
        { value: "review", label: l(`تحتاج مراجعة (${reviewCount})`, `Needs review (${reviewCount})`) },
        { value: "unpublished", label: l(`غير منشورة (${unpublished.length})`, `Unpublished (${unpublished.length})`) },
        { value: "published", label: l("منشورة", "Published") },
    ];

    const Prev = lang === "ar" ? ChevronRight : ChevronLeft;
    const Next = lang === "ar" ? ChevronLeft : ChevronRight;

    return (
        <>
            <PageHeader
                title={l("النتائج", "Results")}
                description={l("كل إجابة مصحّحة تلقائياً. راجع، وبعدين انشر الدرجة للطالب.", "Every answer is graded automatically. Review it, then publish the grade to the student.")}
                actions={
                    <>
                        <Button variant="secondary" onClick={() => downloadCsv(visible, lang)} disabled={!visible.length}>
                            <Download className="size-4" aria-hidden />{l("تصدير Excel", "Export CSV")}
                        </Button>
                        {bulkEligible.length > 0 && (
                            <Button onClick={() => setConfirmBulk(true)}>
                                <Send className="size-4 rtl:-scale-x-100" aria-hidden />{l(`نشر ${bulkEligible.length} درجة`, `Publish ${bulkEligible.length} grades`)}
                            </Button>
                        )}
                    </>
                }
            />

            <StatStrip
                className="mb-6"
                items={[
                    { label: l("الإجابات", "Submissions"), value: results.length },
                    { label: l("المتوسط", "Average"), value: avg != null ? `${avg}%` : "—" },
                    { label: l("أعلى درجة", "Highest"), value: top != null ? `${formatScore(top)}%` : "—" },
                    { label: l("لم تُنشر بعد", "Not published"), value: unpublished.length },
                ]}
            />

            {(loadError || actionError) && <Alert tone="error" className="mb-6">{loadError || actionError}</Alert>}

            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <Segmented label={l("تصفية النتائج", "Filter results")} value={filter} onChange={(v) => setParam("filter", v)} options={filters} className="max-w-full overflow-x-auto" />
                <div className="relative lg:w-72">
                    <Input
                        icon={<Search />}
                        trailing={!!query}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={l("ابحث باسم الطالب أو رقمه", "Search by name or number")}
                        aria-label={l("بحث", "Search")}
                    />
                    {query && (
                        <button type="button" onClick={() => setQuery("")} aria-label={l("مسح البحث", "Clear search")}
                            className="absolute inset-y-0 end-1 my-auto flex size-9 items-center justify-center rounded-md text-ink-3 hover:text-ink">
                            <X className="size-4" aria-hidden />
                        </button>
                    )}
                </div>
            </div>

            <Panel className="overflow-hidden">
                {loading ? (
                    <ListSkeleton rows={6} />
                ) : visible.length === 0 ? (
                    <EmptyState
                        icon={<Inbox />}
                        title={results.length ? l("لا توجد نتائج مطابقة", "No matching results") : l("لا توجد إجابات بعد", "No submissions yet")}
                        body={results.length
                            ? l("جرّب تغيير الفلتر أو كلمة البحث.", "Try another filter or search term.")
                            : l("أرسل رابط سؤال للطلاب، وإجاباتهم هتظهر هنا مصحّحة.", "Send a question link to students — their graded answers land here.")}
                        action={results.length > 0 && (filter !== "all" || query) ? (
                            <Button variant="secondary" onClick={() => { setQuery(""); setParam("filter", "all"); }}>{l("عرض الكل", "Show all")}</Button>
                        ) : undefined}
                    />
                ) : (
                    <>
                        <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1.5fr)_7rem_5rem_11rem] gap-4 border-b border-rule bg-sheet-2 px-5 py-2.5 text-sm font-medium text-ink-2 md:grid">
                            <span>{l("الطالب", "Student")}</span>
                            <span>{l("السؤال", "Question")}</span>
                            <span>{l("التاريخ", "Date")}</span>
                            <span>{l("الدرجة", "Score")}</span>
                            <span>{l("الحالة", "Status")}</span>
                        </div>
                        <RuledList>
                            {visible.map((r) => {
                                const g = gradeOf(r.overall_score);
                                const flagged = needsReview(r);
                                return (
                                    <li key={r.id} className={cn("relative transition-colors hover:bg-sheet-2", openId === r.id && "bg-pen-wash/60")}>
                                        <button
                                            type="button"
                                            onClick={() => setParam("open", String(r.id))}
                                            className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-5 py-3.5 text-start md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.5fr)_7rem_5rem_11rem] md:gap-4"
                                            aria-label={l(`فتح إجابة ${r.student_name}`, `Open ${r.student_name}'s answer`)}
                                        >
                                            <span className="flex min-w-0 items-center gap-3 max-md:contents">
                                                <Avatar name={r.student_name} size="sm" />
                                                <span className="min-w-0">
                                                    <span className="block truncate font-semibold">{r.student_name}</span>
                                                    <span className="block text-xs text-ink-3 tabular ltr">{r.student_number}</span>
                                                </span>
                                            </span>
                                            <span className="truncate text-sm text-ink-2 max-md:col-span-3 max-md:col-start-2 max-md:row-start-2">{r.question_text || "—"}</span>
                                            <span className="hidden text-sm text-ink-2 md:block">{formatDate(r.submitted_at, lang)}</span>
                                            <span className="flex items-center gap-2 max-md:col-start-3 max-md:row-start-1">
                                                <ScoreMark score={r.overall_score} size="sm" plain className="w-auto" />
                                            </span>
                                            <span className="hidden flex-wrap gap-1.5 md:flex">
                                                {flagged && <Badge tone="warn">{l("مراجعة", "Review")}</Badge>}
                                                {g && !flagged && <Badge tone={g.tone}>{l(g.ar, g.en)}</Badge>}
                                                {r.grade_visible ? <Badge tone="pass">{l("منشورة", "Published")}</Badge> : null}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </RuledList>
                    </>
                )}
            </Panel>

            {/* Graded answer sheet */}
            <Drawer
                open={!!current}
                onClose={() => setParam("open", null)}
                label={l("ورقة الإجابة", "Answer sheet")}
                header={current && (
                    <div className="flex items-center gap-3">
                        <Avatar name={current.student_name} />
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">{current.student_name}</p>
                            <p className="text-xs text-ink-3 tabular">{current.student_number}</p>
                        </div>
                        {openIndex >= 0 && (
                            <span className="hidden text-sm text-ink-3 tabular sm:inline">{openIndex + 1} / {visible.length}</span>
                        )}
                        <div className="flex items-center">
                            <button type="button" className={buttonClasses("ghost", "icon-sm")} onClick={() => goTo(openIndex - 1)} disabled={openIndex <= 0} aria-label={l("الإجابة السابقة", "Previous answer")}>
                                <Prev className="size-5" aria-hidden />
                            </button>
                            <button type="button" className={buttonClasses("ghost", "icon-sm")} onClick={() => goTo(openIndex + 1)} disabled={openIndex < 0 || openIndex >= visible.length - 1} aria-label={l("الإجابة التالية", "Next answer")}>
                                <Next className="size-5" aria-hidden />
                            </button>
                            <button type="button" data-autofocus className={buttonClasses("ghost", "icon-sm")} onClick={() => setParam("open", null)} aria-label={l("إغلاق", "Close")}>
                                <X className="size-5" aria-hidden />
                            </button>
                        </div>
                    </div>
                )}
                footer={current && (
                    <>
                        <p className="text-sm text-ink-2">
                            {current.grade_visible
                                ? l("الطالب يقدر يشوف الدرجة دي.", "The student can see this grade.")
                                : l("الدرجة مخفية عن الطالب.", "This grade is hidden from the student.")}
                        </p>
                        {current.grade_visible ? (
                            <Button variant="secondary" loading={busyId === current.id} onClick={() => setVisibility(current.id, false)}>
                                <EyeOff className="size-4" aria-hidden />{l("إخفاء الدرجة", "Hide grade")}
                            </Button>
                        ) : (
                            <Button loading={busyId === current.id} onClick={() => setVisibility(current.id, true)} disabled={current.overall_score == null}>
                                <Eye className="size-4" aria-hidden />{l("نشر الدرجة للطالب", "Publish to student")}
                            </Button>
                        )}
                    </>
                )}
            >
                {current && (
                    <>
                        {needsReview(current) && (
                            <Alert tone="warning" className="mb-6" title={l("راجع قبل النشر", "Review before publishing")}>
                                {l("فيه ملاحظات على النزاهة أو الهوية. التفاصيل تحت.", "There are integrity or identity notes. Details below.")}
                            </Alert>
                        )}
                        <AnswerSheet key={current.id} s={current} viewer="lecturer" />
                    </>
                )}
            </Drawer>

            <Modal
                open={confirmBulk}
                onClose={() => !bulkBusy && setConfirmBulk(false)}
                size="sm"
                title={l(`نشر ${bulkEligible.length} درجة؟`, `Publish ${bulkEligible.length} grades?`)}
                description={l("هننشر الدرجات المصححة اللي مفيهاش ملاحظات نزاهة. اللي محتاجة مراجعة هتفضل مخفية.",
                    "We'll publish graded answers without integrity notes. Ones needing review stay hidden.")}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setConfirmBulk(false)} disabled={bulkBusy}>{l("إلغاء", "Cancel")}</Button>
                        <Button onClick={publishAll} loading={bulkBusy}>{l("نشر الدرجات", "Publish grades")}</Button>
                    </>
                }
            />
        </>
    );
}
