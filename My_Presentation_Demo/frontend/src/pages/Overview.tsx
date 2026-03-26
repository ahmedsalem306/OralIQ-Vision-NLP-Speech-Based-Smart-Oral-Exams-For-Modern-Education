import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Code, Brain, Zap, Mail, Shield, Activity, Star, Link2, BookOpen, ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../lib/api";

interface AssignedExam {
    id: number;
    question_id: number;
    question_text: string | null;
    question_category: string | null;
    question_difficulty: string | null;
    exam_token: string | null;
    status: string;
    assigned_by_name: string | null;
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

export default function Overview() {
    const navigate = useNavigate();
    const [assignedExams, setAssignedExams] = useState<AssignedExam[]>([]);
    const [linkExamToken, setLinkExamToken] = useState<string | null>(null);

    useEffect(() => {
        api.get("/users/me").then(res => {
            if (res.data.role === "student") {
                api.get("/exams/my-assignments")
                    .then(r => setAssignedExams(r.data))
                    .catch(() => { });
                const token = localStorage.getItem("pendingExamToken");
                if (token) setLinkExamToken(token);
            }
        }).catch(() => { });
    }, []);

    const handleStartExam = (token?: string | null) => {
        if (token) localStorage.setItem("pendingExamToken", token);
        navigate("/exam/start");
    };

    const handleDismissLink = () => {
        localStorage.removeItem("pendingExamToken");
        setLinkExamToken(null);
    };

    const DIFFICULTY_COLOR: Record<string, string> = {
        easy: "#00D4AA", medium: "#FFB347", hard: "#FF4D6D",
    };

    const teamMembers = [
        { name: "Ahmed Salem", role: "Team Leader, Full Stack & AI Engineer", email: "ahmedsalem250500@gmail.com", avatar: "A" },
        { name: "Rokia Mohamed", role: "Backend Developer", avatar: "R" },
        { name: "Afaf Walid", role: "Frontend Developer", avatar: "A" },
        { name: "Mohamed Gamal", role: "AI Engineer", avatar: "M" },
    ];

    const V = "rgba(108,99,255,";
    const T = "rgba(0,212,170,";

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            style={{ display: "flex", flexDirection: "column", gap: "4rem", paddingBottom: "3rem", fontFamily: "'Space Grotesk', sans-serif" }}
        >
            {/* ── Assigned Exams Banners ── */}
            <AnimatePresence>
                {assignedExams.map(exam => (
                    <motion.div
                        key={exam.id}
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: "auto", marginBottom: "1rem" }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        style={{ background: "linear-gradient(135deg, rgba(108,99,255,0.15), rgba(0,212,170,0.1))", border: "1px solid rgba(108,99,255,0.4)", borderRadius: "1.25rem", padding: "1.5rem 2rem", display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap", boxShadow: "0 0 40px rgba(108,99,255,0.15)", overflow: "hidden" }}
                    >
                        <div style={{ width: 56, height: 56, borderRadius: "1rem", background: "rgba(108,99,255,0.2)", border: "1px solid rgba(108,99,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <BookOpen size={26} color="#6C63FF" />
                        </div>
                        <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00D4AA" }} />
                                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#00D4AA", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                                    Assigned by {exam.assigned_by_name || "Lecturer"}
                                </span>
                                {exam.question_difficulty && (
                                    <span style={{ fontSize: "0.65rem", fontWeight: 700, color: DIFFICULTY_COLOR[exam.question_difficulty] ?? "#8888A8", textTransform: "uppercase", letterSpacing: "0.08em", background: `${DIFFICULTY_COLOR[exam.question_difficulty] ?? "#8888A8"}18`, padding: "0.15rem 0.5rem", borderRadius: "999px", marginLeft: "0.5rem" }}>
                                        {exam.question_difficulty}
                                    </span>
                                )}
                            </div>
                            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#E8E8F0", marginBottom: "0.25rem" }}>
                                {exam.question_text ? exam.question_text.slice(0, 100) + (exam.question_text.length > 100 ? "..." : "") : "Oral Exam"}
                            </h3>
                            <p style={{ fontSize: "0.8rem", color: "#8888A8" }}>
                                Category: <span style={{ color: "#6C63FF", fontWeight: 600 }}>{exam.question_category ?? "General"}</span>
                            </p>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleStartExam(exam.exam_token)}
                            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.85rem 1.5rem", background: "linear-gradient(135deg, #6C63FF, #00D4AA)", color: "#fff", border: "none", borderRadius: "0.75rem", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", boxShadow: "0 4px 20px rgba(108,99,255,0.35)", flexShrink: 0 }}
                        >
                            Start Exam <ArrowRight size={16} />
                        </motion.button>
                    </motion.div>
                ))}

                {linkExamToken && assignedExams.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        style={{ background: "linear-gradient(135deg, rgba(108,99,255,0.15), rgba(0,212,170,0.1))", border: "1px solid rgba(108,99,255,0.4)", borderRadius: "1.25rem", padding: "1.5rem 2rem", display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap", position: "relative", boxShadow: "0 0 40px rgba(108,99,255,0.15)" }}
                    >
                        <button onClick={handleDismissLink} style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", cursor: "pointer", color: "#8888A8" }}>
                            <X size={18} />
                        </button>
                        <div style={{ width: 56, height: 56, borderRadius: "1rem", background: "rgba(108,99,255,0.2)", border: "1px solid rgba(108,99,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <BookOpen size={26} color="#6C63FF" />
                        </div>
                        <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00D4AA" }} />
                                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#00D4AA", textTransform: "uppercase", letterSpacing: "0.1em" }}>Exam Pending</span>
                            </div>
                            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#E8E8F0", marginBottom: "0.25rem" }}>You have been invited to take an exam</h3>
                            <p style={{ fontSize: "0.85rem", color: "#8888A8" }}>Your professor shared an exam link with you. Click "Start Exam" when ready.</p>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleStartExam(linkExamToken)}
                            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.85rem 1.5rem", background: "linear-gradient(135deg, #6C63FF, #00D4AA)", color: "#fff", border: "none", borderRadius: "0.75rem", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", boxShadow: "0 4px 20px rgba(108,99,255,0.35)", flexShrink: 0 }}
                        >
                            Start Exam <ArrowRight size={16} />
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hero */}
            <motion.div variants={itemVariants} style={{
                position: "relative",
                borderRadius: "1.5rem",
                overflow: "hidden",
                background: "#1A1A2E",
                border: `1px solid ${V}0.2)`,
                padding: "5rem 2rem",
                textAlign: "center",
                boxShadow: `0 0 80px ${V}0.08)`,
            }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `radial-gradient(ellipse at 20% 20%, ${V}0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, ${T}0.08) 0%, transparent 60%)`, pointerEvents: "none" }} />

                <div style={{ position: "relative", zIndex: 1, maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 1rem", borderRadius: "999px", background: `${V}0.1)`, border: `1px solid ${V}0.2)`, color: "#6C63FF", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em" }}
                    >
                        <Star size={12} fill="currentColor" /> AI-Powered Oral Assessments
                    </motion.div>

                    <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(2rem, 5.5vw, 4rem)", fontWeight: 900, color: "#E8E8F0", lineHeight: 1.15, letterSpacing: "-0.02em", margin: 0 }}>
                        Smart Oral Exams{" "}
                        <span style={{ display: "block", background: "linear-gradient(135deg, #6C63FF, #00D4AA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", filter: "drop-shadow(0 0 20px rgba(108,99,255,0.3))" }}>
                            For Modern Education
                        </span>
                    </h1>

                    <p style={{ fontSize: "clamp(0.95rem, 2vw, 1.15rem)", color: "#8888A8", lineHeight: 1.9, fontWeight: 300, maxWidth: 600, margin: 0 }}>
                        Empowering professors to conduct efficient oral exams. Our AI analyzes student performance, highlighting{" "}
                        <span style={{ color: "#6C63FF", fontWeight: 600 }}>Knowledge Gaps</span>,{" "}
                        <span style={{ color: "#00D4AA", fontWeight: 600 }}>Communication Skills</span>, and providing actionable feedback.
                    </p>
                </div>
            </motion.div>

            {/* How It Works */}
            <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
                <motion.div variants={itemVariants} style={{ textAlign: "center" }}>
                    <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 700, color: "#E8E8F0", marginBottom: "0.5rem" }}>Academic Workflow</h2>
                    <p style={{ color: "#8888A8", fontWeight: 300 }}>Streamline the oral examination process for lecturers and students.</p>
                </motion.div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "2rem" }}>
                    {[
                        { step: "01", title: "Professor Creates Exam", desc: "Lecturers create question sets and generate a shareable exam link.", icon: Code, color: "#6C63FF" },
                        { step: "02", title: "Student Takes Exam", desc: "Students open the link, log in, and record their answers via webcam.", icon: Activity, color: "#00D4AA" },
                        { step: "03", title: "AI Analyzes & Reports", desc: "Professors receive a full AI-generated report with scores and feedback.", icon: Brain, color: "#FFB347" },
                    ].map((item, idx) => {
                        const Icon = item.icon;
                        return (
                            <motion.div
                                key={idx}
                                variants={itemVariants}
                                whileHover={{ y: -10 }}
                                style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1rem" }}
                            >
                                <div style={{ position: "relative", width: 80, height: 80, borderRadius: "1.25rem", background: `${item.color}15`, border: `1px solid ${item.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Icon size={36} color={item.color} />
                                    <div style={{ position: "absolute", top: -10, right: -10, width: 28, height: 28, borderRadius: "50%", background: item.color, color: "#0F0F1A", fontSize: "0.7rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        {item.step}
                                    </div>
                                </div>
                                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#E8E8F0" }}>{item.title}</h3>
                                <p style={{ fontSize: "0.875rem", color: "#8888A8", lineHeight: 1.7, fontWeight: 300 }}>{item.desc}</p>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Exam Link Feature */}
            <motion.div
                variants={itemVariants}
                style={{ background: "#1A1A2E", border: `1px solid ${V}0.2)`, borderRadius: "1.5rem", padding: "2.5rem", display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap", boxShadow: `0 20px 40px rgba(0,0,0,0.3)` }}
            >
                <div style={{ width: 64, height: 64, borderRadius: "1rem", background: `${V}0.15)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Link2 size={30} color="#6C63FF" />
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#E8E8F0", marginBottom: "0.5rem" }}>Share Exam via Link</h3>
                    <p style={{ color: "#8888A8", fontSize: "0.9rem", lineHeight: 1.7, fontWeight: 300 }}>
                        Professors generate a unique exam link and share it with students. Students click the link, log in, and start the exam immediately.
                    </p>
                </div>
                <div style={{ padding: "0.6rem 1.25rem", background: `${V}0.1)`, border: `1px solid ${V}0.25)`, borderRadius: "0.75rem", color: "#6C63FF", fontSize: "0.80rem", fontWeight: 700, fontFamily: "monospace", flexShrink: 0 }}>
                    oraliq.app/exam/abc123
                </div>
            </motion.div>

            {/* Feature Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem" }}>
                {[
                    { icon: Shield, title: "Exam Integrity", desc: "Secure proctored environment ensuring authentic student performance.", color: "#6C63FF" },
                    { icon: Zap, title: "Instant Grading", desc: "AI provides preliminary scoring and detailed feedback within minutes.", color: "#00D4AA" },
                ].map((card, idx) => {
                    const Icon = card.icon;
                    return (
                        <motion.div
                            key={idx}
                            variants={itemVariants}
                            whileHover={{ scale: 1.02, borderColor: "rgba(108,99,255,0.4)" }}
                            style={{ background: "#1A1A2E", border: `1px solid ${V}0.15)`, borderRadius: "1.25rem", padding: "2rem", transition: "border-color 0.2s" }}
                        >
                            <Icon size={36} color={card.color} style={{ marginBottom: "1rem" }} />
                            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#E8E8F0", marginBottom: "0.75rem" }}>{card.title}</h3>
                            <p style={{ color: "#8888A8", lineHeight: 1.7, fontSize: "0.875rem", fontWeight: 300 }}>{card.desc}</p>
                        </motion.div>
                    );
                })}
            </div>

            {/* Team */}
            <motion.div variants={itemVariants} style={{ background: "#1A1A2E", border: `1px solid ${V}0.15)`, borderRadius: "1.5rem", padding: "3rem 2rem", boxShadow: "0 30px 60px rgba(0,0,0,0.4)" }}>
                <div style={{ textAlign: "center", marginBottom: "3rem" }}>
                    <h2 style={{ fontSize: "2rem", fontWeight: 700, color: "#E8E8F0", marginBottom: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
                        <Users size={28} color="#6C63FF" /> The Team
                    </h2>
                    <p style={{ color: "#8888A8", fontWeight: 300 }}>Building the future of AI-driven academic assessment.</p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
                    {teamMembers.map((member, idx) => (
                        <motion.div
                            key={idx}
                            variants={itemVariants}
                            whileHover={{
                                y: -10,
                                rotateY: 5,
                                rotateX: 2,
                                borderColor: "rgba(108,99,255,0.35)",
                                boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
                            }}
                            style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${V}0.1)`, borderRadius: "1.25rem", padding: "2rem", textAlign: "center", transition: "border-color 0.3s" }}
                        >
                            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #6C63FF, #00D4AA)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem", fontSize: "1.75rem", fontWeight: 800, color: "#fff", boxShadow: "0 10px 20px rgba(108,99,255,0.2)" }}>
                                {member.avatar}
                            </div>
                            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#E8E8F0", marginBottom: "0.25rem" }}>{member.name}</h3>
                            <p style={{ fontSize: "0.78rem", color: "#6C63FF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1.25rem" }}>{member.role}</p>
                            {member.email && (
                                <a href={`mailto:${member.email}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", fontSize: "0.8rem", color: "#8888A8", textDecoration: "none", transition: "color 0.2s" }} className="hover:text-[#6C63FF]">
                                    <Mail size={14} /> Contact
                                </a>
                            )}
                        </motion.div>
                    ))}
                </div>

                <div style={{ textAlign: "center", marginTop: "3rem", paddingTop: "2rem", borderTop: `1px solid ${V}0.1)`, color: "#444466", fontSize: "0.8rem" }}>
                    © 2026 OralIQ. All rights reserved.
                </div>
            </motion.div>
        </motion.div>
    );
}
