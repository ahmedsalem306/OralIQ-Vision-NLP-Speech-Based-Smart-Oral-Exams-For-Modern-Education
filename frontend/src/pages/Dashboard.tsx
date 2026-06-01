import { useState, useEffect } from "react";
import { Plus, Copy, Check, Trash2, Link2, BookOpen, ChevronDown, ChevronUp, UserPlus, X, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../lib/api";
import { useI18n } from "../i18n";

interface Question {
    id: number; text: string; model_answer: string; keywords: string;
    difficulty: string; category: string; duration_minutes: number;
    exam_token: string; created_at: string;
}

const DIFF_COLOR: Record<string, string> = { easy: "#5ec269", medium: "#e0a030", hard: "#e05555" };
const G = "rgba(207,163,85,";

export default function Dashboard() {
    const { t } = useI18n();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [assignQuestion, setAssignQuestion] = useState<Question | null>(null);
    const [students, setStudents] = useState<{ id: number; full_name: string; email: string }[]>([]);
    const [studentSearch, setStudentSearch] = useState("");
    const [assigning, setAssigning] = useState(false);
    const [assignedTo, setAssignedTo] = useState<number | null>(null);
    const [text, setText] = useState("");
    const [modelAnswer, setModelAnswer] = useState("");
    const [keywords, setKeywords] = useState("");
    const [category, setCategory] = useState("general");
    const [difficulty, setDifficulty] = useState("medium");
    const [durationMinutes, setDurationMinutes] = useState(2);
    const baseUrl = window.location.origin;

    const loadQuestions = async () => { try { const res = await api.get("/questions/"); setQuestions(res.data); } catch { console.error("Failed"); } finally { setLoading(false); } };
    useEffect(() => { loadQuestions(); }, []);

    const handleCreate = async () => {
        if (!text.trim() || !modelAnswer.trim()) return; setSaving(true);
        try { const res = await api.post("/questions/", { text, model_answer: modelAnswer, keywords, category, difficulty, duration_minutes: durationMinutes }); setQuestions(p => [res.data, ...p]); resetForm(); setShowModal(false); } catch (err: any) { alert(err.response?.data?.detail || "Failed."); } finally { setSaving(false); }
    };
    const handleDelete = async (id: number) => { if (!confirm("Delete this question?")) return; try { await api.delete(`/questions/${id}`); setQuestions(p => p.filter(q => q.id !== id)); } catch { alert("Failed."); } };
    const copyLink = (q: Question) => { navigator.clipboard.writeText(`${baseUrl}/exam/${q.exam_token}`); setCopiedId(q.id); setTimeout(() => setCopiedId(null), 2000); };
    const resetForm = () => { setText(""); setModelAnswer(""); setKeywords(""); setCategory("general"); setDifficulty("medium"); setDurationMinutes(2); };
    const openAssign = async (q: Question) => { setAssignQuestion(q); setAssignedTo(null); setStudentSearch(""); if (!students.length) { try { const r = await api.get("/exams/students"); setStudents(r.data); } catch { setStudents([]); } } };
    const handleAssign = async (sid: number) => { if (!assignQuestion) return; setAssigning(true); try { await api.post("/exams/assign", { question_id: assignQuestion.id, student_id: sid }); setAssignedTo(sid); } catch { alert("Failed."); } finally { setAssigning(false); } };
    const filteredStudents = students.filter(s => s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase()));

    const inp: React.CSSProperties = { width: "100%", padding: "0.75rem 1rem", background: "rgba(255,255,255,0.03)", border: `1px solid ${G}0.15)`, borderRadius: "0.75rem", color: "#e5e5e0", fontSize: "0.9rem", fontFamily: "'Inter',sans-serif", outline: "none", boxSizing: "border-box" };
    const sel: React.CSSProperties = { ...inp, appearance: "none" as const, WebkitAppearance: "none" as const, background: "rgba(255,255,255,0.04)", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b8b73' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 1rem center", paddingRight: "2.5rem", cursor: "pointer" };
    const lbl: React.CSSProperties = { fontSize: "0.75rem", fontWeight: 700, color: "#8b8b73", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "0.4rem" };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", fontFamily: "'Inter',sans-serif" }}>
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#e5e5e0", marginBottom: "0.25rem" }}>{t("dashboard.questions.title")}</h1>
                    <p style={{ color: "#8b8b73", fontSize: "0.875rem" }}>{questions.length} - {t("dashboard.questions.subtitle")}</p>
                </div>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setShowModal(true)} data-tooltip="Create a new exam question"
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.25rem", background: "linear-gradient(135deg, #cfa355, #e8c97a)", color: "#0a0a0a", border: "none", borderRadius: "0.75rem", fontWeight: 800, fontSize: "0.875rem", cursor: "pointer", fontFamily: "'Inter',sans-serif", boxShadow: "0 4px 20px rgba(207,163,85,0.25)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <Plus size={16} /> {t("dashboard.questions.new")}
                </motion.button>
            </motion.div>

            {/* Create Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ background: "#141414", border: `1px solid ${G}0.2)`, borderRadius: "1.5rem", padding: "2rem", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: `0 0 80px ${G}0.1)` }}>
                            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#e5e5e0", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <BookOpen size={20} color="#cfa355" /> {t("dashboard.questions.new")}
                            </h2>
                            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                <div><label style={lbl}>{t("dashboard.questions.question")} *</label><textarea value={text} onChange={e => setText(e.target.value)} placeholder={t("dashboard.questions.question")} rows={3} style={{ ...inp, resize: "vertical" }} /></div>
                                <div><label style={lbl}>{t("dashboard.questions.answer")} *</label><textarea value={modelAnswer} onChange={e => setModelAnswer(e.target.value)} placeholder={t("dashboard.questions.answer")} rows={3} style={{ ...inp, resize: "vertical" }} /></div>
                                <div><label style={lbl}>{t("dashboard.questions.keywords")}</label><input type="text" value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="AI, NLP, speech" style={inp} /></div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                    <div><label style={lbl}>{t("dashboard.questions.category")}</label><select value={category} onChange={e => setCategory(e.target.value)} style={sel}><option value="general" style={{ background: "#141414" }}>General</option><option value="technical" style={{ background: "#141414" }}>Technical</option><option value="behavioral" style={{ background: "#141414" }}>Behavioral</option><option value="hr" style={{ background: "#141414" }}>HR</option></select></div>
                                    <div><label style={lbl}>{t("dashboard.questions.difficulty")}</label><select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={{ ...sel, color: DIFF_COLOR[difficulty] || "#e5e5e0", borderColor: `${DIFF_COLOR[difficulty]}55` || `${G}0.15)` }}><option value="easy" style={{ background: "#141414", color: "#5ec269" }}>Easy</option><option value="medium" style={{ background: "#141414", color: "#e0a030" }}>Medium</option><option value="hard" style={{ background: "#141414", color: "#e05555" }}>Hard</option></select></div>
                                </div>
                                <div><label style={lbl}>{t("dashboard.questions.duration")}</label><input type="number" min={1} max={10} value={durationMinutes} onChange={e => setDurationMinutes(parseInt(e.target.value) || 2)} style={inp} /></div>
                            </div>
                            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
                                <button onClick={() => { setShowModal(false); resetForm(); }} style={{ flex: 1, padding: "0.8rem", background: "transparent", border: `1px solid ${G}0.12)`, borderRadius: "0.75rem", color: "#8b8b73", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>{t("dashboard.questions.cancel")}</button>
                                <motion.button whileHover={{ scale: 1.02 }} onClick={handleCreate} disabled={saving || !text.trim() || !modelAnswer.trim()} style={{ flex: 1, padding: "0.8rem", background: "linear-gradient(135deg, #cfa355, #e8c97a)", border: "none", borderRadius: "0.75rem", color: "#0a0a0a", fontWeight: 800, cursor: "pointer", fontFamily: "'Inter',sans-serif", opacity: saving || !text.trim() || !modelAnswer.trim() ? 0.5 : 1 }}>{saving ? t("dashboard.questions.creating") : t("dashboard.questions.create")}</motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Questions List */}
            {loading ? (
                <div style={{ textAlign: "center", padding: "4rem", color: "#8b8b73" }}>
                    <div style={{ width: 36, height: 36, border: `3px solid ${G}0.15)`, borderTopColor: "#cfa355", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 1rem" }} />Loading...
                </div>
            ) : questions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "5rem 2rem", background: "#141414", border: `1px dashed ${G}0.15)`, borderRadius: "1.25rem" }}>
                    <BookOpen size={48} color="#393632" style={{ margin: "0 auto 1rem" }} /><h3 style={{ color: "#8b8b73", fontWeight: 600, marginBottom: "0.5rem" }}>{t("dashboard.questions.emptyTitle")}</h3><p style={{ color: "#393632", fontSize: "0.875rem" }}>{t("dashboard.questions.emptySubtitle")}</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {questions.map((q, idx) => {
                        const isExp = expandedId === q.id; const isCopied = copiedId === q.id; const link = `${baseUrl}/exam/${q.exam_token}`;
                        return (
                            <motion.div key={q.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                                style={{ background: "#141414", border: `1px solid ${G}0.08)`, borderRadius: "1.25rem", overflow: "hidden", transition: "border-color 0.3s" }}
                                className="hover:border-[rgba(207,163,85,0.2)]">
                                <div style={{ padding: "1.25rem 1.5rem", display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: DIFF_COLOR[q.difficulty] || "#8b8b73", marginTop: 6, flexShrink: 0, boxShadow: `0 0 8px ${DIFF_COLOR[q.difficulty]}40` }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem", flexWrap: "wrap" }}>
                                            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#cfa355", textTransform: "uppercase", letterSpacing: "0.1em", background: `${G}0.08)`, padding: "0.2rem 0.5rem", borderRadius: "999px" }}>{q.category}</span>
                                            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: DIFF_COLOR[q.difficulty], textTransform: "uppercase", letterSpacing: "0.1em" }}>{q.difficulty}</span>
                                        </div>
                                        <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "#e5e5e0", lineHeight: 1.5, marginBottom: "0.5rem" }}>{q.text}</p>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.02)", border: `1px solid ${G}0.08)`, borderRadius: "0.5rem", padding: "0.4rem 0.75rem", maxWidth: "100%", overflow: "hidden" }}>
                                            <Link2 size={12} color="#cfa355" style={{ flexShrink: 0 }} />
                                            <span style={{ fontSize: "0.75rem", color: "#8b8b73", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => copyLink(q)} data-tooltip={isCopied ? "Copied!" : "Copy exam link"} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 0.9rem", background: isCopied ? "rgba(94,194,105,0.08)" : `${G}0.06)`, border: `1px solid ${isCopied ? "rgba(94,194,105,0.25)" : `${G}0.15)`}`, borderRadius: "0.6rem", color: isCopied ? "#5ec269" : "#cfa355", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif", transition: "all 0.2s" }}>
                                            {isCopied ? <><Check size={14} /> {t("dashboard.questions.copied")}</> : <><Copy size={14} /> {t("dashboard.questions.copy")}</>}
                                        </motion.button>
                                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => openAssign(q)} data-tooltip="Assign to a student" style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 0.9rem", background: `${G}0.04)`, border: `1px solid ${G}0.12)`, borderRadius: "0.6rem", color: "#cfa355", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                                            <UserPlus size={14} /> {t("dashboard.questions.assign")}
                                        </motion.button>
                                        <button onClick={() => setExpandedId(isExp ? null : q.id)} data-tooltip="View details" style={{ padding: "0.5rem", background: "rgba(255,255,255,0.03)", border: `1px solid ${G}0.08)`, borderRadius: "0.6rem", color: "#8b8b73", cursor: "pointer" }}>
                                            {isExp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                        <button onClick={() => handleDelete(q.id)} data-tooltip="Delete question" style={{ padding: "0.5rem", background: "rgba(224,85,85,0.05)", border: "1px solid rgba(224,85,85,0.15)", borderRadius: "0.6rem", color: "#e05555", cursor: "pointer" }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <AnimatePresence>
                                    {isExp && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                                            <div style={{ padding: "0 1.5rem 1.25rem", borderTop: `1px solid ${G}0.05)`, paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                                <div><p style={lbl}>{t("dashboard.questions.answer")}</p><p style={{ fontSize: "0.875rem", color: "#bbb", lineHeight: 1.7 }}>{q.model_answer}</p></div>
                                                {q.keywords && (<div><p style={lbl}>{t("dashboard.questions.keywords")}</p><div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>{q.keywords.split(",").map((k, i) => (<span key={i} style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem", background: `${G}0.06)`, border: `1px solid ${G}0.12)`, borderRadius: "999px", color: "#cfa355" }}>{k.trim()}</span>))}</div></div>)}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Assign Modal */}
            <AnimatePresence>
                {assignQuestion && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "1rem" }}>
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} style={{ background: "#141414", border: `1px solid ${G}0.2)`, borderRadius: "1.5rem", padding: "2rem", width: "100%", maxWidth: 480, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: `0 0 60px ${G}0.08)` }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                                <div><h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#e5e5e0", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><UserPlus size={18} color="#cfa355" /> {t("dashboard.questions.assignTitle")}</h2><p style={{ fontSize: "0.8rem", color: "#8b8b73", maxWidth: 340 }}>{assignQuestion.text.slice(0, 80)}{assignQuestion.text.length > 80 ? "..." : ""}</p></div>
                                <button onClick={() => setAssignQuestion(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8b8b73", padding: "0.25rem" }}><X size={20} /></button>
                            </div>
                            <div style={{ position: "relative", marginBottom: "1rem" }}>
                                <Search size={14} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "#8b8b73" }} />
                                <input type="text" placeholder={t("dashboard.questions.searchStudents")} value={studentSearch} onChange={e => setStudentSearch(e.target.value)} style={{ ...inp, paddingLeft: "2.25rem" }} />
                            </div>
                            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                {filteredStudents.length === 0 ? (<p style={{ textAlign: "center", color: "#8b8b73", padding: "2rem", fontSize: "0.875rem" }}>{t("dashboard.questions.noStudents")}</p>) : filteredStudents.map(s => {
                                    const done = assignedTo === s.id;
                                    return (<div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1rem", background: done ? `${G}0.04)` : "rgba(255,255,255,0.015)", border: `1px solid ${done ? `${G}0.2)` : `${G}0.06)`}`, borderRadius: "0.75rem", transition: "all 0.2s" }}>
                                        <div><p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#e5e5e0", marginBottom: "0.15rem" }}>{s.full_name}</p><p style={{ fontSize: "0.75rem", color: "#8b8b73" }}>{s.email}</p></div>
                                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleAssign(s.id)} disabled={assigning || done} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.45rem 0.9rem", background: done ? `${G}0.08)` : "linear-gradient(135deg, #cfa355, #e8c97a)", border: done ? `1px solid ${G}0.2)` : "none", borderRadius: "0.6rem", color: done ? "#cfa355" : "#0a0a0a", fontSize: "0.8rem", fontWeight: 700, cursor: done ? "default" : "pointer", fontFamily: "'Inter',sans-serif", opacity: assigning ? 0.6 : 1 }}>{done ? <><Check size={13} /> {t("dashboard.questions.copied")}</> : t("dashboard.questions.assign")}</motion.button>
                                    </div>);
                                })}
                            </div>
                            <button onClick={() => setAssignQuestion(null)} style={{ marginTop: "1.25rem", padding: "0.75rem", background: "transparent", border: `1px solid ${G}0.1)`, borderRadius: "0.75rem", color: "#8b8b73", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>{t("dashboard.questions.done")}</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
