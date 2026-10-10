import { useState, useRef } from "react";
import api from "../lib/api";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, BookOpen } from "lucide-react";
import LanguageToggle from "../components/LanguageToggle";
import { useI18n } from "../i18n";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const inp: React.CSSProperties = {
    width: "100%",
    padding: "0.8rem 1rem",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "0.75rem",
    color: "#f0f0f0",
    fontSize: "0.9rem",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "'Inter', sans-serif",
    transition: "border-color 0.2s",
};

export default function RegisterPage() {
    const { t, dir } = useI18n();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get("redirect") || "/dashboard";
    const forcedRole = searchParams.get("role");
    const [role, setRole] = useState(forcedRole || "student");

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await api.post("/register", { email, password, full_name: fullName, role });
            const params = new URLSearchParams();
            params.append("username", email);
            params.append("password", password);
            const response = await api.post("/login/access-token", params);
            localStorage.setItem("token", response.data.access_token);
            navigate(redirectTo);
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string };
            setError(axiosErr?.response?.data?.detail || axiosErr?.message || t("auth.registerFailed"));
        } finally {
            setLoading(false);
        }
    };

    const G = "rgba(255,255,255,";

    return (
        <div className="oiq-auth-shell" style={{ minHeight: "100vh", background: "#0a0a0a", display: "grid" }}>

            {/* ── Left: Brand Panel ── */}
            <div className="hidden md:flex flex-col" style={{ position: "relative", overflow: "hidden", padding: "3rem", background: "#0a0a0a", borderRight: `1px solid ${G}0.04)` }}>
                {/* Background image */}
                <div style={{ position: "absolute", inset: 0, backgroundImage: "url(/images/hero-ai.png)", backgroundSize: "cover", backgroundPosition: "center", opacity: 0.12, pointerEvents: "none" }} />
                {/* Grid lines */}
                <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${G}0.02) 1px, transparent 1px), linear-gradient(90deg, ${G}0.02) 1px, transparent 1px)`, backgroundSize: "60px 60px", pointerEvents: "none" }} />

                <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
                    <p style={{ fontFamily: "'Antonio', sans-serif", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.22em", color: `${G}0.4)`, marginBottom: "auto" }}>
                        ORALIQ
                    </p>

                    <div style={{ marginBottom: "auto" }}>
                        <motion.h1
                            initial={{ opacity: 0, y: 28 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.75, ease: [0.25, 0.46, 0.45, 0.94] }}
                            style={{ fontFamily: "'Antonio', sans-serif", fontSize: "clamp(2.8rem, 4.5vw, 4.5rem)", fontWeight: 700, lineHeight: 0.95, marginBottom: "1.375rem", textTransform: "uppercase", letterSpacing: "0.04em" }}
                        >
                            <span style={{ color: "#f0f0f0" }}>{t("auth.hero.title1")}</span>
                            <br />
                            <span style={{
                                background: "linear-gradient(135deg, #ffffff 0%, #e0e0e0 50%, #ffffff 100%)",
                                backgroundSize: "200% auto",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                            }}>{t("auth.hero.title2")}</span>
                            <br />
                            <span style={{ color: "#404040", fontWeight: 300 }}>{t("auth.hero.title3")}</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.35 }}
                            style={{ color: "#404040", fontSize: "0.875rem", lineHeight: 1.85, maxWidth: 360, marginBottom: "2.25rem" }}
                        >
                            {t("auth.hero.description")}
                        </motion.p>

                        {/* Role descriptions */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.55 }}
                            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
                        >
                            {[
                                { icon: GraduationCap, title: t("auth.role.student"), desc: t("auth.role.studentSub") },
                                { icon: BookOpen, title: t("auth.role.lecturer"), desc: t("auth.role.lecturerSub") },
                            ].map(({ icon: Icon, title, desc }, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem" }}>
                                    <div style={{ width: 30, height: 30, borderRadius: "0.5rem", background: `${G}0.06)`, border: `1px solid ${G}0.11)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "0.1rem" }}>
                                        <Icon size={14} color="#ffffff" />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "#606060", marginBottom: "0.15rem" }}>{title}</p>
                                        <p style={{ fontSize: "0.75rem", color: "#404040" }}>{desc}</p>
                                    </div>
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
                                <p style={{ fontFamily: "'Antonio', sans-serif", fontSize: "1.3rem", fontWeight: 700, color: "#fff" }}>{val}</p>
                                <p style={{ fontSize: "0.65rem", color: "#303030", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "0.15rem" }}>{lbl}</p>
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
                        <p style={{ fontFamily: "'Antonio', sans-serif", fontSize: "2rem", fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.04em" }}>OralIQ</p>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
                        <LanguageToggle compact />
                    </div>

                    <div style={{ marginBottom: "2rem", textAlign: dir === "rtl" ? "right" : "left" }}>
                        <h2 style={{ fontFamily: "'Antonio', sans-serif", fontSize: "1.8rem", fontWeight: 700, color: "#fff", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.02em" }}>{t("auth.create.title")}</h2>
                        <p style={{ fontSize: "0.85rem", color: "#404040" }}>
                            {forcedRole === "student" ? t("auth.create.studentInvite") : t("auth.create.subtitle")}
                        </p>
                    </div>

                    {forcedRole === "student" && (
                        <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "0.75rem", padding: "0.75rem 1rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "0.8rem", color: "#ffffff" }}>📋</span>
                            <p style={{ fontSize: "0.8rem", color: "#c0c0c0", margin: 0 }}>{t("auth.create.studentInvite")}</p>
                        </div>
                    )}

                    {error && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            style={{ background: "rgba(255,77,77,0.07)", border: "1px solid rgba(255,77,77,0.2)", borderRadius: "0.75rem", padding: "0.75rem 1rem", color: "#ff4d4d", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                        {/* Role selector — hidden when role is forced via URL (e.g. exam invite) */}
                        {!forcedRole && (
                            <div>
                                <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#404040", display: "block", marginBottom: "0.5rem" }}>{t("auth.role.label")}</label>
                                <div style={{ display: "flex", gap: "0.625rem" }}>
                                    {[
                                        { value: "student", label: t("auth.role.student"), sub: t("auth.role.studentSub") },
                                        { value: "lecturer", label: t("auth.role.lecturer"), sub: t("auth.role.lecturerSub") },
                                    ].map(opt => (
                                        <button key={opt.value} type="button" onClick={() => setRole(opt.value)}
                                            style={{
                                                flex: 1, padding: "1.5rem 0.75rem", borderRadius: "1rem", cursor: "pointer",
                                                border: `2px solid ${role === opt.value ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.09)"}`,
                                                background: role === opt.value ? "rgba(255,255,255,0.08)" : "transparent",
                                                color: role === opt.value ? "#ffffff" : "#505050",
                                                transition: "all 0.25s",
                                                display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem",
                                            }}>
                                            <p style={{ fontFamily: "'Antonio', sans-serif", fontWeight: 700, fontSize: "1.4rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{opt.label}</p>
                                            <p style={{ fontSize: "0.7rem", opacity: 0.5, fontFamily: "'Inter', sans-serif" }}>{opt.sub}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#404040", display: "block", marginBottom: "0.4rem" }}>{t("auth.fullName")}</label>
                            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                                placeholder="Your full name" required style={inp}
                                onFocus={e => (e.target.style.borderColor = "rgba(255,255,255,0.38)")}
                                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                        </div>
                        <div>
                            <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#404040", display: "block", marginBottom: "0.4rem" }}>{t("auth.email")}</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com" required style={inp}
                                onFocus={e => (e.target.style.borderColor = "rgba(255,255,255,0.38)")}
                                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                        </div>
                        <div>
                            <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#404040", display: "block", marginBottom: "0.4rem" }}>{t("auth.password")}</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••" required style={inp}
                                onFocus={e => (e.target.style.borderColor = "rgba(255,255,255,0.38)")}
                                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")} />
                        </div>

                        <button type="submit" disabled={loading} style={{
                            marginTop: "0.375rem", padding: "0.875rem",
                            background: "#ffffff",
                            border: "none", borderRadius: "0.75rem",
                            color: "#0a0a0a", fontWeight: 800, fontSize: "0.9rem",
                            cursor: loading ? "not-allowed" : "pointer",
                            opacity: loading ? 0.7 : 1,
                            fontFamily: "'Antonio', sans-serif",
                            textTransform: "uppercase", letterSpacing: "0.06em",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                        }}>
                            {loading ? (
                                <>
                                    <span style={{ width: 15, height: 15, border: "2px solid rgba(10,10,10,0.2)", borderTopColor: "#0a0a0a", borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "inline-block" }} />
                                    {t("auth.create.loading")}
                                </>
                            ) : t("auth.create.button")}
                        </button>
                    </form>

                    <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: `1px solid ${G}0.06)`, textAlign: "center" }}>
                        <p style={{ fontSize: "0.83rem", color: "#404040" }}>
                            {t("auth.hasAccount")}{" "}
                            <Link to={`/login?redirect=${encodeURIComponent(redirectTo)}`} style={{ color: "#ffffff", fontWeight: 600, textDecoration: "none" }}>{t("auth.signIn.button")}</Link>
                        </p>
                    </div>
                    <p style={{ textAlign: "center", marginTop: "2rem", fontSize: "0.65rem", color: "#202020" }}>© 2026 OralIQ. All rights reserved.</p>
                </motion.div>
            </div>
        </div>
    );
}
