import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    ClipboardList, Users, BarChart2, Clock, ArrowRight,
    CheckCircle2, Mic, BookOpen, Plus, TrendingUp, Award, ShieldCheck, AlertCircle
} from "lucide-react";
import VoiceEnrollmentModal from "../components/VoiceEnrollmentModal";
import api from "../lib/api";
import { useI18n } from "../i18n";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface AssignedExam {
    id: number; exam_id: number; exam_title: string | null;
    exam_token: string | null; assigned_by_name: string | null;
    status: string; assigned_at: string;
}

interface Submission {
    id: number; student_name: string; exam_title: string | null;
    overall_score: number | null; submitted_at: string;
}

const scoreColor = (s: number) => s >= 75 ? "#4ade80" : s >= 50 ? "#fbbf24" : "#ff4d4d";
const scoreBg = (s: number) => s >= 75 ? "rgba(74,222,128,0.08)" : s >= 50 ? "rgba(251,191,36,0.08)" : "rgba(255,77,77,0.08)";
const scoreBorder = (s: number) => s >= 75 ? "rgba(74,222,128,0.2)" : s >= 50 ? "rgba(251,191,36,0.2)" : "rgba(255,77,77,0.2)";

function StatTile({ label, value, icon: Icon, delay = 0 }: { label: string; value: string | number; icon: any; delay?: number }) {
    const ref = useRef<HTMLDivElement>(null);
    useGSAP(() => {
        if (!ref.current) return;
        gsap.from(ref.current, { opacity: 0, y: 24, duration: 0.6, delay, ease: "power2.out" });
    }, { scope: ref });

    return (
        <div ref={ref} style={{
            background: "#111", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "1rem", padding: "1.5rem",
            transition: "border-color 0.25s",
        }} className="hover:border-white/[0.12]">
            <div style={{
                width: 38, height: 38, borderRadius: "0.7rem",
                background: "rgba(255,255,255,0.04)", display: "flex",
                alignItems: "center", justifyContent: "center", marginBottom: "1.25rem",
            }}>
                <Icon size={17} color="#fff" />
            </div>
            <div style={{
                fontFamily: "'Antonio', sans-serif",
                fontSize: "2rem", fontWeight: 700, color: "#fff",
                lineHeight: 1, marginBottom: "0.4rem",
            }}>{value}</div>
            <div style={{
                fontFamily: "'Antonio', sans-serif",
                fontSize: "0.65rem", color: "rgba(255,255,255,0.3)",
                textTransform: "uppercase", letterSpacing: "0.15em",
            }}>{label}</div>
        </div>
    );
}

