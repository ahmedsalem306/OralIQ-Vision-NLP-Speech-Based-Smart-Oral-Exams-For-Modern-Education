import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    ClipboardList, Users, BarChart2, Clock, ArrowRight,
    CheckCircle2, Mic, BookOpen, Plus, TrendingUp, Award
} from "lucide-react";
import api from "../lib/api";
import { useI18n } from "../i18n";

interface AssignedExam {
    id: number;
    exam_id: number;
    exam_title: string | null;
    exam_token: string | null;
    assigned_by_name: string | null;
    status: string;
    assigned_at: string;
}

interface Submission {
    id: number;
    student_name: string;
    exam_title: string | null;
    overall_score: number | null;
    submitted_at: string;
}

const scoreColor = (s: number) => s >= 75 ? "#5ec269" : s >= 50 ? "#e0a030" : "#e05555";
const scoreBg = (s: number) => s >= 75 ? "rgba(94,194,105,0.09)" : s >= 50 ? "rgba(224,160,48,0.09)" : "rgba(224,85,85,0.09)";
const scoreBorder = (s: number) => s >= 75 ? "rgba(94,194,105,0.22)" : s >= 50 ? "rgba(224,160,48,0.22)" : "rgba(224,85,85,0.22)";

function StatTile({ label, value, icon: Icon, color, delay = 0 }: { label: string; value: string | number; icon: any; color: string; delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ background: "#141414", border: "1px solid rgba(207,163,85,0.08)", borderRadius: "0.875rem", padding: "1.375rem 1.5rem" }}
        >
            <div style={{ width: 34, height: 34, borderRadius: "0.6rem", background: `${color}16`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
                <Icon size={17} color={color} />
            </div>
            <div style={{ fontSize: "1.625rem", fontWeight: 800, color: "#e5e5e0", fontFamily: "'Orbitron', sans-serif", lineHeight: 1, marginBottom: "0.375rem" }}>{value}</div>
            <div style={{ fontSize: "0.7rem", color: "#5a5a4a", textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>{label}</div>
        </motion.div>
    );
}

export default function Overview() {
    const { t, dir } = useI18n();
    const navigate = useNavigate();
    const [user, setUser] = useState<{ full_name: string; role: string } | null>(null);
    const [stats, setStats] = useState({ exams: 0, submissions: 0, avgScore: 0, pending: 0, completed: 0 });
    const [recentSubs, setRecentSubs] = useState<Submission[]>([]);
    const [assignedExams, setAssignedExams] = useState<AssignedExam[]>([]);
    const [loading, setLoading] = useState(true);
    const G = "rgba(207,163,85,";

    useEffect(() => {
        api.get("/users/me").then(res => {
            setUser(res.data);
            const isLec = ["lecturer", "hr", "admin"].includes(res.data.role);

            if (isLec) {
                Promise.all([
                    api.get("/exams/my-exams").catch(() => ({ data: [] })),
                    api.get("/exams/all-results").catch(() => ({ data: [] })),
                ]).then(([exR, resR]) => {
                    const exams = exR.data as any[];
                    const results: Submission[] = resR.data;
                    const scored = results.filter(r => r.overall_score != null);
                    const avg = scored.length
                        ? Math.round(scored.reduce((s, r) => s + (r.overall_score ?? 0), 0) / scored.length)
                        : 0;
                    setStats({
                        exams: exams.length,
                        submissions: results.length,
                        avgScore: avg,
                        pending: results.filter(r => r.overall_score == null).length,
                        completed: scored.length,
                    });
                    setRecentSubs(results.slice(0, 6));
                    setLoading(false);
                });
            } else {
                api.get("/exams/my-assignments").then(r => {
                    const all: AssignedExam[] = r.data;
                    const pending = all.filter(a => a.status === "pending");
                    const completed = all.filter(a => a.status === "completed");
                    setStats({ exams: pending.length, submissions: all.length, avgScore: 0, pending: pending.length, completed: completed.length });
                    setAssignedExams(pending);
                    setLoading(false);
                }).catch(() => setLoading(false));
            }
        }).catch((err) => {
            const status = err?.response?.status;
            if (status === 401 || status === 403) {
                localStorage.removeItem("token");
                navigate("/login", { replace: true });
            }
            setLoading(false);
        });
    }, []);

    const isLecturer = user && ["lecturer", "hr", "admin"].includes(user.role);

    const startExam = (token: string | null) => {
        if (token) { localStorage.setItem("pendingExamToken", token); navigate("/exam/start"); }
    };

    if (loading) return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
            <div style={{ width: 26, height: 26, border: "2px solid rgba(207,163,85,0.12)", borderTopColor: "#cfa355", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        </div>
    );

    return (
        <div style={{ maxWidth: 1100, margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>

            {/* Page header */}
            <div style={{ marginBottom: "2rem" }}>
                <h1 style={{ fontSize: "1.375rem", fontWeight: 800, color: "#e5e5e0", marginBottom: "0.2rem" }}>
                    {isLecturer ? t("overview.lecturerTitle") : t("overview.studentTitle")}
                </h1>
                <p style={{ color: "#4a4a3a", fontSize: "0.85rem" }}>
                    {t("overview.welcome")}, <span style={{ color: "#cfa355" }}>{user?.full_name}</span>
                </p>
            </div>

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                {isLecturer ? (
                    <>
                        <StatTile label={t("overview.examsCreated")} value={stats.exams} icon={ClipboardList} color="#cfa355" delay={0} />
                        <StatTile label={t("overview.submissions")} value={stats.submissions} icon={Users} color="#e8c97a" delay={0.05} />
                        <StatTile label={t("overview.avgScore")} value={stats.avgScore ? `${stats.avgScore}%` : "—"} icon={BarChart2} color="#5ec269" delay={0.1} />
                        <StatTile label={t("overview.pendingAi")} value={stats.pending} icon={Clock} color="#e0a030" delay={0.15} />
                    </>
                ) : (
                    <>
                        <StatTile label={t("overview.myExams")} value={stats.pending} icon={Clock} color="#e0a030" delay={0} />
                        <StatTile label={dir === "rtl" ? "مكتملة" : "Completed"} value={stats.completed} icon={CheckCircle2} color="#5ec269" delay={0.05} />
                        <StatTile label={dir === "rtl" ? "إجمالي المرسل" : "Total Assigned"} value={stats.submissions} icon={ClipboardList} color="#cfa355" delay={0.1} />
                    </>
                )}
            </div>

            {/* ── LECTURER view ── */}
            {isLecturer && (
                <>
                    {/* Quick actions */}
                    <div style={{ display: "flex", gap: "0.625rem", marginBottom: "2rem", flexWrap: "wrap" }}>
                        <button onClick={() => navigate("/dashboard/questions")}
                            style={{ display: "flex", alignItems: "center", gap: "0.45rem", padding: "0.6rem 1.1rem", background: "linear-gradient(135deg, #cfa355, #e0b86b)", border: "none", borderRadius: "0.65rem", color: "#0a0a0a", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                            <Plus size={14} /> {t("dashboard.questions.new")}
                        </button>
                        <button onClick={() => navigate("/dashboard/results")}
                            style={{ display: "flex", alignItems: "center", gap: "0.45rem", padding: "0.6rem 1.1rem", background: `${G}0.05)`, border: `1px solid ${G}0.14)`, borderRadius: "0.65rem", color: "#cfa355", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                            <BarChart2 size={14} /> {t("nav.results")}
                        </button>
                        <button onClick={() => navigate("/dashboard/analytics")}
                            style={{ display: "flex", alignItems: "center", gap: "0.45rem", padding: "0.6rem 1.1rem", background: `${G}0.05)`, border: `1px solid ${G}0.14)`, borderRadius: "0.65rem", color: "#cfa355", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                            <TrendingUp size={14} /> {t("nav.analytics")}
                        </button>
                    </div>

                    {/* Recent submissions */}
                    {recentSubs.length > 0 ? (
                        <div>
                            <p style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#3a3a2a", marginBottom: "0.875rem" }}>
                                {dir === "rtl" ? "آخر الإجابات" : "Recent Submissions"}
                            </p>
                            <div style={{ background: "#141414", border: `1px solid ${G}0.08)`, borderRadius: "0.875rem", overflow: "hidden" }}>
                                {recentSubs.map((s, i) => (
                                    <div key={s.id} style={{
                                        display: "flex", alignItems: "center", gap: "0.875rem",
                                        padding: "0.875rem 1.25rem",
                                        borderBottom: i < recentSubs.length - 1 ? `1px solid ${G}0.05)` : "none",
                                        transition: "background 0.15s",
                                    }}
                                        className="hover:bg-[rgba(207,163,85,0.025)]">
                                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #cfa355, #e8c97a)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <span style={{ color: "#0a0a0a", fontWeight: 800, fontSize: "0.72rem" }}>{s.student_name?.[0]?.toUpperCase() || "?"}</span>
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#d0d0c0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.student_name}</p>
                                            <p style={{ fontSize: "0.7rem", color: "#4a4a3a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.exam_title || "Untitled Exam"}</p>
                                        </div>
                                        {s.overall_score != null ? (
                                            <span style={{
                                                padding: "0.18rem 0.6rem", borderRadius: "999px",
                                                background: scoreBg(s.overall_score),
                                                border: `1px solid ${scoreBorder(s.overall_score)}`,
                                                color: scoreColor(s.overall_score),
                                                fontSize: "0.72rem", fontWeight: 700, flexShrink: 0,
                                            }}>
                                                {Math.round(s.overall_score)}%
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: "0.7rem", color: "#3a3a2a", flexShrink: 0 }}>Processing</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => navigate("/dashboard/results")}
                                style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.75rem", color: "#cfa355", background: "none", border: "none", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, padding: 0 }}>
                                {dir === "rtl" ? "عرض كل النتائج" : "View all results"} <ArrowRight size={12} />
                            </button>
                        </div>
                    ) : (
                        <div style={{ textAlign: "center", padding: "3rem 2rem", background: "#141414", border: `1px dashed ${G}0.1)`, borderRadius: "0.875rem" }}>
                            <Award size={30} color="#2a2a1a" style={{ marginBottom: "0.75rem" }} />
                            <p style={{ color: "#4a4a3a", fontSize: "0.875rem" }}>{dir === "rtl" ? "لا توجد إجابات بعد." : "No submissions yet."}</p>
                            <p style={{ color: "#2a2a1a", fontSize: "0.775rem", marginTop: "0.3rem" }}>{dir === "rtl" ? "أنشئ امتحاناً وأرسله للطلاب للبدء." : "Create an exam and assign it to students to get started."}</p>
                        </div>
                    )}
                </>
            )}

            {/* ── STUDENT view ── */}
            {!isLecturer && (
                assignedExams.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "4rem 2rem", background: "#141414", border: `1px solid ${G}0.07)`, borderRadius: "0.875rem" }}>
                        <BookOpen size={34} color="#2a2a1a" style={{ marginBottom: "1rem" }} />
                        <p style={{ color: "#4a4a3a", fontSize: "0.9rem", marginBottom: "0.3rem" }}>{dir === "rtl" ? "لا توجد امتحانات معلقة." : "No pending exams."}</p>
                        <p style={{ color: "#2a2a1a", fontSize: "0.775rem" }}>{dir === "rtl" ? "سيظهر هنا أي امتحان يرسله المحاضر." : "Your lecturer will assign you an exam soon."}</p>
                    </div>
                ) : (
                    <div>
                        <p style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#3a3a2a", marginBottom: "0.875rem" }}>
                            {dir === "rtl" ? "امتحانات معلقة" : "Pending Exams"}
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            {assignedExams.map((exam, i) => (
                                <motion.div key={exam.id}
                                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.06 }}
                                    whileHover={{ y: -1 }}
                                    style={{ background: "#141414", border: `1px solid ${G}0.1)`, borderRadius: "0.875rem", padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1.125rem" }}>
                                    <div style={{ width: 42, height: 42, borderRadius: "0.75rem", background: `${G}0.07)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <Mic size={19} color="#cfa355" />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3 style={{ fontSize: "0.925rem", fontWeight: 700, color: "#d8d8c8", marginBottom: "0.2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {exam.exam_title || "Oral Exam"}
                                        </h3>
                                        <p style={{ fontSize: "0.72rem", color: "#4a4a3a" }}>By {exam.assigned_by_name || "Lecturer"}</p>
                                    </div>
                                    <button onClick={() => startExam(exam.exam_token)}
                                        style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.575rem 1.1rem", background: "linear-gradient(135deg, #cfa355, #e0b86b)", border: "none", borderRadius: "0.6rem", color: "#0a0a0a", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", flexShrink: 0, fontFamily: "'Inter', sans-serif" }}>
                                        {t("overview.startExam")} <ArrowRight size={13} />
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )
            )}
        </div>
    );
}
