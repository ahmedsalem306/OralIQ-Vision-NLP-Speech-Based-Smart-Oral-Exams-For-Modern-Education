import { useState } from "react";
import api from "../lib/api";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Mic, Shield } from "lucide-react";

const inp: React.CSSProperties = {
    width: "100%",
    padding: "0.8rem 1rem",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(207,163,85,0.12)",
    borderRadius: "0.75rem",
    color: "#e5e5e0",
    fontSize: "0.9rem",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "'Inter', sans-serif",
    transition: "border-color 0.2s",
};

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get("redirect") || "/dashboard";

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const params = new URLSearchParams();
            params.append("username", email);
            params.append("password", password);
            const response = await api.post("/login/access-token", params);
            localStorage.setItem("token", response.data.access_token);
            navigate(redirectTo);
        } catch {
            setError("Invalid email or password. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const G = "rgba(207,163,85,";

    return (
        <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "grid", gridTemplateColumns: "1fr 1fr" }}
            className="grid-cols-1 md:grid-cols-2">

            {/* ── Left: Brand Panel ── */}
            <div className="hidden md:flex flex-col" style={{ position: "relative", overflow: "hidden", padding: "3rem", background: "#0d0d0d", borderRight: `1px solid ${G}0.06)` }}>
                {/* Subtle grid lines */}
                <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${G}0.04) 1px, transparent 1px), linear-gradient(90deg, ${G}0.04) 1px, transparent 1px)`, backgroundSize: "48px 48px", pointerEvents: "none" }} />
                {/* Radial glows */}
                <div style={{ position: "absolute", top: -80, right: -80, width: 360, height: 360, borderRadius: "50%", background: `radial-gradient(circle, ${G}0.07) 0%, transparent 70%)`, pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: -40, left: -40, width: 240, height: 240, borderRadius: "50%", background: `radial-gradient(circle, ${G}0.05) 0%, transparent 70%)`, pointerEvents: "none" }} />

                <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
                    {/* Top logo tag */}
                    <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.22em", color: `${G}0.4)`, marginBottom: "auto" }}>
                        ORALIQ
                    </p>

                    {/* Hero wordmark */}
                    <div style={{ marginBottom: "auto" }}>
                        <motion.h1
                            initial={{ opacity: 0, y: 28 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.75, ease: [0.25, 0.46, 0.45, 0.94] }}
                            style={{ fontFamily: "'Amiamie', 'Orbitron', sans-serif", fontSize: "clamp(2.8rem, 4.5vw, 4.5rem)", fontWeight: 900, lineHeight: 1.04, marginBottom: "1.375rem" }}
                        >
                            <span style={{ color: "#e5e5e0" }}>AI Oral</span>
                            <br />
                            <span style={{
                                background: "linear-gradient(135deg, #cfa355 0%, #e8c97a 50%, #cfa355 100%)",
                                backgroundSize: "200% auto",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                            }}>Exam</span>
                            <br />
                            <span style={{ color: "#3a3a2a", fontWeight: 300 }}>Platform</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.35 }}
                            style={{ color: "#3a3a2a", fontSize: "0.875rem", lineHeight: 1.85, maxWidth: 360, marginBottom: "2.25rem" }}
                        >
                            Conduct AI-powered oral exams with real-time speech recognition,
                            NLP-based grading, and facial integrity monitoring.
                        </motion.p>

                        {/* Feature bullets */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.55 }}
                            style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}
                        >
                            {[
                                { icon: Mic, text: "Real-time speech recognition & fluency scoring" },
                                { icon: Brain, text: "Gemini AI evaluates answer quality and relevance" },
                                { icon: Shield, text: "Facial analysis with anti-cheat integrity checks" },
                            ].map(({ icon: Icon, text }, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                                    <div style={{ width: 30, height: 30, borderRadius: "0.5rem", background: `${G}0.06)`, border: `1px solid ${G}0.11)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <Icon size={14} color="#cfa355" />
                                    </div>
                                    <span style={{ fontSize: "0.8rem", color: "#4a4a3a" }}>{text}</span>
                                </div>
                            ))}
                        </motion.div>
                    </div>

                    {/* Stats row */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.75 }}
                        style={{ display: "flex", gap: "2.5rem", paddingTop: "2rem", borderTop: `1px solid ${G}0.06)` }}
                    >
                        {[["3+", "AI Models"], ["95%", "Accuracy"], ["<2s", "Response"]].map(([val, lbl], i) => (
                            <div key={i}>
                                <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "1.05rem", fontWeight: 800, color: "#b8934a" }}>{val}</p>
                                <p style={{ fontSize: "0.65rem", color: "#2a2a1a", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "0.15rem" }}>{lbl}</p>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </div>

            {/* ── Right: Form ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", background: "#0a0a0a" }}>
                <motion.div
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.55 }}
                    style={{ width: "100%", maxWidth: 380 }}
                >
                    {/* Mobile logo */}
                    <div className="md:hidden" style={{ marginBottom: "2rem", textAlign: "center" }}>
                        <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "1.25rem", fontWeight: 900, background: "linear-gradient(135deg, #cfa355, #e8c97a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>OralIQ</p>
                    </div>

                    <div style={{ marginBottom: "2.25rem" }}>
                        <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#e5e5e0", marginBottom: "0.375rem" }}>Sign in</h2>
                        <p style={{ fontSize: "0.85rem", color: "#3a3a2a" }}>Continue to your dashboard</p>
                    </div>

                    {error && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            style={{ background: "rgba(224,85,85,0.07)", border: "1px solid rgba(224,85,85,0.2)", borderRadius: "0.75rem", padding: "0.75rem 1rem", color: "#e05555", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                        <div>
                            <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#3a3a2a", display: "block", marginBottom: "0.4rem" }}>Email address</label>
                            <input
                                type="email" value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required style={inp}
                                onFocus={e => (e.target.style.borderColor = "rgba(207,163,85,0.38)")}
                                onBlur={e => (e.target.style.borderColor = "rgba(207,163,85,0.12)")}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#3a3a2a", display: "block", marginBottom: "0.4rem" }}>Password</label>
                            <input
                                type="password" value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required style={inp}
                                onFocus={e => (e.target.style.borderColor = "rgba(207,163,85,0.38)")}
                                onBlur={e => (e.target.style.borderColor = "rgba(207,163,85,0.12)")}
                            />
                        </div>

                        <button type="submit" disabled={loading} style={{
                            marginTop: "0.375rem", padding: "0.875rem",
                            background: "linear-gradient(135deg, #cfa355, #e0b86b)",
                            border: "none", borderRadius: "0.75rem",
                            color: "#0a0a0a", fontWeight: 800, fontSize: "0.9rem",
                            cursor: loading ? "not-allowed" : "pointer",
                            opacity: loading ? 0.7 : 1,
                            fontFamily: "'Inter', sans-serif",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                        }}>
                            {loading ? (
                                <>
                                    <span style={{ width: 15, height: 15, border: "2px solid rgba(10,10,10,0.2)", borderTopColor: "#0a0a0a", borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "inline-block" }} />
                                    Signing in…
                                </>
                            ) : "Sign In"}
                        </button>
                    </form>

                    <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: `1px solid ${G}0.06)`, textAlign: "center" }}>
                        <p style={{ fontSize: "0.83rem", color: "#3a3a2a" }}>
                            Don't have an account?{" "}
                            <Link to={`/register?redirect=${encodeURIComponent(redirectTo)}`} style={{ color: "#cfa355", fontWeight: 600, textDecoration: "none" }}>Sign up</Link>
                        </p>
                    </div>
                    <p style={{ textAlign: "center", marginTop: "2rem", fontSize: "0.65rem", color: "#1a1a0a" }}>© 2026 OralIQ. All rights reserved.</p>
                </motion.div>
            </div>
        </div>
    );
}
