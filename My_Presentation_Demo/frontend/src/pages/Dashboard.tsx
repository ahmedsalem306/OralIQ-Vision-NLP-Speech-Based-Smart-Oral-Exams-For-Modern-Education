import { useState, useEffect } from "react";
import { Plus, Copy, Check, Trash2, Link2, BookOpen, ChevronDown, ChevronUp, UserPlus, X, Search } from "lucide-react";
import api from "../lib/api";

interface Question {
    id: number;
    text: string;
    model_answer: string;
    keywords: string;
    difficulty: string;
    category: string;
    duration_minutes: number;
    exam_token: string;
    created_at: string;
}

const DIFFICULTY_COLOR: Record<string, string> = {
    easy: "#00D4AA",
    medium: "#FFB347",
    hard: "#FF4D6D",
};

export default function Dashboard() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    // Assign modal
    const [assignQuestion, setAssignQuestion] = useState<Question | null>(null);
    const [students, setStudents] = useState<{ id: number; full_name: string; email: string }[]>([]);
    const [studentSearch, setStudentSearch] = useState("");
    const [assigning, setAssigning] = useState(false);
    const [assignedTo, setAssignedTo] = useState<number | null>(null); // last assigned student id

    // Form state
    const [text, setText] = useState("");
    const [modelAnswer, setModelAnswer] = useState("");
    const [keywords, setKeywords] = useState("");
    const [category, setCategory] = useState("general");
    const [difficulty, setDifficulty] = useState("medium");
    const [durationMinutes, setDurationMinutes] = useState(2);

    const baseUrl = window.location.origin;

    // ── Load questions ──────────────────────────────────────────────────────
    const loadQuestions = async () => {
        try {
            const res = await api.get("/questions/");
            setQuestions(res.data);
        } catch {
            console.error("Failed to load questions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadQuestions(); }, []);

    // ── Create question ─────────────────────────────────────────────────────
    const handleCreate = async () => {
        if (!text.trim() || !modelAnswer.trim()) return;
        setSaving(true);
        try {
            const res = await api.post("/questions/", {
                text, model_answer: modelAnswer, keywords, category, difficulty,
                duration_minutes: durationMinutes,
            });
            setQuestions(prev => [res.data, ...prev]);
            resetForm();
            setShowModal(false);
        } catch (err: any) {
            alert(err.response?.data?.detail || "Failed to create question.");
        } finally {
            setSaving(false);
        }
    };

    // ── Delete question ─────────────────────────────────────────────────────
    const handleDelete = async (id: number) => {
        if (!confirm("Delete this question? Students with the link won't be able to access it.")) return;
        try {
            await api.delete(`/questions/${id}`);
            setQuestions(prev => prev.filter(q => q.id !== id));
        } catch {
            alert("Failed to delete question.");
        }
    };

    // ── Copy link ───────────────────────────────────────────────────────────
    const copyLink = (q: Question) => {
        navigator.clipboard.writeText(`${baseUrl}/exam/${q.exam_token}`);
        setCopiedId(q.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const resetForm = () => {
        setText(""); setModelAnswer(""); setKeywords("");
        setCategory("general"); setDifficulty("medium");
        setDurationMinutes(2);
    };

    // ── Open assign modal ───────────────────────────────────────────────────
    const openAssign = async (q: Question) => {
        setAssignQuestion(q);
        setAssignedTo(null);
        setStudentSearch("");
        if (students.length === 0) {
            try {
                const res = await api.get("/exams/students");
                setStudents(res.data);
            } catch {
                setStudents([]);
            }
        }
    };

    // ── Assign exam to student ──────────────────────────────────────────────
    const handleAssign = async (studentId: number) => {
        if (!assignQuestion) return;
        setAssigning(true);
        try {
            await api.post("/exams/assign", {
                question_id: assignQuestion.id,
                student_id: studentId,
            });
            setAssignedTo(studentId);
        } catch {
            alert("Failed to assign exam.");
        } finally {
            setAssigning(false);
        }
    };

    const filteredStudents = students.filter(s =>
        s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.email.toLowerCase().includes(studentSearch.toLowerCase())
    );

    const inputStyle: React.CSSProperties = {
        width: "100%", padding: "0.75rem 1rem", background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(108,99,255,0.2)", borderRadius: "0.75rem",
        color: "#E8E8F0", fontSize: "0.9rem", fontFamily: "'Space Grotesk', sans-serif",
        outline: "none", boxSizing: "border-box",
    };

    const selectStyle: React.CSSProperties = {
        ...inputStyle,
        appearance: "none" as const,
        WebkitAppearance: "none" as const,
        background: "rgba(255,255,255,0.06)",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238888A8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 1rem center",
        paddingRight: "2.5rem",
        cursor: "pointer",
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", fontFamily: "'Space Grotesk', sans-serif" }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#E8E8F0", marginBottom: "0.25rem" }}>Exam Questions</h1>
                    <p style={{ color: "#8888A8", fontSize: "0.875rem" }}>
                        {questions.length} question{questions.length !== 1 ? "s" : ""} — each has a unique shareable link
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1.25rem", background: "linear-gradient(135deg, #6C63FF, #00D4AA)", color: "#fff", border: "none", borderRadius: "0.75rem", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", boxShadow: "0 4px 20px rgba(108,99,255,0.3)" }}
                >
                    <Plus size={16} /> New Question
                </button>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
                    <div style={{ background: "#1A1A2E", border: "1px solid rgba(108,99,255,0.3)", borderRadius: "1.5rem", padding: "2rem", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 0 60px rgba(108,99,255,0.2)" }}>
                        <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#E8E8F0", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <BookOpen size={20} color="#6C63FF" /> New Exam Question
                        </h2>

                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <div>
                                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#8888A8", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "0.4rem" }}>Question *</label>
                                <textarea value={text} onChange={e => setText(e.target.value)} placeholder="What is the question you want to ask?" rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                            </div>

                            <div>
                                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#8888A8", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "0.4rem" }}>Model Answer *</label>
                                <textarea value={modelAnswer} onChange={e => setModelAnswer(e.target.value)} placeholder="The ideal answer for AI comparison..." rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                            </div>

                            <div>
                                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#8888A8", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "0.4rem" }}>Keywords (comma-separated)</label>
                                <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="e.g. neural network, deep learning, AI" style={inputStyle} />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div>
                                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#8888A8", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "0.4rem" }}>Category</label>
                                    <select value={category} onChange={e => setCategory(e.target.value)} style={selectStyle}>
                                        <option value="general" style={{ background: "#1A1A2E", color: "#E8E8F0" }}>General</option>
                                        <option value="technical" style={{ background: "#1A1A2E", color: "#E8E8F0" }}>Technical</option>
                                        <option value="behavioral" style={{ background: "#1A1A2E", color: "#E8E8F0" }}>Behavioral</option>
                                        <option value="hr" style={{ background: "#1A1A2E", color: "#E8E8F0" }}>HR</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#8888A8", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "0.4rem" }}>Difficulty</label>
                                    <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={{ ...selectStyle, color: DIFFICULTY_COLOR[difficulty] || "#E8E8F0", borderColor: `${DIFFICULTY_COLOR[difficulty]}55` || "rgba(108,99,255,0.2)" }}>
                                        <option value="easy" style={{ background: "#1A1A2E", color: "#00D4AA" }}>Easy</option>
                                        <option value="medium" style={{ background: "#1A1A2E", color: "#FFB347" }}>Medium</option>
                                        <option value="hard" style={{ background: "#1A1A2E", color: "#FF4D6D" }}>Hard</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#8888A8", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "0.4rem" }}>Exam Duration (Minutes)</label>
                                <input type="number" min={1} max={10} value={durationMinutes} onChange={e => setDurationMinutes(parseInt(e.target.value) || 2)} style={inputStyle} />
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
                            <button onClick={() => { setShowModal(false); resetForm(); }} style={{ flex: 1, padding: "0.8rem", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.75rem", color: "#8888A8", fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>Cancel</button>
                            <button onClick={handleCreate} disabled={saving || !text.trim() || !modelAnswer.trim()} style={{ flex: 1, padding: "0.8rem", background: "linear-gradient(135deg, #6C63FF, #00D4AA)", border: "none", borderRadius: "0.75rem", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", opacity: saving || !text.trim() || !modelAnswer.trim() ? 0.6 : 1 }}>
                                {saving ? "Creating..." : "Create & Get Link"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Questions List */}
            {loading ? (
                <div style={{ textAlign: "center", padding: "4rem", color: "#8888A8" }}>
                    <div style={{ width: 36, height: 36, border: "3px solid rgba(108,99,255,0.2)", borderTopColor: "#6C63FF", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 1rem" }} />
                    Loading questions...
                </div>
            ) : questions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "5rem 2rem", background: "#1A1A2E", border: "1px dashed rgba(108,99,255,0.2)", borderRadius: "1.25rem" }}>
                    <BookOpen size={48} color="#444466" style={{ margin: "0 auto 1rem" }} />
                    <h3 style={{ color: "#8888A8", fontWeight: 600, marginBottom: "0.5rem" }}>No questions yet</h3>
                    <p style={{ color: "#444466", fontSize: "0.875rem" }}>Create your first exam question and share the link with students.</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {questions.map(q => {
                        const isExpanded = expandedId === q.id;
                        const isCopied = copiedId === q.id;
                        const examLink = `${baseUrl}/exam/${q.exam_token}`;

                        return (
                            <div key={q.id} style={{ background: "#1A1A2E", border: "1px solid rgba(108,99,255,0.15)", borderRadius: "1.25rem", overflow: "hidden", transition: "border-color 0.2s" }}>
                                {/* Card header */}
                                <div style={{ padding: "1.25rem 1.5rem", display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                                    {/* Difficulty dot */}
                                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: DIFFICULTY_COLOR[q.difficulty] || "#8888A8", marginTop: 6, flexShrink: 0 }} />

                                    {/* Content */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem", flexWrap: "wrap" }}>
                                            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#6C63FF", textTransform: "uppercase", letterSpacing: "0.1em", background: "rgba(108,99,255,0.1)", padding: "0.2rem 0.5rem", borderRadius: "999px" }}>{q.category}</span>
                                            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: DIFFICULTY_COLOR[q.difficulty], textTransform: "uppercase", letterSpacing: "0.1em" }}>{q.difficulty}</span>
                                        </div>
                                        <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "#E8E8F0", lineHeight: 1.5, marginBottom: "0.5rem" }}>{q.text}</p>

                                        {/* Link preview */}
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(108,99,255,0.12)", borderRadius: "0.5rem", padding: "0.4rem 0.75rem", maxWidth: "100%", overflow: "hidden" }}>
                                            <Link2 size={12} color="#6C63FF" style={{ flexShrink: 0 }} />
                                            <span style={{ fontSize: "0.75rem", color: "#8888A8", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{examLink}</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                                        <button
                                            onClick={() => copyLink(q)}
                                            title="Copy exam link"
                                            style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 0.9rem", background: isCopied ? "rgba(0,212,170,0.15)" : "rgba(108,99,255,0.1)", border: `1px solid ${isCopied ? "rgba(0,212,170,0.3)" : "rgba(108,99,255,0.25)"}`, borderRadius: "0.6rem", color: isCopied ? "#00D4AA" : "#6C63FF", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", transition: "all 0.2s" }}
                                        >
                                            {isCopied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Link</>}
                                        </button>
                                        <button
                                            onClick={() => openAssign(q)}
                                            title="Assign to student"
                                            style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 0.9rem", background: "rgba(0,212,170,0.08)", border: "1px solid rgba(0,212,170,0.2)", borderRadius: "0.6rem", color: "#00D4AA", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}
                                        >
                                            <UserPlus size={14} /> Assign
                                        </button>
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : q.id)}
                                            title="View details"
                                            style={{ padding: "0.5rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.6rem", color: "#8888A8", cursor: "pointer" }}
                                        >
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(q.id)}
                                            title="Delete question"
                                            style={{ padding: "0.5rem", background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.2)", borderRadius: "0.6rem", color: "#FF4D6D", cursor: "pointer" }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded: model answer + keywords */}
                                {isExpanded && (
                                    <div style={{ padding: "0 1.5rem 1.25rem", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                        <div>
                                            <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#8888A8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.35rem" }}>Model Answer</p>
                                            <p style={{ fontSize: "0.875rem", color: "#C8C8E0", lineHeight: 1.7 }}>{q.model_answer}</p>
                                        </div>
                                        {q.keywords && (
                                            <div>
                                                <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#8888A8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.35rem" }}>Keywords</p>
                                                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                                                    {q.keywords.split(",").map((k, i) => (
                                                        <span key={i} style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem", background: "rgba(108,99,255,0.08)", border: "1px solid rgba(108,99,255,0.15)", borderRadius: "999px", color: "#6C63FF" }}>{k.trim()}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Assign to Student Modal ── */}
            {assignQuestion && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "1rem" }}>
                    <div style={{ background: "#1A1A2E", border: "1px solid rgba(0,212,170,0.3)", borderRadius: "1.5rem", padding: "2rem", width: "100%", maxWidth: 480, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 0 60px rgba(0,212,170,0.15)" }}>
                        {/* Header */}
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                            <div>
                                <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#E8E8F0", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <UserPlus size={18} color="#00D4AA" /> Assign to Student
                                </h2>
                                <p style={{ fontSize: "0.8rem", color: "#8888A8", maxWidth: 340 }}>
                                    {assignQuestion.text.slice(0, 80)}{assignQuestion.text.length > 80 ? "..." : ""}
                                </p>
                            </div>
                            <button onClick={() => setAssignQuestion(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8888A8", padding: "0.25rem" }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Search */}
                        <div style={{ position: "relative", marginBottom: "1rem" }}>
                            <Search size={14} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "#8888A8" }} />
                            <input
                                type="text"
                                placeholder="Search students..."
                                value={studentSearch}
                                onChange={e => setStudentSearch(e.target.value)}
                                style={{ width: "100%", padding: "0.65rem 0.75rem 0.65rem 2.25rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.75rem", color: "#E8E8F0", fontSize: "0.875rem", fontFamily: "'Space Grotesk', sans-serif", outline: "none", boxSizing: "border-box" }}
                            />
                        </div>

                        {/* Student list */}
                        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            {filteredStudents.length === 0 ? (
                                <p style={{ textAlign: "center", color: "#8888A8", padding: "2rem", fontSize: "0.875rem" }}>
                                    {students.length === 0 ? "No registered students found." : "No students match your search."}
                                </p>
                            ) : filteredStudents.map(s => {
                                const isAssigned = assignedTo === s.id;
                                return (
                                    <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1rem", background: isAssigned ? "rgba(0,212,170,0.08)" : "rgba(255,255,255,0.02)", border: `1px solid ${isAssigned ? "rgba(0,212,170,0.3)" : "rgba(255,255,255,0.06)"}`, borderRadius: "0.75rem", transition: "all 0.2s" }}>
                                        <div>
                                            <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#E8E8F0", marginBottom: "0.15rem" }}>{s.full_name}</p>
                                            <p style={{ fontSize: "0.75rem", color: "#8888A8" }}>{s.email}</p>
                                        </div>
                                        <button
                                            onClick={() => handleAssign(s.id)}
                                            disabled={assigning || isAssigned}
                                            style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.45rem 0.9rem", background: isAssigned ? "rgba(0,212,170,0.15)" : "linear-gradient(135deg, #6C63FF, #00D4AA)", border: isAssigned ? "1px solid rgba(0,212,170,0.3)" : "none", borderRadius: "0.6rem", color: isAssigned ? "#00D4AA" : "#fff", fontSize: "0.8rem", fontWeight: 700, cursor: isAssigned ? "default" : "pointer", fontFamily: "'Space Grotesk', sans-serif", opacity: assigning ? 0.6 : 1 }}
                                        >
                                            {isAssigned ? <><Check size={13} /> Assigned</> : "Assign"}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        <button onClick={() => setAssignQuestion(null)} style={{ marginTop: "1.25rem", padding: "0.75rem", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.75rem", color: "#8888A8", fontWeight: 600, cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>Done</button>
                    </div>
                </div>
            )}
        </div>
    );
}
