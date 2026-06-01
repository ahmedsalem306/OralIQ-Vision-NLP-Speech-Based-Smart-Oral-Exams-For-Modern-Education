import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, ArrowRight, BookOpen, Clock, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../lib/api";

interface AssignedExam {
    id: number;
    question_id: number;
    assigned_at: string | null;
    status: string;
    question_text: string | null;
    question_category: string | null;
    question_difficulty: string | null;
    exam_token: string | null;
    assigned_by_name: string | null;
}

interface ExamMessage {
    id: string;
    type: "exam_invite";
    title: string;
    body: string;
    token: string;
    createdAt: string;
    read: boolean;
}

const G = "rgba(207,163,85,";

export default function MessagesPage() {
    const [messages, setMessages] = useState<ExamMessage[]>([]);
    const [user, setUser] = useState<{ role: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        let cancelled = false;

        const loadMessages = async () => {
            setLoading(true);
            try {
                const me = await api.get("/users/me");
                if (cancelled) return;
                setUser(me.data);

                const dismissed = JSON.parse(localStorage.getItem("dismissedExamTokens") || "[]");
                const msgs: ExamMessage[] = [];

                if (me.data.role === "student") {
                    const { data } = await api.get("/exams/my-assignments");
                    if (cancelled) return;

                    (data as AssignedExam[])
                        .filter(a => a.exam_token && !dismissed.includes(a.exam_token))
                        .forEach(a => {
                            msgs.push({
                                id: `exam-${a.id}`,
                                type: "exam_invite",
                                title: "New Exam Invitation",
                                body: `${a.assigned_by_name || "Your lecturer"} assigned you: ${a.question_text || "Oral exam"}`,
                                token: a.exam_token!,
                                createdAt: a.assigned_at || new Date().toISOString(),
                                read: false,
                            });
                        });
                } else {
                    const token = localStorage.getItem("pendingExamToken");
                    if (token && !dismissed.includes(token)) {
                        msgs.push({
                            id: `exam-${token}`,
                            type: "exam_invite",
                            title: "New Exam Invitation",
                            body: "You have been invited to take an oral exam. Click \"Start Exam\" when you're ready.",
                            token,
                            createdAt: new Date().toISOString(),
                            read: false,
                        });
                    }
                }

                setMessages(msgs);
            } catch (err: any) {
                const status = err?.response?.status;
                if (status === 401 || status === 403) {
                    localStorage.removeItem("token");
                    navigate("/login", { replace: true });
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadMessages();
        return () => { cancelled = true; };
    }, []);

    const handleStartExam = (token: string) => {
        localStorage.setItem("pendingExamToken", token);
        navigate("/exam/start");
    };

    const handleDismiss = (msg: ExamMessage) => {
        const dismissed = JSON.parse(localStorage.getItem("dismissedExamTokens") || "[]");
        dismissed.push(msg.token);
        localStorage.setItem("dismissedExamTokens", JSON.stringify(dismissed));
        setMessages(prev => prev.filter(m => m.id !== msg.id));
    };

    const isStudent = user?.role === "student";
    const unreadCount = messages.filter(m => !m.read).length;

    return (
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
                <div>
                    <h1 style={{ color: "#e5e5e0", fontSize: "1.75rem", fontWeight: 800, fontFamily: "'Amiamie', serif", marginBottom: "0.25rem" }}>Messages</h1>
                    <p style={{ color: "#8b8b73", fontSize: "0.85rem" }}>
                        {unreadCount > 0 ? `You have ${unreadCount} new message${unreadCount > 1 ? "s" : ""}` : "No new messages"}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <div style={{ background: "linear-gradient(135deg, #cfa355, #e8c97a)", color: "#0a0a0a", width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.9rem" }}>
                        {unreadCount}
                    </div>
                )}
            </div>

            {/* Messages List */}
            <AnimatePresence mode="popLayout">
                {loading ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{ textAlign: "center", padding: "4rem 2rem", color: "#8b8b73" }}>
                        <div style={{ width: 30, height: 30, border: `2px solid ${G}0.12)`, borderTopColor: "#cfa355", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 1rem" }} />
                        Loading messages...
                    </motion.div>
                ) : messages.length === 0 ? (
                    <motion.div key="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ textAlign: "center", padding: "4rem 2rem" }}>
                        <div style={{ width: 80, height: 80, borderRadius: "1.5rem", background: `${G}0.06)`, border: `1px solid ${G}0.12)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
                            <MessageSquare size={36} color="#cfa355" strokeWidth={1.5} />
                        </div>
                        <h3 style={{ color: "#e5e5e0", fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>All caught up!</h3>
                        <p style={{ color: "#8b8b73", fontSize: "0.9rem", maxWidth: 360, margin: "0 auto" }}>
                            {isStudent
                                ? "When your professor assigns you an exam, it will appear here."
                                : "No new notifications at this time."}
                        </p>
                    </motion.div>
                ) : (
                    messages.map((msg, i) => (
                        <motion.div key={msg.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }} transition={{ delay: i * 0.05 }}
                            style={{ background: msg.read ? `${G}0.02)` : `${G}0.05)`, border: `1px solid ${msg.read ? `${G}0.08)` : `${G}0.18)`}`, borderRadius: "1.25rem", padding: "1.5rem", marginBottom: "1rem", position: "relative", overflow: "hidden" }}>

                            {/* Unread indicator */}
                            {!msg.read && (
                                <div style={{ position: "absolute", top: "1.5rem", right: "1.5rem", width: 10, height: 10, borderRadius: "50%", background: "#cfa355", boxShadow: "0 0 12px rgba(207,163,85,0.5)" }} />
                            )}

                            {/* Dismiss button */}
                            <button onClick={() => handleDismiss(msg)} style={{ position: "absolute", top: "0.75rem", right: "0.75rem", background: "none", border: "none", cursor: "pointer", padding: "0.35rem", color: "#8b8b73", opacity: 0.6, transition: "opacity 0.15s" }}
                                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                                onMouseLeave={e => (e.currentTarget.style.opacity = "0.6")}>
                                <X size={16} />
                            </button>

                            <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
                                {/* Icon */}
                                <div style={{ width: 52, height: 52, borderRadius: "1rem", background: `${G}0.08)`, border: `1px solid ${G}0.15)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    {msg.type === "exam_invite" ? <BookOpen size={24} color="#cfa355" /> : <MessageSquare size={24} color="#cfa355" />}
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                                        <h3 style={{ color: "#e5e5e0", fontSize: "1rem", fontWeight: 700 }}>{msg.title}</h3>
                                        <Sparkles size={14} color="#cfa355" />
                                    </div>
                                    <p style={{ color: "#8b8b73", fontSize: "0.85rem", lineHeight: 1.5, marginBottom: "1rem" }}>{msg.body}</p>

                                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                        {msg.type === "exam_invite" && (
                                            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => handleStartExam(msg.token)}
                                                style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.65rem 1.5rem", background: "linear-gradient(135deg, #cfa355, #e8c97a)", color: "#0a0a0a", border: "none", borderRadius: "0.75rem", fontWeight: 800, fontSize: "0.8rem", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                                START EXAM <ArrowRight size={16} />
                                            </motion.button>
                                        )}
                                        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.7rem", color: "#8b8b73" }}>
                                            <Clock size={12} /> Just now
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </AnimatePresence>
        </div>
    );
}
