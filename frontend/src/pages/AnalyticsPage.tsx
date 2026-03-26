import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Award, Target } from "lucide-react";
import api from "../lib/api";

interface Submission {
    id: number;
    overall_score: number | null;
    submitted_at: string;
    question_category: string | null;
}

export default function AnalyticsPage() {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/exams/all-results")
            .then(res => setSubmissions(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ color: "#8888A8", padding: "2rem" }}>Loading analytics...</div>;

    // ── Compute KPIs ─────────────────────────────────────────────────────────
    const scores = submissions.map(s => s.overall_score || 0);
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const topPerformerScore = scores.length ? Math.max(...scores) : 0;
    const passCount = scores.filter(s => s >= 60).length;
    const passRate = scores.length ? Math.round((passCount / scores.length) * 100) : 0;
    const belowThreshold = scores.filter(s => s < 60).length;

    // ── Compute Weekly Data (Last 7 Days) ────────────────────────────────────
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(today.getDate() - (6 - i));
        return {
            date: d.toISOString().split('T')[0],
            day: days[d.getDay()],
            scores: [] as number[],
        };
    });

    submissions.forEach(s => {
        const dateStr = s.submitted_at.split('T')[0];
        const dayObj = last7Days.find(d => d.date === dateStr);
        if (dayObj && s.overall_score !== null) {
            dayObj.scores.push(s.overall_score);
        }
    });

    const weeklyData = last7Days.map(d => ({
        day: d.day,
        score: d.scores.length ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length) : 0
    }));

    const maxWeeklyScore = Math.max(...weeklyData.map(d => d.score), 100);

    // ── Compute Subject Breakdown ────────────────────────────────────────────
    const subjects: Record<string, number[]> = {};
    submissions.forEach(s => {
        const cat = s.question_category || "General";
        if (!subjects[cat]) subjects[cat] = [];
        if (s.overall_score !== null) subjects[cat].push(s.overall_score);
    });

    const subjectData = Object.keys(subjects).map(cat => ({
        subject: cat,
        avg: Math.round(subjects[cat].reduce((a, b) => a + b, 0) / subjects[cat].length),
        students: subjects[cat].length
    })).sort((a, b) => b.avg - a.avg);

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem", fontFamily: "'Space Grotesk', sans-serif" }}>
            <div>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#E8E8F0", marginBottom: "0.25rem" }}>Analytics</h1>
                <p style={{ color: "#8888A8", fontSize: "0.9rem" }}>Performance insights across all your exams</p>
            </div>

            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                {[
                    { icon: TrendingUp, label: "Avg Score", value: `${avgScore}%`, sub: "Across all exams", color: "#00D4AA" },
                    { icon: Award, label: "Top Score", value: `${topPerformerScore}%`, sub: "Highest achieved", color: "#6C63FF" },
                    { icon: Target, label: "Pass Rate", value: `${passRate}%`, sub: "Scored 60%+", color: "#FFB347" },
                    { icon: TrendingDown, label: "Needs Help", value: belowThreshold, sub: "Scored < 60%", color: "#FF4D6D" },
                ].map((kpi, idx) => {
                    const Icon = kpi.icon;
                    return (
                        <div key={idx} style={{ background: "#1A1A2E", border: "1px solid rgba(108,99,255,0.15)", borderRadius: "1rem", padding: "1.5rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                                <div style={{ width: 40, height: 40, borderRadius: "0.75rem", background: `${kpi.color}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Icon size={18} color={kpi.color} />
                                </div>
                            </div>
                            <p style={{ fontSize: "1.75rem", fontWeight: 800, color: "#E8E8F0", marginBottom: "0.25rem" }}>{kpi.value}</p>
                            <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#E8E8F0", marginBottom: "0.15rem" }}>{kpi.label}</p>
                            <p style={{ fontSize: "0.75rem", color: "#8888A8" }}>{kpi.sub}</p>
                        </div>
                    );
                })}
            </div>

            {/* Weekly Bar Chart */}
            <div style={{ background: "#1A1A2E", border: "1px solid rgba(108,99,255,0.15)", borderRadius: "1.25rem", padding: "1.75rem" }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#E8E8F0", marginBottom: "1.75rem" }}>Weekly Average Scores</h2>
                {weeklyData.every(d => d.score === 0) ? (
                    <div style={{ textAlign: "center", color: "#8888A8", padding: "2rem" }}>No data for this week</div>
                ) : (
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "0.75rem", height: 160 }}>
                        {weeklyData.map((d, idx) => (
                            <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                                <span style={{ fontSize: "0.75rem", color: "#8888A8", fontWeight: 600 }}>{d.score > 0 ? d.score + "%" : ""}</span>
                                <div style={{
                                    width: "100%",
                                    height: `${d.score > 0 ? (d.score / maxWeeklyScore) * 120 : 4}px`,
                                    background: d.score === maxWeeklyScore && d.score > 0
                                        ? "linear-gradient(180deg, #00D4AA, #6C63FF)"
                                        : "linear-gradient(180deg, #6C63FF80, #6C63FF20)",
                                    borderRadius: "0.5rem 0.5rem 0 0",
                                    transition: "height 0.3s",
                                }} />
                                <span style={{ fontSize: "0.75rem", color: "#8888A8" }}>{d.day}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Subject Breakdown */}
            <div style={{ background: "#1A1A2E", border: "1px solid rgba(108,99,255,0.15)", borderRadius: "1.25rem", padding: "1.75rem" }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#E8E8F0", marginBottom: "1.5rem" }}>Performance by Subject</h2>
                {subjectData.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#8888A8", padding: "2rem" }}>No subject data available</div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                        {subjectData.map((s, idx) => (
                            <div key={idx}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#E8E8F0" }}>{s.subject}</span>
                                    <span style={{ fontSize: "0.875rem", color: s.avg >= 80 ? "#00D4AA" : s.avg >= 60 ? "#6C63FF" : "#FF4D6D", fontWeight: 700 }}>{s.avg}%</span>
                                </div>
                                <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                                    <div style={{
                                        height: "100%",
                                        width: `${s.avg}%`,
                                        background: s.avg >= 80 ? "linear-gradient(90deg, #6C63FF, #00D4AA)" : s.avg >= 60 ? "#6C63FF" : "#FF4D6D",
                                        borderRadius: 4,
                                        transition: "width 0.5s",
                                    }} />
                                </div>
                                <p style={{ fontSize: "0.75rem", color: "#8888A8", marginTop: "0.25rem" }}>{s.students} submission{s.students !== 1 ? "s" : ""}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
