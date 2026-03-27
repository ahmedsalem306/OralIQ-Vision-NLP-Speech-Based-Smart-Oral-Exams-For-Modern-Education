import { useState } from "react";
import api from "../lib/api";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [role, setRole] = useState("student");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get("redirect") || "/dashboard";

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
            const axiosErr = err as { response?: { data?: { detail?: string } }, message?: string };
            const detail = axiosErr?.response?.data?.detail;
            setError(detail || axiosErr?.message || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="oiq-auth-bg">
            <form className="oiq-card" onSubmit={handleRegister} style={{ maxWidth: 460 }}>
                <div className="oiq-logo-mark">
                    <h1>OralIQ</h1>
                    <span>Interview &amp; Oral Exam Platform</span>
                </div>

                <h2>Create Account</h2>
                <p className="subtitle">Join OralIQ and start your journey</p>

                {error && (
                    <div style={{ background: "rgba(255,77,109,0.1)", border: "1px solid rgba(255,77,109,0.3)", borderRadius: "0.75rem", padding: "0.75rem 1rem", color: "#FF4D6D", fontSize: "0.85rem", marginBottom: "1rem", textAlign: "center" }}>
                        {error}
                    </div>
                )}

                {/* Role Selection — prominent */}
                <div style={{ marginBottom: "1.25rem" }}>
                    <p style={{ fontSize: "0.8rem", color: "#8888A8", marginBottom: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        I want to...
                    </p>
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                        <button
                            type="button"
                            onClick={() => setRole("student")}
                            style={{
                                flex: 1, padding: "0.9rem 0.5rem", borderRadius: "0.75rem",
                                border: `2px solid ${role === "student" ? "#6C63FF" : "rgba(255,255,255,0.08)"}`,
                                background: role === "student" ? "rgba(108,99,255,0.12)" : "transparent",
                                color: role === "student" ? "#6C63FF" : "#8888A8",
                                fontWeight: 700, fontSize: "0.875rem", cursor: "pointer",
                                fontFamily: "'Space Grotesk', sans-serif",
                                transition: "all 0.2s",
                            }}
                        >
                            Take Exams
                            <span style={{ display: "block", fontSize: "0.7rem", fontWeight: 400, marginTop: "0.2rem", opacity: 0.7 }}>Student</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole("lecturer")}
                            style={{
                                flex: 1, padding: "0.9rem 0.5rem", borderRadius: "0.75rem",
                                border: `2px solid ${role === "lecturer" ? "#00D4AA" : "rgba(255,255,255,0.08)"}`,
                                background: role === "lecturer" ? "rgba(0,212,170,0.12)" : "transparent",
                                color: role === "lecturer" ? "#00D4AA" : "#8888A8",
                                fontWeight: 700, fontSize: "0.875rem", cursor: "pointer",
                                fontFamily: "'Space Grotesk', sans-serif",
                                transition: "all 0.2s",
                            }}
                        >
                            Set Exams
                            <span style={{ display: "block", fontSize: "0.7rem", fontWeight: 400, marginTop: "0.2rem", opacity: 0.7 }}>Lecturer</span>
                        </button>
                    </div>
                </div>

                <div className="oiq-field">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                    </svg>
                    <input type="text" className="oiq-input" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>

                <div className="oiq-field">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                    </svg>
                    <input type="email" className="oiq-input" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>

                <div className="oiq-field">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                    </svg>
                    <input type="password" className="oiq-input" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>

                <button className="oiq-btn" disabled={loading}>
                    {loading ? "Creating Account..." : "Create Account"}
                </button>

                <div className="oiq-divider">OR</div>

                <Link to="/login">
                    <button type="button" className="oiq-btn-outline">
                        Already have an account? Sign in
                    </button>
                </Link>
            </form>
        </div>
    );
}
