import { Link } from "react-router-dom";
import { CheckCircle2, ArrowRight } from "lucide-react";
import Logo from "../components/Logo";

export default function ExamDone() {
    return (
        <div style={{ minHeight: "100vh", background: "#0F0F1A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", textAlign: "center", backgroundImage: "radial-gradient(ellipse at 50% 30%, rgba(0,212,170,0.08) 0%, transparent 60%)" }}>
            <Logo size={40} showText={true} showSubtitle={true} className="mb-12" />

            {/* Success icon */}
            <div style={{ width: 100, height: 100, borderRadius: "50%", background: "rgba(0,212,170,0.12)", border: "2px solid rgba(0,212,170,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "2rem", boxShadow: "0 0 40px rgba(0,212,170,0.2)" }}>
                <CheckCircle2 size={50} color="#00D4AA" />
            </div>

            <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 900, color: "#E8E8F0", marginBottom: "1rem" }}>
                Exam Submitted!
            </h1>
            <p style={{ color: "#8888A8", fontSize: "1rem", maxWidth: 480, lineHeight: 1.8, marginBottom: "0.75rem" }}>
                Your answers have been recorded and are being analyzed by our AI system.
            </p>
            <p style={{ color: "#00D4AA", fontSize: "0.9rem", fontWeight: 600, marginBottom: "3rem" }}>
                Results will be sent to your professor shortly.
            </p>

            {/* Steps */}
            <div style={{ display: "flex", gap: "1.5rem", marginBottom: "3rem", flexWrap: "wrap", justifyContent: "center" }}>
                {[
                    { step: "01", label: "Exam Recorded", done: true },
                    { step: "02", label: "AI Analysis", done: false, active: true },
                    { step: "03", label: "Professor Notified", done: false },
                ].map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: "50%",
                            background: s.done ? "rgba(0,212,170,0.2)" : s.active ? "rgba(108,99,255,0.2)" : "rgba(255,255,255,0.05)",
                            border: `1px solid ${s.done ? "rgba(0,212,170,0.4)" : s.active ? "rgba(108,99,255,0.4)" : "rgba(255,255,255,0.1)"}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.75rem", fontWeight: 700,
                            color: s.done ? "#00D4AA" : s.active ? "#6C63FF" : "#8888A8",
                        }}>
                            {s.done ? <CheckCircle2 size={16} /> : s.step}
                        </div>
                        <span style={{ fontSize: "0.85rem", color: s.done ? "#00D4AA" : s.active ? "#6C63FF" : "#8888A8", fontWeight: s.active ? 600 : 400 }}>
                            {s.label}
                        </span>
                        {i < 2 && <ArrowRight size={14} color="#444466" />}
                    </div>
                ))}
            </div>

            <Link to="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.85rem 2rem", background: "linear-gradient(135deg, #6C63FF, #00D4AA)", color: "#fff", fontWeight: 700, borderRadius: "0.75rem", textDecoration: "none", fontSize: "0.9rem", boxShadow: "0 4px 20px rgba(108,99,255,0.35)" }}>
                Back to Dashboard <ArrowRight size={16} />
            </Link>
        </div>
    );
}