export default function Overview() {
    const { t, dir } = useI18n();
    const navigate = useNavigate();
    const [user, setUser] = useState<{ full_name: string; role: string } | null>(null);
    const [stats, setStats] = useState({ exams: 0, submissions: 0, avgScore: 0, pending: 0, completed: 0 });
    const [hasVoiceprint, setHasVoiceprint] = useState<boolean | null>(null);
    const [canReenroll, setCanReenroll] = useState(true);
    const [voiceLocked, setVoiceLocked] = useState(false);
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [recentSubs, setRecentSubs] = useState<Submission[]>([]);
    const [assignedExams, setAssignedExams] = useState<AssignedExam[]>([]);
    const [loading, setLoading] = useState(true);
    const pageRef = useRef<HTMLDivElement>(null);

    const checkVoiceStatus = () => {
        api.get("/voice/status")
            .then(res => {
                setHasVoiceprint(res.data.has_voiceprint);
                setCanReenroll(res.data.can_reenroll !== false);
                setVoiceLocked(!!res.data.voice_locked);
            })
            .catch(() => setHasVoiceprint(false));
    };

    useEffect(() => {
        checkVoiceStatus();
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
                    const avg = scored.length ? Math.round(scored.reduce((s, r) => s + (r.overall_score ?? 0), 0) / scored.length) : 0;
                    setStats({ exams: exams.length, submissions: results.length, avgScore: avg, pending: results.filter(r => r.overall_score == null).length, completed: scored.length });
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
            if (status === 401 || status === 403) { localStorage.removeItem("token"); navigate("/login", { replace: true }); }
            setLoading(false);
        });
    }, []);

    const isLecturer = user && ["lecturer", "hr", "admin"].includes(user.role);
    const startExam = (token: string | null) => {
        if (token) { localStorage.setItem("pendingExamToken", token); navigate("/exam/start"); }
    };

    if (loading) return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
            <div style={{ width: 26, height: 26, border: "2px solid rgba(255,255,255,0.08)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        </div>
    );

    return (
        <div ref={pageRef} style={{ maxWidth: 1100, margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
            {/* Page header */}
            <div style={{ marginBottom: "2.5rem" }}>
                <h1 style={{
                    fontFamily: "'Antonio', sans-serif",
                    fontSize: "clamp(1.5rem, 3vw, 2.5rem)", fontWeight: 700, color: "#fff",
                    marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.02em",
                }}>
                    {isLecturer ? t("overview.lecturerTitle") : t("overview.studentTitle")}
                </h1>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>
                    {t("overview.welcome")}, <span style={{ color: "#fff" }}>{user?.full_name}</span>
                </p>
            </div>

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
                {isLecturer ? (
                    <>
                        <StatTile label={t("overview.examsCreated")} value={stats.exams} icon={ClipboardList} delay={0} />
                        <StatTile label={t("overview.submissions")} value={stats.submissions} icon={Users} delay={0.08} />
                        <StatTile label={t("overview.avgScore")} value={stats.avgScore ? `${stats.avgScore}%` : "—"} icon={BarChart2} delay={0.16} />
                        <StatTile label={t("overview.pendingAi")} value={stats.pending} icon={Clock} delay={0.24} />
                    </>
                ) : (
                    <>
                        <StatTile label={t("overview.myExams")} value={stats.pending} icon={Clock} delay={0} />
                        <StatTile label={dir === "rtl" ? "مكتملة" : "Completed"} value={stats.completed} icon={CheckCircle2} delay={0.08} />
                        <StatTile label={dir === "rtl" ? "إجمالي المرسل" : "Total Assigned"} value={stats.submissions} icon={ClipboardList} delay={0.16} />
                    </>
                )}
            </div>

            {/* ── LECTURER view ── */}
            {isLecturer && (
                <>
                    {/* Quick actions */}
                    <div style={{ display: "flex", gap: "0.7rem", marginBottom: "2.5rem", flexWrap: "wrap" }}>
                        <button onClick={() => navigate("/dashboard/questions")}
                            style={{
                                display: "flex", alignItems: "center", gap: "0.5rem",
                                padding: "0.65rem 1.2rem", background: "#fff", border: "none",
                                borderRadius: "0.7rem", color: "#0a0a0a", fontWeight: 700,
                                fontSize: "0.8rem", cursor: "pointer",
                                fontFamily: "'Antonio', sans-serif",
                                textTransform: "uppercase", letterSpacing: "0.05em",
                                transition: "transform 0.15s",
                            }}
                            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-1px)")}
                            onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}>
                            <Plus size={14} /> {t("dashboard.questions.new")}
                        </button>
                        {[
                            { label: t("nav.results"), icon: BarChart2, href: "/dashboard/results" },
                            { label: t("nav.analytics"), icon: TrendingUp, href: "/dashboard/analytics" },
                        ].map(({ label, icon: Ic, href }) => (
                            <button key={href} onClick={() => navigate(href)}
                                style={{
                                    display: "flex", alignItems: "center", gap: "0.5rem",
                                    padding: "0.65rem 1.2rem", background: "rgba(255,255,255,0.04)",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    borderRadius: "0.7rem", color: "rgba(255,255,255,0.6)",
                                    fontWeight: 600, fontSize: "0.8rem", cursor: "pointer",
                                    fontFamily: "'Inter', sans-serif", transition: "all 0.15s",
                                }}
                                className="hover:bg-white/[0.07] hover:border-white/[0.15]">
                                <Ic size={14} /> {label}
                            </button>
                        ))}
                    </div>

                    {/* Recent submissions */}
                    {recentSubs.length > 0 ? (
                        <div>
                            <p style={{
                                fontFamily: "'Antonio', sans-serif",
                                fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.18em",
                                textTransform: "uppercase", color: "rgba(255,255,255,0.2)",
                                marginBottom: "1rem",
                            }}>
                                {dir === "rtl" ? "آخر الإجابات" : "Recent Submissions"}
                            </p>
                            <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "1rem", overflow: "hidden" }}>
                                {recentSubs.map((s, i) => (
                                    <div key={s.id} style={{
                                        display: "flex", alignItems: "center", gap: "1rem",
                                        padding: "1rem 1.25rem",
                                        borderBottom: i < recentSubs.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                                        transition: "background 0.15s",
                                    }} className="hover:bg-white/[0.02]">
                                        <div style={{
                                            width: 32, height: 32, borderRadius: "50%", background: "#fff",
                                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                        }}>
                                            <span style={{ color: "#0a0a0a", fontWeight: 800, fontSize: "0.72rem" }}>
                                                {s.student_name?.[0]?.toUpperCase() || "?"}
                                            </span>
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#e0e0e0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.student_name}</p>
                                            <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.25)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.exam_title || "Untitled Exam"}</p>
                                        </div>
                                        {s.overall_score != null ? (
                                            <span style={{
                                                padding: "0.2rem 0.65rem", borderRadius: "999px",
                                                background: scoreBg(s.overall_score),
                                                border: `1px solid ${scoreBorder(s.overall_score)}`,
                                                color: scoreColor(s.overall_score),
                                                fontSize: "0.72rem", fontWeight: 700, flexShrink: 0,
                                            }}>
                                                {Math.round(s.overall_score)}%
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>Processing</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => navigate("/dashboard/results")}
                                style={{
                                    display: "flex", alignItems: "center", gap: "0.35rem",
                                    marginTop: "0.85rem", color: "#fff", background: "none",
                                    border: "none", cursor: "pointer", fontSize: "0.78rem",
                                    fontWeight: 600, padding: 0,
                                }}>
                                {dir === "rtl" ? "عرض كل النتائج" : "View all results"} <ArrowRight size={12} />
                            </button>
                        </div>
                    ) : (
                        <div style={{
                            textAlign: "center", padding: "3.5rem 2rem", background: "#111",
                            border: "1px dashed rgba(255,255,255,0.08)", borderRadius: "1rem",
                        }}>
                            <Award size={30} color="rgba(255,255,255,0.1)" style={{ marginBottom: "0.75rem" }} />
                            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.875rem" }}>
                                {dir === "rtl" ? "لا توجد إجابات بعد." : "No submissions yet."}
                            </p>
                            <p style={{ color: "rgba(255,255,255,0.12)", fontSize: "0.775rem", marginTop: "0.3rem" }}>
                                {dir === "rtl" ? "أنشئ امتحاناً وأرسله للطلاب للبدء." : "Create an exam and assign it to students to get started."}
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* ── STUDENT view ── */}
            {!isLecturer && (
                <>
                    {/* Voice Print Banner */}
                    <div style={{
                        background: hasVoiceprint ? "rgba(74,222,128,0.05)" : "rgba(255,160,0,0.06)",
                        border: `1px solid ${hasVoiceprint ? "rgba(74,222,128,0.2)" : "rgba(255,160,0,0.25)"}`,
                        borderRadius: "1rem", padding: "1.25rem 1.5rem", marginBottom: "2rem",
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            <div style={{
                                width: 42, height: 42, borderRadius: "50%",
                                background: hasVoiceprint ? "rgba(74,222,128,0.15)" : "rgba(255,160,0,0.15)",
                                display: "flex", alignItems: "center", justifyContent: "center"
                            }}>
                                {hasVoiceprint ? <ShieldCheck size={22} color="#4ade80" /> : <AlertCircle size={22} color="#ffa000" />}
                            </div>
                            <div>
                                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff", marginBottom: "0.2rem" }}>
                                    {hasVoiceprint
                                        ? (dir === "rtl" ? "بصمة الصوت مسجلة ومتصلة بحسابك ✅" : "Voice Biometric Print Active ✅")
                                        : (dir === "rtl" ? "تنبيه: بصمة الصوت غير مسجلة ⚠️" : "Voice Biometric Print Required ⚠️")}
                                </h4>
                                <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)" }}>
                                    {hasVoiceprint
                                        ? voiceLocked && !canReenroll
                                            ? (dir === "rtl" ? "البصمة مقفولة — لا يمكن تغييرها إلا بإذن المحاضر 🔒" : "Voice print locked — lecturer must allow re-enrollment 🔒")
                                            : (dir === "rtl" ? "تم حفظ بصمة صوتك للتحقق التلقائي أثناء أداء الامتحانات." : "Your voice fingerprint is stored for automatic exam verification.")
                                        : (dir === "rtl" ? "يجب تسجيل بصمة صوتك لتأكيد هويتك والتحقق من شخصيتك في الامتحانات." : "Record your voice print to verify your identity during exams.")}
                                </p>
                            </div>
                        </div>
                        {(!hasVoiceprint || canReenroll) && (
                        <button
                            onClick={() => setShowVoiceModal(true)}
                            style={{
                                background: hasVoiceprint ? "rgba(255,255,255,0.08)" : "#ffffff",
                                color: hasVoiceprint ? "#ffffff" : "#000000",
                                border: hasVoiceprint ? "1px solid rgba(255,255,255,0.2)" : "none",
                                borderRadius: "0.75rem", padding: "0.6rem 1.25rem",
                                fontSize: "0.82rem", fontWeight: 700, fontFamily: "'Antonio', sans-serif",
                                cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.04em"
                            }}
                        >
                            {hasVoiceprint
                                ? (dir === "rtl" ? "إعادة التسجيل" : "Re-record Voice")
                                : (dir === "rtl" ? "تسجيل البصمة الآن" : "Record Voice Now")}
                        </button>
                        )}
                    </div>

                    {/* Pending Exam Token Banner */}
                    {(() => {
                        const pendingToken = localStorage.getItem("pendingExamToken");
                        if (!pendingToken || !hasVoiceprint) return null;
                        return (
                            <div style={{
                                background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(74,222,128,0.06))",
                                border: "1px solid rgba(74,222,128,0.25)",
                                borderRadius: "1rem", padding: "1.25rem 1.5rem", marginBottom: "2rem",
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                gap: "1rem", flexWrap: "wrap",
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                    <div style={{
                                        width: 42, height: 42, borderRadius: "50%",
                                        background: "rgba(74,222,128,0.15)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>
                                        <BookOpen size={22} color="#4ade80" />
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff", marginBottom: "0.2rem" }}>
                                            {dir === "rtl" ? "لديك امتحان في الانتظار 📝" : "You have a pending exam 📝"}
                                        </h4>
                                        <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)" }}>
                                            {dir === "rtl" ? "بصمتك مفعّلة — يمكنك بدء الامتحان الآن مباشرة." : "Your voice print is active — you can start the exam now."}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate("/exam/start")}
                                    style={{
                                        background: "#ffffff", color: "#0a0a0a",
                                        border: "none", borderRadius: "0.75rem",
                                        padding: "0.75rem 1.5rem",
                                        fontSize: "0.85rem", fontWeight: 800,
                                        fontFamily: "'Antonio', sans-serif",
                                        cursor: "pointer", textTransform: "uppercase",
                                        letterSpacing: "0.04em",
                                        display: "inline-flex", alignItems: "center", gap: "0.5rem",
                                        boxShadow: "0 4px 20px rgba(255,255,255,0.12)",
                                        transition: "transform 0.15s",
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
                                    onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
                                >
                                    {dir === "rtl" ? "ابدأ الامتحان" : "Start Exam"} <ArrowRight size={16} />
                                </button>
                            </div>
                        );
                    })()}

                    {assignedExams.length === 0 ? (
                    <div style={{
                        textAlign: "center", padding: "4rem 2rem", background: "#111",
                        border: "1px solid rgba(255,255,255,0.05)", borderRadius: "1rem",
                    }}>
                        <BookOpen size={34} color="rgba(255,255,255,0.1)" style={{ marginBottom: "1rem" }} />
                        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.9rem", marginBottom: "0.3rem" }}>
                            {dir === "rtl" ? "لا توجد امتحانات معلقة." : "No pending exams."}
                        </p>
                        <p style={{ color: "rgba(255,255,255,0.12)", fontSize: "0.775rem" }}>
                            {dir === "rtl" ? "سيظهر هنا أي امتحان يرسله المحاضر." : "Your lecturer will assign you an exam soon."}
                        </p>
                    </div>
                ) : (
                    <div>
                        <p style={{
                            fontFamily: "'Antonio', sans-serif",
                            fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.18em",
                            textTransform: "uppercase", color: "rgba(255,255,255,0.2)",
                            marginBottom: "1rem",
                        }}>
                            {dir === "rtl" ? "امتحانات معلقة" : "Pending Exams"}
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            {assignedExams.map((exam, i) => (
                                <div key={exam.id}
                                    style={{
                                        background: "#111", border: "1px solid rgba(255,255,255,0.06)",
                                        borderRadius: "1rem", padding: "1.25rem 1.5rem",
                                        display: "flex", alignItems: "center", gap: "1.125rem",
                                        transition: "border-color 0.2s, transform 0.2s",
                                    }}
                                    className="hover:border-white/[0.12]"
                                    onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-1px)")}
                                    onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: "0.8rem",
                                        background: "rgba(255,255,255,0.04)", display: "flex",
                                        alignItems: "center", justifyContent: "center", flexShrink: 0,
                                    }}>
                                        <Mic size={19} color="#fff" />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3 style={{
                                            fontSize: "0.925rem", fontWeight: 700, color: "#e0e0e0",
                                            marginBottom: "0.2rem", overflow: "hidden",
                                            textOverflow: "ellipsis", whiteSpace: "nowrap",
                                        }}>
                                            {exam.exam_title || "Oral Exam"}
                                        </h3>
                                        <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.25)" }}>By {exam.assigned_by_name || "Lecturer"}</p>
                                    </div>
                                    <button onClick={() => startExam(exam.exam_token)}
                                        style={{
                                            display: "flex", alignItems: "center", gap: "0.4rem",
                                            padding: "0.6rem 1.1rem", background: "#fff", border: "none",
                                            borderRadius: "0.6rem", color: "#0a0a0a", fontWeight: 700,
                                            fontSize: "0.8rem", cursor: "pointer", flexShrink: 0,
                                            fontFamily: "'Antonio', sans-serif",
                                            textTransform: "uppercase", letterSpacing: "0.03em",
                                        }}>
                                        {t("overview.startExam")} <ArrowRight size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </>
            )}

            <VoiceEnrollmentModal
                isOpen={showVoiceModal}
                onClose={() => setShowVoiceModal(false)}
                onSuccess={() => {
                    setShowVoiceModal(false);
                    checkVoiceStatus();
                }}
            />
        </div>
    );
}
