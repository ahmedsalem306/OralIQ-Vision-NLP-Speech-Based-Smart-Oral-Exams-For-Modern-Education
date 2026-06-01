import { useState, useEffect } from "react";
import { Award, Lock, BookOpen, Star, TrendingUp, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../lib/api";

interface Grade {
    id: number;
    question_id: number;
    student_name: string;
    student_number: string;
    nlp_score: number | null;
    facial_score: number | null;
    speech_score: number | null;
    overall_score: number | null;
    grade_visible: number;
    started_at?: string;
    submitted_at: string;
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.4 } }
};

export default function MyGrades() {
    const [grades, setGrades] = useState<Grade[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/exams/my-grades")
            .then(res => setGrades(res.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const getScoreColor = (score: number | null) => {
        if (score === null) return "#8b8b73";
        if (score >= 80) return "#e8c97a";
        if (score >= 60) return "#cfa355";
        return "#e05555";
    };

    const getGradeLetter = (score: number | null) => {
        if (score === null) return "—";
        if (score >= 90) return "A+";
        if (score >= 80) return "A";
        if (score >= 70) return "B";
        if (score >= 60) return "C";
        if (score >= 50) return "D";
        return "F";
    };

    if (loading) return (
        <div style={{ color: "#8b8b73", padding: "2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: 24, height: 24, border: "2px solid rgba(207,163,85,0.1)", borderTopColor: "#cfa355", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            Fetching your results...
        </div>
    );

    const scored = grades.filter(g => g.overall_score !== null);
    const avgScore = scored.length ? Math.round(scored.reduce((a, g) => a + (g.overall_score ?? 0), 0) / scored.length) : 0;
    const topScore = scored.length ? Math.round(Math.max(...scored.map(g => g.overall_score ?? 0))) : 0;

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            style={{ display: "flex", flexDirection: "column", gap: "2rem", fontFamily: "'Inter', sans-serif" }}
        >
            <motion.div variants={itemVariants}>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#e5e5e0", marginBottom: "0.25rem" }}>My Grades</h1>
                <p style={{ color: "#8b8b73", fontSize: "0.9rem" }}>Completed assessments released by your professor</p>
            </motion.div>

            {grades.length > 0 && (
                <motion.div variants={itemVariants} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
                    {[
                        { label: "Exams Verified", value: grades.length, color: "#cfa355", icon: BookOpen },
                        { label: "Average Performance", value: `${avgScore}%`, color: "#e8c97a", icon: TrendingUp },
                        { label: "Highest Achievement", value: `${topScore}%`, color: "#e8c97a", icon: Award },
                    ].map((stat, i) => {
                        const Icon = stat.icon;
                        return (
                            <motion.div
                                key={i}
                                whileHover={{ y: -5, scale: 1.02 }}
                                style={{ background: "#141414", border: "1px solid rgba(207,163,85,0.15)", borderRadius: "1.25rem", padding: "1.5rem", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                                    <div style={{ padding: "0.4rem", borderRadius: "0.5rem", background: `${stat.color}15` }}>
                                        <Icon size={16} color={stat.color} />
                                    </div>
                                    <span style={{ fontSize: "0.7rem", color: "#8b8b73", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{stat.label}</span>
                                </div>
                                <p style={{ fontSize: "2rem", fontWeight: 800, color: "#e5e5e0" }}>{stat.value}</p>
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}

            {grades.length === 0 ? (
                <motion.div
                    variants={itemVariants}
                    style={{ textAlign: "center", padding: "5rem 2rem", background: "#141414", border: "1px dashed rgba(207,163,85,0.2)", borderRadius: "1.5rem" }}
                >
                    <Award size={56} color="#393632" style={{ margin: "0 auto 1.5rem", opacity: 0.5 }} />
                    <h3 style={{ color: "#e5e5e0", fontWeight: 700, fontSize: "1.25rem", marginBottom: "0.75rem" }}>No Grades Published</h3>
                    <p style={{ color: "#8b8b73", fontSize: "0.95rem", maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>
                        Completed exams will appear here once your professor verifies and publishes the final scores.
                    </p>
                </motion.div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <AnimatePresence>
                        {grades.map(grade => {
                            const scoreColor = getScoreColor(grade.overall_score);
                            const letter = getGradeLetter(grade.overall_score);
                            const date = new Date(grade.submitted_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

                            return (
                                <motion.div
                                    key={grade.id}
                                    variants={itemVariants}
                                    whileHover={{
                                        scale: 1.01,
                                        borderColor: "rgba(207,163,85,0.3)",
                                        boxShadow: "0 15px 40px rgba(0,0,0,0.3)",
                                        translateZ: 20
                                    }}
                                    style={{
                                        background: "#141414",
                                        border: "1px solid rgba(207,163,85,0.15)",
                                        borderRadius: "1.5rem",
                                        padding: "1.5rem 2rem",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "2rem",
                                        flexWrap: "wrap",
                                        transition: "all 0.3s ease"
                                    }}
                                >
                                    <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg, ${scoreColor}, #141414)`, padding: "2px", boxShadow: `0 8px 16px ${scoreColor}20` }}>
                                        <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#141414", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <span style={{ fontSize: "1.5rem", fontWeight: 900, color: scoreColor }}>{letter}</span>
                                        </div>
                                    </div>

                                    <div style={{ flex: 1, minWidth: 200 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                                            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.2rem 0.6rem", borderRadius: "999px", background: "rgba(207,163,85,0.1)", border: "1px solid rgba(207,163,85,0.2)" }}>
                                                <Star size={10} color="#cfa355" fill="#cfa355" />
                                                <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#cfa355", textTransform: "uppercase" }}>Exam Result</span>
                                            </div>
                                            <span style={{ fontSize: "0.75rem", color: "#8b8b73" }}>Submitted {date}</span>
                                        </div>
                                        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#e5e5e0", marginBottom: "0.25rem" }}>{grade.student_name}</h3>
                                        <p style={{ fontSize: "0.8rem", color: "#cfa355", fontWeight: 600 }}>Assignment ID: ORL-{grade.id}</p>
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: 150 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "#8b8b73" }}>
                                            <Clock size={12} /> Entry: <span style={{ color: "#e5e5e0" }}>{grade.started_at ? new Date(grade.started_at).toLocaleTimeString() : "—"}</span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "#8b8b73" }}>
                                            <Clock size={12} /> Exit: <span style={{ color: "#e5e5e0" }}>{new Date(grade.submitted_at).toLocaleTimeString()}</span>
                                        </div>
                                        {grade.started_at && (
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "#e8c97a", fontWeight: 700 }}>
                                                <TrendingUp size={12} /> Duration: {(() => {
                                                    const diff = new Date(grade.submitted_at).getTime() - new Date(grade.started_at).getTime();
                                                    const mins = Math.floor(diff / 60000);
                                                    const secs = Math.floor((diff % 60000) / 1000);
                                                    return `${mins}m ${secs}s`;
                                                })()}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", borderLeft: "1px solid rgba(255,255,255,0.05)", paddingLeft: "2rem" }}>
                                        {[
                                            { label: "Content", value: grade.nlp_score },
                                            { label: "Fluency", value: grade.speech_score },
                                            { label: "Integrity", value: grade.facial_score },
                                        ].map((s, i) => (
                                            <div key={i} style={{ textAlign: "center" }}>
                                                <p style={{ fontSize: "0.6rem", color: "#8b8b73", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.4rem" }}>{s.label}</p>
                                                <p style={{ fontSize: "1rem", fontWeight: 800, color: getScoreColor(s.value) }}>
                                                    {s.value !== null ? `${Math.round(s.value)}%` : "—"}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ textAlign: "right", minWidth: 100, borderLeft: "1px solid rgba(255,255,255,0.05)", paddingLeft: "2rem" }}>
                                        <p style={{ fontSize: "0.6rem", color: "#8b8b73", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.4rem" }}>Final Score</p>
                                        <p style={{ fontSize: "2rem", fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
                                            {grade.overall_score !== null ? `${Math.round(grade.overall_score)}%` : "—"}
                                        </p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            <motion.div
                variants={itemVariants}
                style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem 1.25rem", background: "rgba(207,163,85,0.04)", border: "1px solid rgba(207,163,85,0.1)", borderRadius: "1rem" }}
            >
                <Lock size={16} color="#cfa355" style={{ opacity: 0.6 }} />
                <p style={{ fontSize: "0.85rem", color: "#8b8b73", lineHeight: 1.5 }}>
                    Grades shown here are finalized and signed by the examining committee. AI evaluations are used as primary assessment metrics.
                </p>
            </motion.div>
        </motion.div>
    );
}

