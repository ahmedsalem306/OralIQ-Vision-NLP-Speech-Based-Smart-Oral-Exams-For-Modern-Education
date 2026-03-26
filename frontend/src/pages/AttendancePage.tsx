import { useState, useEffect } from "react";
import { Users, Clock, CheckCircle2, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../lib/api";

interface AttendanceRecord {
    id: number;
    student_name: string;
    email: string;
    assigned_at: string;
    status: string; // pending, completed
    score: number | null;
    question_title: string;
}

const statusConfig: Record<string, any> = {
    "completed": { label: "Completed", color: "#00D4AA", bg: "rgba(0,212,170,0.1)", border: "rgba(0,212,170,0.25)", icon: CheckCircle2 },
    "pending": { label: "Pending", color: "#FFB347", bg: "rgba(255,179,71,0.1)", border: "rgba(255,179,71,0.25)", icon: Clock },
    "in-progress": { label: "In Progress", color: "#6C63FF", bg: "rgba(108,99,255,0.1)", border: "rgba(108,99,255,0.25)", icon: Clock },
};

const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, staggerChildren: 0.1 } }
};

const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } }
};

export default function AttendancePage() {
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const fetchAttendance = () => {
            api.get("/exams/attendance")
                .then(res => setAttendance(res.data))
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        };

        fetchAttendance();

        const t = setInterval(() => {
            setNow(new Date());
            fetchAttendance();
        }, 30000);
        return () => clearInterval(t);
    }, []);

    const filtered = attendance.filter(s =>
        (s.student_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (s.email || "").toLowerCase().includes(search.toLowerCase())
    );

    const completed = attendance.filter(s => s.status === "completed").length;
    const pending = attendance.filter(s => s.status === "pending").length;
    const total = attendance.length;

    if (loading && attendance.length === 0) return (
        <div style={{ color: "#8888A8", padding: "2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: 24, height: 24, border: "2px solid rgba(108,99,255,0.2)", borderTopColor: "#6C63FF", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            Loading attendance...
        </div>
    );

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
        >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                <motion.div variants={itemVariants}>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#E8E8F0", marginBottom: "0.25rem" }}>Exam Attendance</h1>
                    <p style={{ color: "#8888A8", fontSize: "0.9rem" }}>
                        Live tracking — {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                </motion.div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.25)", borderRadius: "999px" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00D4AA", animation: "pulse 2s infinite" }} />
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#00D4AA" }}>Live</span>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
                {[
                    { icon: Users, label: "Total Invited", value: total, color: "#6C63FF" },
                    { icon: CheckCircle2, label: "Completed", value: completed, color: "#00D4AA" },
                    { icon: Clock, label: "Pending", value: pending, color: "#FFB347" },
                ].map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={idx}
                            variants={itemVariants}
                            whileHover={{ y: -5, scale: 1.02 }}
                            style={{ background: "#1A1A2E", border: "1px solid rgba(108,99,255,0.15)", borderRadius: "1rem", padding: "1.25rem", display: "flex", alignItems: "center", gap: "0.75rem", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
                        >
                            <div style={{ width: 40, height: 40, borderRadius: "0.75rem", background: `${stat.color}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Icon size={18} color={stat.color} />
                            </div>
                            <div>
                                <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "#E8E8F0" }}>{stat.value}</p>
                                <p style={{ fontSize: "0.7rem", color: "#8888A8" }}>{stat.label}</p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Progress bar */}
            <motion.div variants={itemVariants} style={{ background: "#1A1A2E", border: "1px solid rgba(108,99,255,0.15)", borderRadius: "1rem", padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#E8E8F0" }}>Completion Progress</span>
                    <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#00D4AA" }}>
                        {total > 0 ? Math.round((completed / total) * 100) : 0}%
                    </span>
                </div>
                <div style={{ height: 10, background: "rgba(255,255,255,0.06)", borderRadius: 5, overflow: "hidden" }}>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        style={{ height: "100%", background: "linear-gradient(90deg, #6C63FF, #00D4AA)", borderRadius: 5 }}
                    />
                </div>
            </motion.div>

            {/* Search + Table */}
            <motion.div variants={itemVariants} style={{ background: "#1A1A2E", border: "1px solid rgba(108,99,255,0.15)", borderRadius: "1.25rem", overflow: "hidden" }}>
                <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(108,99,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                    <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#E8E8F0" }}>Students</h2>
                    <div style={{ position: "relative" }}>
                        <Search size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#8888A8" }} />
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(108,99,255,0.2)", borderRadius: "0.75rem", padding: "0.6rem 0.75rem 0.6rem 2.25rem", color: "#E8E8F0", fontSize: "0.85rem", fontFamily: "'Space Grotesk', sans-serif", outline: "none", width: 220 }}
                        />
                    </div>
                </div>

                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid rgba(108,99,255,0.1)" }}>
                                {["Student", "Email", "Assigned Exam", "Assigned At", "Status", "Score"].map(h => (
                                    <th key={h} style={{ padding: "0.75rem 1.5rem", textAlign: "left", fontSize: "0.7rem", fontWeight: 700, color: "#8888A8", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {filtered.map((s, idx) => {
                                    const sc = statusConfig[s.status] || statusConfig["pending"];
                                    const StatusIcon = sc.icon;
                                    return (
                                        <motion.tr
                                            key={s.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            style={{ borderBottom: idx < filtered.length - 1 ? "1px solid rgba(108,99,255,0.06)" : "none" }}
                                            className="hover:bg-[rgba(108,99,255,0.04)]"
                                        >
                                            <td style={{ padding: "1rem 1.5rem" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #6C63FF, #00D4AA)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 }}>
                                                        {s.student_name ? s.student_name[0] : "?"}
                                                    </div>
                                                    <span style={{ fontWeight: 600, color: "#E8E8F0", fontSize: "0.9rem" }}>{s.student_name || "Unknown"}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: "1rem 1.5rem", color: "#8888A8", fontSize: "0.85rem" }}>{s.email || "—"}</td>
                                            <td style={{ padding: "1rem 1.5rem", color: "#E8E8F0", fontSize: "0.85rem", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.question_title}</td>
                                            <td style={{ padding: "1rem 1.5rem", color: "#8888A8", fontSize: "0.85rem" }}>{s.assigned_at ? new Date(s.assigned_at).toLocaleDateString() : "—"}</td>
                                            <td style={{ padding: "1rem 1.5rem" }}>
                                                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.3rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                                                    <StatusIcon size={12} /> {sc.label}
                                                </span>
                                            </td>
                                            <td style={{ padding: "1rem 1.5rem" }}>
                                                {s.score !== null
                                                    ? <span style={{ fontWeight: 700, color: s.score >= 80 ? "#00D4AA" : s.score >= 60 ? "#6C63FF" : "#FF4D6D" }}>{s.score}%</span>
                                                    : <span style={{ color: "#444466", fontSize: "0.85rem" }}>—</span>
                                                }
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </motion.div>
    );
}
