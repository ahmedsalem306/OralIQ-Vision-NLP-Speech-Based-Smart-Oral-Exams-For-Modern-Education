import { Users, BookOpen, TrendingUp, Clock } from "lucide-react";

const mockStudents = [
    { id: 1, name: "Mohamed Ali", email: "m.ali@uni.edu", exams: 3, avgScore: 82, lastExam: "2026-02-18" },
    { id: 2, name: "Sara Ahmed", email: "s.ahmed@uni.edu", exams: 2, avgScore: 71, lastExam: "2026-02-18" },
    { id: 3, name: "Omar Hassan", email: "o.hassan@uni.edu", exams: 1, avgScore: 55, lastExam: "2026-02-17" },
    { id: 4, name: "Nour Khalid", email: "n.khalid@uni.edu", exams: 4, avgScore: 91, lastExam: "2026-02-17" },
    { id: 5, name: "Layla Ibrahim", email: "l.ibrahim@uni.edu", exams: 2, avgScore: 78, lastExam: "2026-02-16" },
];

export default function StudentsPage() {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#E8E8F0", marginBottom: "0.25rem" }}>Students</h1>
                    <p style={{ color: "#8888A8", fontSize: "0.9rem" }}>All students enrolled in your courses</p>
                </div>
                <button style={{ padding: "0.65rem 1.25rem", background: "linear-gradient(135deg, #6C63FF, #00D4AA)", color: "#fff", border: "none", borderRadius: "0.75rem", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>
                    + Invite Student
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
                {[
                    { icon: Users, label: "Total Students", value: mockStudents.length, color: "#6C63FF" },
                    { icon: BookOpen, label: "Total Exams", value: mockStudents.reduce((a, s) => a + s.exams, 0), color: "#00D4AA" },
                    { icon: TrendingUp, label: "Avg Score", value: `${Math.round(mockStudents.reduce((a, s) => a + s.avgScore, 0) / mockStudents.length)}%`, color: "#FFB347" },
                    { icon: Clock, label: "Active Today", value: 2, color: "#FF4D6D" },
                ].map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <div key={idx} style={{ background: "#1A1A2E", border: "1px solid rgba(108,99,255,0.15)", borderRadius: "1rem", padding: "1.25rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div style={{ width: 40, height: 40, borderRadius: "0.75rem", background: `${stat.color}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Icon size={18} color={stat.color} />
                            </div>
                            <div>
                                <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "#E8E8F0" }}>{stat.value}</p>
                                <p style={{ fontSize: "0.7rem", color: "#8888A8" }}>{stat.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Students Table */}
            <div style={{ background: "#1A1A2E", border: "1px solid rgba(108,99,255,0.15)", borderRadius: "1.25rem", overflow: "hidden" }}>
                <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(108,99,255,0.1)" }}>
                    <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#E8E8F0" }}>Student List</h2>
                </div>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid rgba(108,99,255,0.1)" }}>
                                {["Student", "Email", "Exams Taken", "Avg Score", "Last Exam"].map(h => (
                                    <th key={h} style={{ padding: "0.75rem 1.5rem", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#8888A8", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {mockStudents.map((s, idx) => (
                                <tr key={s.id} style={{ borderBottom: idx < mockStudents.length - 1 ? "1px solid rgba(108,99,255,0.06)" : "none" }} className="hover:bg-[rgba(108,99,255,0.04)]">
                                    <td style={{ padding: "1rem 1.5rem" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #6C63FF, #00D4AA)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.85rem" }}>
                                                {s.name[0]}
                                            </div>
                                            <span style={{ fontWeight: 600, color: "#E8E8F0", fontSize: "0.9rem" }}>{s.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: "1rem 1.5rem", color: "#8888A8", fontSize: "0.85rem" }}>{s.email}</td>
                                    <td style={{ padding: "1rem 1.5rem", color: "#E8E8F0", fontSize: "0.9rem", fontWeight: 600 }}>{s.exams}</td>
                                    <td style={{ padding: "1rem 1.5rem" }}>
                                        <span style={{ color: s.avgScore >= 80 ? "#00D4AA" : s.avgScore >= 60 ? "#6C63FF" : "#FF4D6D", fontWeight: 700 }}>{s.avgScore}%</span>
                                    </td>
                                    <td style={{ padding: "1rem 1.5rem", color: "#8888A8", fontSize: "0.85rem" }}>{s.lastExam}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
