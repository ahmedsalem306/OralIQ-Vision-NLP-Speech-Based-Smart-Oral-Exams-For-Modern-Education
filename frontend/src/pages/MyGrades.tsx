import { useEffect, useMemo, useState } from "react";
import { Award, TrendingUp, Trophy, X } from "lucide-react";
import api from "../lib/api";
import { useI18n } from "../i18n";
import { Panel, PageHeader, RuledList, StatStrip } from "../components/ui/panel";
import { Alert, Drawer, EmptyState, ListSkeleton } from "../components/ui/feedback";
import { Badge } from "../components/ui/badge";
import { ScoreMark } from "../components/ui/score-mark";
import { buttonClasses, ButtonLink } from "../components/ui/button";
import { AnswerSheet } from "../components/AnswerSheet";
import { gradeOf, formatScore } from "../lib/grades";
import { formatDate, parseServerDate } from "../lib/format";
import { getApiErrorMessage } from "../lib/apiErrors";
import type { Submission } from "../lib/types";

export default function MyGrades() {
    const { l, lang } = useI18n();
    const [grades, setGrades] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [openId, setOpenId] = useState<number | null>(null);

    useEffect(() => {
        api.get("/exams/my-grades")
            .then((res) => setGrades(res.data))
            .catch((err) => setError(getApiErrorMessage(err, l("تعذّر تحميل درجاتك.", "Couldn't load your grades."))))
            .finally(() => setLoading(false));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const sorted = useMemo(
        () => [...grades].sort((a, b) => (parseServerDate(b.submitted_at)?.getTime() ?? 0) - (parseServerDate(a.submitted_at)?.getTime() ?? 0)),
        [grades],
    );
    const scored = grades.filter((g) => g.overall_score != null);
    const avg = scored.length ? scored.reduce((s, g) => s + (g.overall_score ?? 0), 0) / scored.length : null;
    const best = scored.length ? Math.max(...scored.map((g) => g.overall_score ?? 0)) : null;
    const current = grades.find((g) => g.id === openId) ?? null;

    const title = (g: Submission) => g.question_text || l(`امتحان ${formatDate(g.submitted_at, lang)}`, `Exam on ${formatDate(g.submitted_at, lang)}`);

    return (
        <>
            <PageHeader
                title={l("درجاتي", "My grades")}
                description={l("بتظهر هنا الدرجات اللي المحاضر راجعها ونشرها.", "Grades show up here once your lecturer reviews and publishes them.")}
            />

            {error && <Alert tone="error" className="mb-6">{error}</Alert>}

            {scored.length > 1 && (
                <StatStrip
                    className="mb-6 sm:grid-cols-3"
                    items={[
                        { label: l("امتحانات منشورة", "Published"), value: grades.length, icon: Award, tone: "pen" },
                        { label: l("متوسطك", "Your average"), value: avg != null ? `${formatScore(avg)}%` : "—", icon: TrendingUp, tone: "teal" },
                        { label: l("أعلى درجة", "Best"), value: best != null ? `${formatScore(best)}%` : "—", icon: Trophy, tone: "violet" },
                    ]}
                />
            )}

            <Panel className="overflow-hidden">
                {loading ? (
                    <ListSkeleton rows={3} />
                ) : sorted.length === 0 ? (
                    <EmptyState
                        icon={<Award />}
                        title={l("مفيش درجات منشورة لسه", "No published grades yet")}
                        body={l("بعد ما تخلص امتحان، المحاضر بيراجع الإجابة وينشر الدرجة. هتلاقيها هنا.", "After you finish an exam, your lecturer reviews it and publishes the grade here.")}
                        action={<ButtonLink to="/dashboard" variant="secondary">{l("امتحاناتي", "My exams")}</ButtonLink>}
                    />
                ) : (
                    <RuledList>
                        {sorted.map((g) => {
                            const info = gradeOf(g.overall_score);
                            return (
                                <li key={g.id}>
                                    <button
                                        type="button"
                                        onClick={() => setOpenId(g.id)}
                                        className="flex w-full items-center gap-4 px-5 py-4 text-start transition-colors hover:bg-sheet-2"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold leading-snug">{title(g)}</p>
                                            <p className="mt-1 text-sm text-ink-3">{formatDate(g.submitted_at, lang)}</p>
                                        </div>
                                        {info && <Badge tone={info.tone} className="hidden sm:inline-flex">{l(info.ar, info.en)}</Badge>}
                                        <ScoreMark score={g.overall_score} size="md" />
                                    </button>
                                </li>
                            );
                        })}
                    </RuledList>
                )}
            </Panel>

            <Drawer
                open={!!current}
                onClose={() => setOpenId(null)}
                label={l("تفاصيل الدرجة", "Grade details")}
                header={
                    <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">{l("تفاصيل الدرجة", "Grade details")}</p>
                        <button type="button" data-autofocus className={buttonClasses("ghost", "icon-sm")} onClick={() => setOpenId(null)} aria-label={l("إغلاق", "Close")}>
                            <X className="size-5" aria-hidden />
                        </button>
                    </div>
                }
            >
                {current && <AnswerSheet key={current.id} s={{ ...current, question_text: current.question_text || title(current) }} viewer="student" />}
            </Drawer>
        </>
    );
}
