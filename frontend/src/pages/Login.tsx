import { useState, useRef } from "react";
import api from "../lib/api";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Brain, Mic, Shield } from "lucide-react";
import LanguageToggle from "../components/LanguageToggle";
import { useI18n } from "../i18n";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const inp: React.CSSProperties = {
    width: "100%", padding: "0.85rem 1rem",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "0.75rem", color: "#f0f0f0",
    fontSize: "0.9rem", outline: "none", boxSizing: "border-box",
    fontFamily: "'Inter', sans-serif", transition: "border-color 0.25s, box-shadow 0.25s",
};

export default function LoginPage() {
    const { t, dir } = useI18n();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get("redirect") || "/dashboard";
    const heroRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const stripRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        if (!heroRef.current) return;
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(titleRef.current, { y: 80, opacity: 0, duration: 1, delay: 0.2 })
          .from(".hero-line", { scaleX: 0, transformOrigin: "left", duration: 0.8 }, "-=0.5")
          .from(".hero-desc", { y: 30, opacity: 0, duration: 0.7 }, "-=0.4")
          .from(".hero-feature", { y: 20, opacity: 0, stagger: 0.12, duration: 0.5 }, "-=0.3")
          .from(".hero-stat", { y: 20, opacity: 0, stagger: 0.1, duration: 0.5 }, "-=0.2")
          .from(stripRef.current, { xPercent: 100, opacity: 0, duration: 1.2, ease: "power2.out" }, "-=0.8");
    }, { scope: heroRef });

    useGSAP(() => {
        if (!formRef.current) return;
        gsap.from(formRef.current.children, {
            y: 30, opacity: 0, stagger: 0.08, duration: 0.6,
            ease: "power2.out", delay: 0.5,
        });
    }, { scope: formRef });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true); setError("");
        try {
            const params = new URLSearchParams();
            params.append("username", email);
            params.append("password", password);
            const response = await api.post("/login/access-token", params);
            localStorage.setItem("token", response.data.access_token);
            navigate(redirectTo);
        } catch { setError(t("auth.invalidLogin")); }
        finally { setLoading(false); }
    };

    return (
        <div className="oiq-auth-shell" style={{ minHeight: "100vh", background: "#0a0a0a", display: "grid" }}>

            {/* ── Left: Brand Hero Panel ── */}
            <div ref={heroRef} className="hidden md:flex flex-col" style={{
                position: "relative", overflow: "hidden", padding: "3rem",
                background: "#0a0a0a", borderRight: "1px solid rgba(255,255,255,0.04)",
            }}>
                {/* Background image */}
                <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: "url(/images/hero-ai.png)",
                    backgroundSize: "cover", backgroundPosition: "center",
                    opacity: 0.15, pointerEvents: "none",
                }} />

                {/* Subtle grid */}
                <div style={{
                    position: "absolute", inset: 0,
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
                    backgroundSize: "60px 60px", pointerEvents: "none",
                }} />

                <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", justifyContent: "center" }}>
                    {/* Top tag */}
                    <p style={{
                        fontFamily: "'Antonio', sans-serif", fontSize: "0.75rem", fontWeight: 700,
                        letterSpacing: "0.2em", color: "rgba(255,255,255,0.25)",
                        textTransform: "uppercase", position: "absolute", top: "3rem", left: 0,
                    }}>ORALIQ</p>

                    {/* Main title */}
                    <h1 ref={titleRef} style={{
                        fontFamily: "'Antonio', sans-serif",
                        fontSize: "clamp(3rem, 5vw, 5.5rem)",
                        fontWeight: 700, lineHeight: 0.95,
                        textTransform: "uppercase", letterSpacing: "0.04em",
                        marginBottom: "1.5rem",
                    }}>
                        <span style={{ color: "#ffffff" }}>{t("auth.hero.title1")}</span><br />
                        <span style={{ color: "#ffffff" }}>{t("auth.hero.title2")}</span><br />
                        <span style={{ color: "rgba(255,255,255,0.12)", fontWeight: 300 }}>{t("auth.hero.title3")}</span>
                    </h1>

                    {/* Divider line */}
                    <div className="hero-line" style={{
                        width: "80px", height: "2px", background: "#fff",
                        marginBottom: "1.25rem",
                    }} />

                    <p className="hero-desc" style={{
                        color: "rgba(255,255,255,0.35)", fontSize: "0.85rem",
                        lineHeight: 1.8, maxWidth: 320, paddingBottom: "2rem",
                    }}>
                        {t("auth.hero.description")}
                    </p>

                    {/* Stats row */}
                    <div style={{
                        display: "flex", gap: "3rem", paddingTop: "2rem",
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                        position: "absolute", bottom: "3rem", left: 0,
                    }}>
                        {[["3+", "AI Models"], ["95%", "Accuracy"], ["<2s", "Response"]].map(([val, lbl], i) => (
                            <div key={i} className="hero-stat">
                                <p style={{
                                    fontFamily: "'Antonio', sans-serif", fontSize: "1.3rem",
                                    fontWeight: 700, color: "#fff",
                                }}>{val}</p>
                                <p style={{
                                    fontSize: "0.6rem", color: "rgba(255,255,255,0.2)",
                                    textTransform: "uppercase", letterSpacing: "0.12em", marginTop: "0.15rem",
                                }}>{lbl}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Scrolling text strip (Spylt-style) */}
                <div ref={stripRef} style={{
                    position: "absolute", bottom: "25%", left: "-5%", right: "-5%",
                    transform: "rotate(-3deg)", overflow: "hidden",
                    background: "#fff", padding: "0.5rem 0", zIndex: 2,
                    boxShadow: "0 4px 30px rgba(0,0,0,0.3)",
                }}>
                    <div style={{
                        display: "inline-flex", animation: "marquee 25s linear infinite",
                        whiteSpace: "nowrap",
                    }}>
                        {[...Array(4)].map((_, i) => (
                            <span key={i} style={{
                                fontFamily: "'Antonio', sans-serif", fontSize: "1rem",
                                fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                                color: "#0a0a0a", padding: "0 2rem",
                            }}>
                                SMART ORAL EXAMS&nbsp;&nbsp;•&nbsp;&nbsp;AI POWERED&nbsp;&nbsp;•&nbsp;&nbsp;ORALIQ&nbsp;&nbsp;•&nbsp;&nbsp;VISION + NLP + SPEECH&nbsp;&nbsp;•&nbsp;&nbsp;
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Right: Login Form ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", background: "#0a0a0a" }}>
                <div ref={formRef} style={{ width: "100%", maxWidth: 380 }}>
                    {/* Mobile logo */}
                    <div className="md:hidden" style={{ marginBottom: "2.5rem", textAlign: "center" }}>
                        <p style={{
                            fontFamily: "'Antonio', sans-serif", fontSize: "2rem",
                            fontWeight: 700, color: "#fff", textTransform: "uppercase",
                            letterSpacing: "0.04em",
                        }}>OralIQ</p>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
                        <LanguageToggle compact />
                    </div>

                    <div style={{ marginBottom: "2.5rem", textAlign: dir === "rtl" ? "right" : "left" }}>
                        <h2 style={{
                            fontFamily: "'Antonio', sans-serif", fontSize: "1.8rem",
                            fontWeight: 700, color: "#fff", marginBottom: "0.5rem",
                            textTransform: "uppercase", letterSpacing: "0.02em",
                        }}>{t("auth.signIn.title")}</h2>
                        <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.3)" }}>{t("auth.signIn.subtitle")}</p>
                    </div>

                    {error && (
                        <div style={{
                            background: "rgba(255,77,77,0.06)", border: "1px solid rgba(255,77,77,0.2)",
                            borderRadius: "0.75rem", padding: "0.75rem 1rem",
                            color: "#ff4d4d", fontSize: "0.82rem", marginBottom: "1.25rem",
                        }}>{error}</div>
                    )}

                    <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                        <div>
                            <label style={{
                                fontFamily: "'Antonio', sans-serif", fontSize: "0.75rem",
                                fontWeight: 700, color: "rgba(255,255,255,0.3)",
                                display: "block", marginBottom: "0.5rem",
                                textTransform: "uppercase", letterSpacing: "0.1em",
                            }}>{t("auth.email")}</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com" required style={inp}
                                onFocus={e => { e.target.style.borderColor = "rgba(255,255,255,0.25)"; e.target.style.boxShadow = "0 0 0 3px rgba(255,255,255,0.04)"; }}
                                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
                            />
                        </div>
                        <div>
                            <label style={{
                                fontFamily: "'Antonio', sans-serif", fontSize: "0.75rem",
                                fontWeight: 700, color: "rgba(255,255,255,0.3)",
                                display: "block", marginBottom: "0.5rem",
                                textTransform: "uppercase", letterSpacing: "0.1em",
                            }}>{t("auth.password")}</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••" required style={inp}
                                onFocus={e => { e.target.style.borderColor = "rgba(255,255,255,0.25)"; e.target.style.boxShadow = "0 0 0 3px rgba(255,255,255,0.04)"; }}
                                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
                            />
                        </div>

                        <button type="submit" disabled={loading} style={{
                            marginTop: "0.5rem", padding: "0.95rem",
                            background: "#fff", border: "none", borderRadius: "0.75rem",
                            color: "#0a0a0a", fontWeight: 700, fontSize: "0.9rem",
                            cursor: loading ? "not-allowed" : "pointer",
                            opacity: loading ? 0.7 : 1,
                            fontFamily: "'Antonio', sans-serif",
                            textTransform: "uppercase", letterSpacing: "0.08em",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                            transition: "transform 0.2s, box-shadow 0.2s",
                        }}
                        onMouseEnter={e => { if (!loading) { (e.target as HTMLElement).style.transform = "translateY(-2px)"; (e.target as HTMLElement).style.boxShadow = "0 8px 30px rgba(255,255,255,0.1)"; } }}
                        onMouseLeave={e => { (e.target as HTMLElement).style.transform = "translateY(0)"; (e.target as HTMLElement).style.boxShadow = "none"; }}
                        >
                            {loading ? (
                                <>
                                    <span style={{ width: 15, height: 15, border: "2px solid rgba(10,10,10,0.2)", borderTopColor: "#0a0a0a", borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "inline-block" }} />
                                    {t("auth.signIn.loading")}
                                </>
                            ) : t("auth.signIn.button")}
                        </button>
                    </form>

                    <div style={{
                        marginTop: "1.75rem", paddingTop: "1.75rem",
                        borderTop: "1px solid rgba(255,255,255,0.05)", textAlign: "center",
                    }}>
                        <p style={{ fontSize: "0.83rem", color: "rgba(255,255,255,0.3)" }}>
                            {t("auth.noAccount")}{" "}
                            <Link to={`/register?redirect=${encodeURIComponent(redirectTo)}`}
                                style={{ color: "#fff", fontWeight: 600, textDecoration: "none" }}>
                                {t("auth.signUp.link")}
                            </Link>
                        </p>
                    </div>
                    <p style={{ textAlign: "center", marginTop: "2rem", fontSize: "0.6rem", color: "rgba(255,255,255,0.1)" }}>
                        © 2026 OralIQ. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
