import { Users, BookOpen, TrendingUp, Clock } from "lucide-react";
import { useI18n } from "../i18n";

const mockStudents = [
    { id: 1, name: "Mohamed Ali", email: "m.ali@uni.edu", exams: 3, avgScore: 82, lastExam: "2026-02-18" },
    { id: 2, name: "Sara Ahmed", email: "s.ahmed@uni.edu", exams: 2, avgScore: 71, lastExam: "2026-02-18" },
    { id: 3, name: "Omar Hassan", email: "o.hassan@uni.edu", exams: 1, avgScore: 55, lastExam: "2026-02-17" },
    { id: 4, name: "Nour Khalid", email: "n.khalid@uni.edu", exams: 4, avgScore: 91, lastExam: "2026-02-17" },
    { id: 5, name: "Layla Ibrahim", email: "l.ibrahim@uni.edu", exams: 2, avgScore: 78, lastExam: "2026-02-16" },
];

export default function StudentsPage() {
    const { t, dir } = useI18n();
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#e5e5e0", marginBottom: "0.25rem" }}>{t("nav.students")}</h1>
                    <p style={{ color: "#8b8b73", fontSize: "0.9rem" }}>{dir === "rtl" ? "كل الطلاب المسجلين في مقرراتك" : "All students enrolled in your courses"}</p>
                </div>
                <button style={{ padding: "0.65rem 1.25rem", background: "linear-gradient(135deg, #cfa355, #e8c97a)", color: "#fff", border: "none", borderRadius: "0.75rem", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
                    + {dir === "rtl" ? "دعوة طالب" : "Invite Student"}
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
                {[
                    { icon: Users, label: dir === "rtl" ? "إجمالي الطلاب" : "Total Students", value: mockStudents.length, color: "#cfa355" },
                    { icon: BookOpen, label: dir === "rtl" ? "إجمالي الامتحانات" : "Total Exams", value: mockStudents.reduce((a, s) => a + s.exams, 0), color: "#e8c97a" },
                    { icon: TrendingUp, label: t("overview.avgScore"), value: `${Math.round(mockStudents.reduce((a, s) => a + s.avgScore, 0) / mockStudents.length)}%`, color: "#e8c97a" },
                    { icon: Clock, label: dir === "rtl" ? "نشط اليوم" : "Active Today", value: 2, color: "#e05555" },
                ].map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <div key={idx} style={{ background: "#141414", border: "1px solid rgba(207,163,85,0.15)", borderRadius: "1rem", padding: "1.25rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div style={{ width: 40, height: 40, borderRadius: "0.75rem", background: `${stat.color}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Icon size={18} color={stat.color} />
                            </div>
                            <div>
                                <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "#e5e5e0" }}>{stat.value}</p>
                                <p style={{ fontSize: "0.7rem", color: "#8b8b73" }}>{stat.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Students Table */}
            <div style={{ background: "#141414", border: "1px solid rgba(207,163,85,0.15)", borderRadius: "1.25rem", overflow: "hidden" }}>
                <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(207,163,85,0.1)" }}>
                    <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#e5e5e0" }}>{dir === "rtl" ? "قائمة الطلاب" : "Student List"}</h2>
                </div>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid rgba(207,163,85,0.1)" }}>
                                {[
                                    dir === "rtl" ? "الطالب" : "Student",
                                    t("auth.email"),
                                    dir === "rtl" ? "الامتحانات" : "Exams Taken",
                                    t("overview.avgScore"),
                                    dir === "rtl" ? "آخر امتحان" : "Last Exam",
                                ].map(h => (
                                    <th key={h} style={{ padding: "0.75rem 1.5rem", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#8b8b73", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {mockStudents.map((s, idx) => (
                                <tr key={s.id} style={{ borderBottom: idx < mockStudents.length - 1 ? "1px solid rgba(207,163,85,0.06)" : "none" }} className="hover:bg-[rgba(207,163,85,0.04)]">
                                    <td style={{ padding: "1rem 1.5rem" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #cfa355, #e8c97a)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.85rem" }}>
                                                {s.name[0]}
                                            </div>
                                            <span style={{ fontWeight: 600, color: "#e5e5e0", fontSize: "0.9rem" }}>{s.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: "1rem 1.5rem", color: "#8b8b73", fontSize: "0.85rem" }}>{s.email}</td>
                                    <td style={{ padding: "1rem 1.5rem", color: "#e5e5e0", fontSize: "0.9rem", fontWeight: 600 }}>{s.exams}</td>
                                    <td style={{ padding: "1rem 1.5rem" }}>
                                        <span style={{ color: s.avgScore >= 80 ? "#e8c97a" : s.avgScore >= 60 ? "#cfa355" : "#e05555", fontWeight: 700 }}>{s.avgScore}%</span>
                                    </td>
                                    <td style={{ padding: "1rem 1.5rem", color: "#8b8b73", fontSize: "0.85rem" }}>{s.lastExam}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

