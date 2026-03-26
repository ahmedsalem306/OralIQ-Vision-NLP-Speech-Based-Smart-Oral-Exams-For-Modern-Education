import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

/**
 * ExamInvite — handles the shared exam link.
 * Saves the exam token to localStorage, then:
 *   - If logged in → redirect to dashboard (exam card will appear there)
 *   - If not logged in → redirect to login (which redirects back to dashboard)
 */
export default function ExamInvite() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    useEffect(() => {
        if (token) {
            // Save pending exam token so dashboard can show it
            localStorage.setItem("pendingExamToken", token);
        }

        const authToken = localStorage.getItem("token");
        if (authToken) {
            // Already logged in → go to dashboard
            navigate("/dashboard", { replace: true });
        } else {
            // Not logged in → go to login, then dashboard
            navigate("/login?redirect=/dashboard", { replace: true });
        }
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
