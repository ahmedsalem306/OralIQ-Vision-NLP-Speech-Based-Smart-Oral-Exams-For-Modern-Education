import React, { useState, useEffect } from "react";
import { Users, TrendingUp, Clock, Award, ChevronRight, Share2, CheckCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../lib/api";
import { useI18n } from "../i18n";

interface ExamSubmission {
    id: number;
    student_name: string;
    student_number: string;
    question_text?: string;
    question_category?: string;
    transcript?: string;
    nlp_score: number | null;
    speech_score: number | null;
    facial_score: number | null;
    overall_score: number | null;
    cheat_report?: string;
    fluency_report?: string;
    grade_visible: number;
    started_at?: string;
    submitted_at: string;
    finished_at?: string;
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const formatTime = (dateStr?: string) => {
    if (!dateStr) return "—";
    const d = (!dateStr.includes('Z') && !dateStr.includes('+'))
        ? new Date(dateStr.replace(' ', 'T') + 'Z')
        : new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const getDuration = (start?: string, end?: string, preciseEnd?: string) => {
    const finalEnd = preciseEnd || end;
    if (!start || !finalEnd) return "—";
    const s = (!start.includes('Z') && !start.includes('+')) ? new Date(start.replace(' ', 'T') + 'Z') : new Date(start);
    const e = (!finalEnd.includes('Z') && !finalEnd.includes('+')) ? new Date(finalEnd.replace(' ', 'T') + 'Z') : new Date(finalEnd);
    const diff = e.getTime() - s.getTime();
    if (diff < 0) return "—";
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}m ${secs}s`;
};

function ScoreBadge({ score }: { score: number | null }) {
    if (score === null) return <span style={{ color: "#8b8b73" }}>N/A</span>;
    const color = score >= 80 ? "#e8c97a" : score >= 60 ? "#cfa355" : "#e05555";
    const bg = score >= 80 ? "rgba(0,212,170,0.12)" : score >= 60 ? "rgba(207,163,85,0.12)" : "rgba(255,77,109,0.12)";
    return (
        <span style={{ background: bg, color, padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.85rem", fontWeight: 700 }}>
            {score.toFixed(1)}%
        </span>
    );
}

export default function LecturerResults() {
    const { t, dir } = useI18n();
    const [results, setResults] = useState<ExamSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [postingId, setPostingId] = useState<number | null>(null);

    useEffect(() => {
        fetchResults();
    }, []);

    const fetchResults = () => {
        api.get("/exams/all-results")
            .then(res => setResults(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    const toggleExpand = (id: number) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const handlePostGrade = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setPostingId(id);
        try {
            await api.patch(`/exams/submissions/${id}/visibility?visible=true`);
            setResults(prev => prev.map(r => r.id === id ? { ...r, grade_visible: 1 } : r));
        } catch (err) {
            console.error("Failed to post grade:", err);
        } finally {
            setPostingId(null);
        }
    };

    // Compute stats
    const totalStudents = results.length;
    const scores = results.map(r => r.overall_score || 0);
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const topScore = scores.length ? Math.max(...scores) : 0;

    const thisWeekCount = results.filter(r => {
        const d = new Date(r.submitted_at);
        const now = new Date();
        const diffDays = Math.ceil(Math.abs(now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
    }).length;

    if (loading) return (
        <div style={{ color: "#8b8b73", padding: "2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: 24, height: 24, border: "2px solid rgba(207,163,85,0.1)", borderTopColor: "#cfa355", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            {dir === "rtl" ? "جاري تحميل النتائج..." : "Loading results..."}
        </div>
    );

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            style={{ display: "flex", flexDirection: "column", gap: "2rem", fontFamily: "'Inter', sans-serif" }}
        >
            <motion.div variants={itemVariants}>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#e5e5e0", marginBottom: "0.25rem" }}>{t("nav.results")}</h1>
                <p style={{ color: "#8b8b73", fontSize: "0.9rem" }}>AI-analyzed performance reports for all your students</p>
            </motion.div>

            <motion.div variants={itemVariants} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
                {[
                    { icon: Users, label: dir === "rtl" ? "إجمالي الطلاب" : "Total Students", value: totalStudents, color: "#cfa355" },
                    { icon: TrendingUp, label: t("overview.avgScore"), value: `${avgScore}%`, color: "#e8c97a" },
                    { icon: Award, label: dir === "rtl" ? "أعلى درجة" : "Top Score", value: `${topScore}%`, color: "#e8c97a" },
                    { icon: Clock, label: dir === "rtl" ? "هذا الأسبوع" : "This Week", value: thisWeekCount, color: "#e05555" },
                ].map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={idx}
                            whileHover={{ y: -5, scale: 1.02 }}
                            style={{ background: "#141414", border: "1px solid rgba(207,163,85,0.15)", borderRadius: "1rem", padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
                        >
                            <div style={{ width: 44, height: 44, borderRadius: "0.75rem", background: `${stat.color}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Icon size={20} color={stat.color} />
                            </div>
                            <div>
                                <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "#e5e5e0" }}>{stat.value}</p>
                                <p style={{ fontSize: "0.75rem", color: "#8b8b73" }}>{stat.label}</p>
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>

            <motion.div variants={itemVariants} style={{ background: "#141414", border: "1px solid rgba(207,163,85,0.15)", borderRadius: "1.25rem", overflow: "hidden", boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>
                <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(207,163,85,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#e5e5e0" }}>{dir === "rtl" ? "إجابات الطلاب" : "Student Submissions"}</h2>
                    <span style={{ fontSize: "0.8rem", color: "#8b8b73" }}>{totalStudents} {t("nav.results")}</span>
                </div>

                {totalStudents === 0 ? (
                    <div style={{ padding: "3rem", textAlign: "center", color: "#8b8b73" }}>No student submissions found.</div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid rgba(207,163,85,0.1)" }}>
                                    {[
                                        dir === "rtl" ? "الطالب" : "Student",
                                        dir === "rtl" ? "التاريخ" : "Date",
                                        t("exam.finalScore"),
                                        dir === "rtl" ? "الإجراءات" : "Actions",
                                        dir === "rtl" ? "الحالة" : "Status",
                                        "",
                                    ].map(h => (
                                        <th key={h} style={{ padding: "1rem 1.5rem", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#8b8b73", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((r, idx) => {
                                    const isExpanded = expandedId === r.id;
                                    return (
                                        <React.Fragment key={r.id}>
                                            <motion.tr
                                                onClick={() => toggleExpand(r.id)}
                                                whileHover={{ background: "rgba(207,163,85,0.04)" }}
                                                style={{ borderBottom: isExpanded ? "none" : (idx < results.length - 1 ? "1px solid rgba(207,163,85,0.06)" : "none"), cursor: "pointer", background: isExpanded ? "rgba(207,163,85,0.04)" : "transparent", transition: "background 0.2s" }}
                                            >
                                                <td style={{ padding: "1rem 1.5rem" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #cfa355, #e8c97a)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.85rem", boxShadow: "0 4px 10px rgba(207,163,85,0.2)" }}>
                                                            {r.student_name ? r.student_name[0] : "?"}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 600, color: "#e5e5e0", fontSize: "0.9rem" }}>{r.student_name}</div>
                                                            <div style={{ fontSize: "0.7rem", color: "#cfa355", fontWeight: 700 }}>{r.student_number}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: "1rem 1.5rem", color: "#8b8b73", fontSize: "0.85rem" }}>{new Date(r.submitted_at).toLocaleDateString()}</td>
                                                <td style={{ padding: "1rem 1.5rem" }}><ScoreBadge score={r.overall_score} /></td>
                                                <td style={{ padding: "1rem 1.5rem" }}>
                                                    {r.grade_visible === 1 ? (
                                                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#e8c97a", fontSize: "0.8rem", fontWeight: 700 }}>
                                                            <CheckCircle size={14} /> Shared
                                                        </div>
                                                    ) : (
                                                        <motion.button
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            disabled={postingId === r.id}
                                                            onClick={(e) => handlePostGrade(r.id, e)}
                                                            style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.8rem", background: "rgba(207,163,85,0.1)", border: "1px solid rgba(207,163,85,0.3)", borderRadius: "0.5rem", color: "#cfa355", fontSize: "0.75rem", fontWeight: 800, cursor: "pointer" }}
                                                        >
                                                            {postingId === r.id ? <Loader2 size={12} className="animate-spin" /> : <Share2 size={12} />}
                                                            {dir === "rtl" ? "نشر الدرجة" : "Post Grade"}
                                                        </motion.button>
                                                    )}
                                                </td>
                                                <td style={{ padding: "1rem 1.5rem" }}>
                                                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: (r.facial_score !== null && r.facial_score < 85 && (r.nlp_score || 0) >= 50) ? "#e8c97a" : (r.overall_score || 0) >= 80 ? "#e8c97a" : (r.overall_score || 0) >= 60 ? "#cfa355" : "#e05555" }}>
                                                        {(r.facial_score !== null && r.facial_score < 85 && (r.nlp_score || 0) >= 50) ? "إجابة صحيحة ولكن غاشش" : (r.overall_score || 0) >= 80 ? "Excellent" : (r.overall_score || 0) >= 60 ? "Good" : "Needs Work"}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "1rem 1.5rem" }}>
                                                    <ChevronRight size={18} color="#cfa355" style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
                                                </td>
                                            </motion.tr>
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.tr
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        style={{ background: "rgba(207,163,85,0.02)" }}
                                                    >
                                                        <td colSpan={6} style={{ padding: "1.5rem 2rem 2.5rem" }}>
                                                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
                                                                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                                                                    <div>
                                                                        <p style={{ fontSize: "0.7rem", fontWeight: 800, color: "#cfa355", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>{t("dashboard.questions.question")}</p>
                                                                        <p style={{ fontSize: "0.95rem", color: "#e5e5e0", lineHeight: 1.6 }}>{r.question_text}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p style={{ fontSize: "0.7rem", fontWeight: 800, color: "#e8c97a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>{dir === "rtl" ? "تفريغ إجابة الطالب" : "Student Transcript"}</p>
                                                                        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "1rem", padding: "1.25rem", color: "#e5e5e0", fontSize: "1rem", lineHeight: 1.8, direction: "rtl" }}>
                                                                            {r.transcript || "No transcription available."}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                                                                    <div>
                                                                        <p style={{ fontSize: "0.7rem", fontWeight: 800, color: "#e8c97a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>{t("exam.fluency")}</p>
                                                                        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "1rem", padding: "1.25rem", color: "#e5e5e0", fontSize: "0.85rem", lineHeight: 1.6, whiteSpace: "pre-wrap", direction: "rtl" }}>
                                                                            {r.fluency_report}
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <p style={{ fontSize: "0.7rem", fontWeight: 800, color: "#e05555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>{t("exam.integrity")}</p>
                                                                        <div style={{ background: "rgba(255,77,109,0.05)", border: "1px solid rgba(255,77,109,0.2)", borderRadius: "1rem", padding: "1.25rem", color: "#e05555", fontSize: "0.9rem", lineHeight: 1.6, direction: "rtl" }}>
                                                                            {r.cheat_report}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", background: "rgba(207,163,85,0.03)", padding: "1.25rem", borderRadius: "1rem", border: "1px solid rgba(207,163,85,0.1)" }}>
                                                                    <p style={{ fontSize: "0.7rem", fontWeight: 800, color: "#cfa355", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>Time Tracking</p>
                                                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                                                        <div>
                                                                            <p style={{ fontSize: "0.65rem", color: "#8b8b73", marginBottom: "0.25rem" }}>Entry Time</p>
                                                                            <p style={{ fontSize: "0.9rem", color: "#e5e5e0", fontWeight: 600 }}>
                                                                                {formatTime(r.started_at)}
                                                                            </p>
                                                                        </div>
                                                                        <div>
                                                                            <p style={{ fontSize: "0.65rem", color: "#8b8b73", marginBottom: "0.25rem" }}>Exit Time</p>
                                                                            <p style={{ fontSize: "0.9rem", color: "#e5e5e0", fontWeight: 600 }}>
                                                                                {formatTime(r.finished_at || r.submitted_at)}
                                                                            </p>
                                                                        </div>
                                                                        <div style={{ gridColumn: "span 2" }}>
                                                                            <p style={{ fontSize: "0.65rem", color: "#8b8b73", marginBottom: "0.25rem" }}>Total Duration</p>
                                                                            <p style={{ fontSize: "0.9rem", color: "#e8c97a", fontWeight: 700 }}>
                                                                                {getDuration(r.started_at, r.submitted_at, r.finished_at)}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                )}
                                            </AnimatePresence>
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}

