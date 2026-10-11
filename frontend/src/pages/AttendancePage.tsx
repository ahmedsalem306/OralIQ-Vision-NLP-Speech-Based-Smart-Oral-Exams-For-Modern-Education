import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Search } from "lucide-react";
import api from "../lib/api";
import { useI18n } from "../i18n";
import { Panel, PageHeader, StatStrip } from "../components/ui/panel";
import { Alert, EmptyState, ListSkeleton, Segmented } from "../components/ui/feedback";
import { Avatar } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { formatScore } from "../lib/grades";
import { formatDate, formatDuration, parseServerDate, timeAgo } from "../lib/format";
import { getApiErrorMessage } from "../lib/apiErrors";

interface AttendanceRecord {
    id: number;
    student_name: string;
    email: string;
    assigned_at: string | null;
    started_at: string | null;
    finished_at: string | null;
    status: string;
    score: number | null;
    question_title: string;
}

type Filter = "all" | "completed" | "pending";
const REFRESH_MS = 30_000;

export default function AttendancePage() {
    const { l, lang } = useI18n();
    const [rows, setRows] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<Filter>("all");
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);

    useEffect(() => {
        const load = () =>
            api.get("/exams/attendance")
                .then((res) => { setRows(res.data); setUpdatedAt(new Date().toISOString()); setError(""); })
                .catch((err) => setError(getApiErrorMessage(err, l("تعذّر تحديث الحضور.", "Couldn't refresh attendance."))))
                .finally(() => setLoading(false));
        load();
        const t = setInterval(load, REFRESH_MS);
        return () => clearInterval(t);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const completed = rows.filter((r) => r.status === "completed").length;
    const pending = rows.length - completed;

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return rows
            .filter((r) => filter === "all" || (filter === "completed" ? r.status === "completed" : r.status !== "completed"))
            .filter((r) => !q || (r.student_name || "").toLowerCase().includes(q) || (r.email || "").toLowerCase().includes(q))
            .sort((a, b) => (parseServerDate(b.finished_at || b.assigned_at)?.getTime() ?? 0) - (parseServerDate(a.finished_at || a.assigned_at)?.getTime() ?? 0));
    }, [rows, filter, query]);

    const duration = (r: AttendanceRecord) => {
        const s = parseServerDate(r.started_at);
        const e = parseServerDate(r.finished_at);
        return s && e && e > s ? formatDuration((e.getTime() - s.getTime()) / 1000) : "—";
    };

    return (
        <>
            <PageHeader
                title={l("الحضور", "Attendance")}
                description={l("مين دخل امتحاناتك ومين لسه. الصفحة بتتحدث لوحدها كل 30 ثانية.", "Who has taken your exams and who hasn't. Refreshes every 30 seconds.")}
                actions={updatedAt && <span className="text-sm text-ink-3" aria-live="polite">{l(`آخر تحديث ${timeAgo(updatedAt, lang)}`, `Updated ${timeAgo(updatedAt, lang)}`)}</span>}
            />

            {error && <Alert tone="error" className="mb-6">{error}</Alert>}

            <StatStrip
                className="mb-6 sm:grid-cols-3"
                items={[
                    { label: l("المطلوب", "Expected"), value: rows.length },
                    { label: l("خلّصوا", "Completed"), value: completed, hint: rows.length ? l(`${Math.round((completed / rows.length) * 100)}% من المطلوب`, `${Math.round((completed / rows.length) * 100)}% of expected`) : undefined },
                    { label: l("لسه", "Not yet"), value: pending },
                ]}
            />

            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <Segmented
                    label={l("تصفية الحضور", "Filter attendance")}
                    value={filter}
                    onChange={setFilter}
                    className="self-start"
                    options={[
                        { value: "all", label: l("الكل", "All") },
                        { value: "completed", label: l("خلّصوا", "Completed") },
                        { value: "pending", label: l("لسه", "Not yet") },
                    ]}
                />
                <Input icon={<Search />} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={l("ابحث باسم الطالب", "Search by student")} aria-label={l("بحث", "Search")} className="lg:w-72" />
            </div>

            <Panel className="overflow-x-auto">
                {loading ? (
                    <ListSkeleton rows={5} />
                ) : visible.length === 0 ? (
                    <EmptyState
                        icon={<CalendarCheck />}
                        title={rows.length ? l("مفيش نتائج مطابقة", "No matching rows") : l("لسه محدش اتبعتله امتحان", "No exams sent yet")}
                        body={rows.length ? l("جرّب فلتر أو بحث تاني.", "Try a different filter or search.") : l("ابعت امتحان لطالب من صفحة الأسئلة، وحضوره هيظهر هنا.", "Send an exam to a student from the Questions page and attendance shows up here.")}
                    />
                ) : (
                    <table className="w-full min-w-[720px] text-sm">
                        <thead className="bg-sheet-2 text-ink-2">
                            <tr>
                                <th scope="col" className="px-5 py-2.5 text-start font-medium">{l("الطالب", "Student")}</th>
                                <th scope="col" className="px-3 py-2.5 text-start font-medium">{l("الامتحان", "Exam")}</th>
                                <th scope="col" className="px-3 py-2.5 text-start font-medium">{l("الحالة", "Status")}</th>
                                <th scope="col" className="px-3 py-2.5 text-start font-medium">{l("وقت الدخول", "Started")}</th>
                                <th scope="col" className="px-3 py-2.5 text-end font-medium">{l("المدة", "Duration")}</th>
                                <th scope="col" className="px-5 py-2.5 text-end font-medium">{l("الدرجة", "Score")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-rule">
                            {visible.map((r) => {
                                const done = r.status === "completed";
                                return (
                                    <tr key={`${r.id}-${r.question_title}`} className="hover:bg-sheet-2">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={r.student_name} size="sm" />
                                                <div className="min-w-0">
                                                    <p className="truncate font-semibold">{r.student_name}</p>
                                                    {r.email && <p className="truncate text-xs text-ink-3 ltr">{r.email}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="max-w-56 truncate px-3 py-3 text-ink-2">{r.question_title}</td>
                                        <td className="px-3 py-3">{done ? <Badge tone="pass">{l("خلّص", "Completed")}</Badge> : <Badge tone="warn">{l("لسه", "Not yet")}</Badge>}</td>
                                        <td className="px-3 py-3 text-ink-2">{r.started_at ? formatDate(r.started_at, lang, true) : <span className="text-ink-3">{l(`اتبعت ${timeAgo(r.assigned_at, lang)}`, `Sent ${timeAgo(r.assigned_at, lang)}`)}</span>}</td>
                                        <td className="px-3 py-3 text-end tabular text-ink-2">{duration(r)}</td>
                                        <td className="px-5 py-3 text-end font-semibold tabular">{r.score != null ? `${formatScore(r.score)}%` : "—"}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </Panel>
        </>
    );
}
