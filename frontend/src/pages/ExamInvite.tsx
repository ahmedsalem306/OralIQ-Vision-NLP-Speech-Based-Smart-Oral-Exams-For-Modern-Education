import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";

/**
 * ExamInvite — handles the shared exam link.
 * Saves the exam token, then only lets an authenticated student enter.
 * Old lecturer/expired sessions are cleared so the student signup flow is shown.
 */
export default function ExamInvite() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    useEffect(() => {
        let cancelled = false;

        if (token) {
            // Save pending exam token so the exam room can pick it up
            localStorage.setItem("pendingExamToken", token);
        }

        const goToStudentSignup = () => {
            localStorage.removeItem("token");
            navigate("/register?redirect=/exam/start&role=student", { replace: true });
        };

        const resolveInvite = async () => {
            const authToken = localStorage.getItem("token");
            if (!authToken) {
                goToStudentSignup();
                return;
            }

            try {
                const { data } = await api.get("/users/me");
                if (cancelled) return;

                if (data?.role === "student") {
                    navigate("/exam/start", { replace: true });
                    return;
                }

                // A lecturer/admin token on the student's device should not skip signup.
                goToStudentSignup();
            } catch {
                if (!cancelled) goToStudentSignup();
            }
        };

        resolveInvite();
        return () => { cancelled = true; };
    }, [token, navigate]);

    // Brief loading state while redirecting
    return (
        <div style={{ minHeight: "100vh", background: "#0F0F1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
                <div style={{ width: 40, height: 40, border: "3px solid rgba(108,99,255,0.3)", borderTopColor: "#6C63FF", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 1rem" }} />
                <p style={{ color: "#8888A8", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.9rem" }}>Loading your exam...</p>
            </div>
        </div>
    );
}
