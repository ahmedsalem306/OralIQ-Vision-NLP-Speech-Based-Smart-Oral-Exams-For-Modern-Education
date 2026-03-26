import { useState } from "react";
import api from "../lib/api";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

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

    return (
        <div className="oiq-auth-bg">
            <form className="oiq-card" onSubmit={handleLogin}>
                {/* Logo */}
                <div className="oiq-logo-mark">
                    <h1>OralIQ</h1>
                    <span>Interview &amp; Oral Exam Platform</span>
                </div>

                <h2>Welcome Back</h2>
                <p className="subtitle">Sign in to continue to your dashboard</p>

                {error && (
                    <div style={{ background: "rgba(255,77,109,0.1)", border: "1px solid rgba(255,77,109,0.3)", borderRadius: "0.75rem", padding: "0.75rem 1rem", color: "#FF4D6D", fontSize: "0.85rem", marginBottom: "1rem", textAlign: "center" }}>
                        {error}
                    </div>
                )}

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
                    {loading ? "Signing In..." : "Sign In"}
                </button>

                <div className="oiq-divider">OR</div>

                <Link to="/register">
                    <button type="button" className="oiq-btn-outline">
                        Don't have an account? Sign up
                    </button>
                </Link>
            </form>
        </div>
    );
}
