import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, User, Mail, Lock, Save, ShieldCheck, Mic, AlertCircle, ArrowRight } from "lucide-react";
import api from "../lib/api";
import { useI18n } from "../i18n";
import VoiceEnrollmentModal from "../components/VoiceEnrollmentModal";

export default function Settings() {
    const { t } = useI18n();
    const navigate = useNavigate();
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string>("");
    const [name, setName] = useState("");
    const [saved, setSaved] = useState(false);
    const [hasVoiceprint, setHasVoiceprint] = useState<boolean | null>(null);
    const [hasBiometrics, setHasBiometrics] = useState<boolean | null>(null);
    const [canReenroll, setCanReenroll] = useState(true);
    const [voiceLocked, setVoiceLocked] = useState(false);
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [pendingExam, setPendingExam] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        api.get("/users/me").then(res => {
            setUserEmail(res.data.email);
            setName(res.data.full_name || "");
            const pic = localStorage.getItem(`profilePic_${res.data.email}`);
            if (pic) setProfilePic(pic);
        }).catch(() => { });
        // Voice status
        api.get("/voice/status")
            .then(res => {
                setHasVoiceprint(res.data.has_voiceprint);
                setHasBiometrics(res.data.biometrics_complete ?? res.data.has_voiceprint);
                setCanReenroll(res.data.can_reenroll !== false);
                setVoiceLocked(!!res.data.voice_locked);
                if (res.data.has_voiceprint && localStorage.getItem("pendingExamToken")) {
                    setPendingExam(true);
                }
            })
            .catch(() => setHasVoiceprint(false));
    }, []);

    const handlePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const result = ev.target?.result as string;
            setProfilePic(result);
            if (userEmail) localStorage.setItem(`profilePic_${userEmail}`, result);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: "2rem" }}>
            <div>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#f0f0f0", marginBottom: "0.25rem" }}>{t("settings.title")}</h1>
                <p style={{ color: "#808080", fontSize: "0.9rem" }}>{t("settings.subtitle")}</p>
            </div>

            {/* Profile Picture Card */}
            <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "1.25rem", padding: "2rem" }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#f0f0f0", marginBottom: "1.5rem" }}>{t("settings.profile")}</h2>
                <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
                    <div style={{ position: "relative" }} className="group">
                        <div style={{
                            width: 96, height: 96, borderRadius: "50%",
                            background: "#ffffff",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            overflow: "hidden", boxShadow: "0 0 30px rgba(255,255,255,0.3)",
                            border: "3px solid rgba(255,255,255,0.3)",
                        }}>
                            {profilePic
                                ? <img src={profilePic} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                : <User size={40} color="white" />
                            }
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                position: "absolute", inset: 0, borderRadius: "50%",
                                background: "rgba(0,0,0,0.65)", display: "flex",
                                alignItems: "center", justifyContent: "center",
                                border: "none", cursor: "pointer",
                                opacity: 0, transition: "opacity 0.2s",
                            }}
                            className="group-hover:opacity-100"
                        >
                            <Camera size={22} color="white" />
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePicChange} />
                    </div>
                    <div>
                        <p style={{ color: "#f0f0f0", fontWeight: 600, marginBottom: "0.25rem" }}>{t("settings.upload")}</p>
                        <p style={{ color: "#808080", fontSize: "0.8rem", marginBottom: "0.75rem" }}>JPG, PNG or GIF. Max 5MB.</p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                padding: "0.5rem 1.25rem",
                                background: "rgba(255,255,255,0.15)",
                                border: "1px solid rgba(255,255,255,0.3)",
                                borderRadius: "0.75rem",
                                color: "#ffffff",
                                fontSize: "0.85rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: "'Inter', sans-serif",
                            }}
                        >
                            {t("settings.choosePhoto")}
                        </button>
                    </div>
                </div>
            </div>

            {/* Voice Biometrics Card */}
            <div style={{ background: "#141414", border: `1px solid ${hasBiometrics ? "rgba(74,222,128,0.2)" : "rgba(255,160,0,0.25)"}`, borderRadius: "1.25rem", padding: "2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
                    <div style={{
                        width: 42, height: 42, borderRadius: "50%",
                        background: hasVoiceprint ? "rgba(74,222,128,0.12)" : "rgba(255,160,0,0.12)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                        {hasBiometrics
                            ? <ShieldCheck size={22} color="#4ade80" />
                            : <AlertCircle size={22} color="#ffa000" />}
                    </div>
                    <div>
                        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#f0f0f0" }}>
                            Face ID + بصمة الصوت
                        </h2>
                        <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
                            {hasBiometrics
                                ? voiceLocked && !canReenroll
                                    ? "مفعّلة ومقفولة — لا يمكن تغييرها إلا بإذن المحاضر 🔒"
                                    : voiceLocked && canReenroll
                                        ? "المحاضر سمح بإعادة التسجيل — سجّل بصمتك الجديدة الآن ✅"
                                        : "مفعّلة — يتم التحقق تلقائياً أثناء الامتحانات ✅"
                                : "غير مفعّلة — يجب تسجيلها قبل أداء أي امتحان ⚠️"}
                        </p>
                    </div>
                </div>
                {( !hasBiometrics || canReenroll ) && (
                <button
                    onClick={() => setShowVoiceModal(true)}
                    style={{
                        display: "inline-flex", alignItems: "center", gap: "0.5rem",
                        padding: "0.75rem 1.5rem",
                        background: hasVoiceprint ? "rgba(255,255,255,0.06)" : "#ffffff",
                        color: hasVoiceprint ? "#ffffff" : "#000000",
                        border: hasVoiceprint ? "1px solid rgba(255,255,255,0.15)" : "none",
                        borderRadius: "0.75rem",
                        fontWeight: 700, fontSize: "0.85rem",
                        cursor: "pointer",
                        fontFamily: "'Antonio', sans-serif",
                        textTransform: "uppercase", letterSpacing: "0.04em",
                        transition: "all 0.15s",
                    }}
                >
                    <Mic size={16} />
                    {hasBiometrics ? "إعادة تسجيل الهوية البيومترية" : "تسجيل Face ID + الصوت الآن"}
                </button>
                )}
                {hasBiometrics && voiceLocked && !canReenroll && (
                    <p style={{ marginTop: "0.75rem", fontSize: "0.78rem", color: "#ffa000", lineHeight: 1.6 }} dir="rtl">
                        لحماية نزاهة الامتحان، لا يمكنك تغيير بصمة صوتك. اطلب من المحاضر السماح بإعادة التسجيل إذا احتجت.
                    </p>
                )}
            </div>

            {/* Pending Exam Banner — shows after voice enrollment if there's an exam waiting */}
            {hasBiometrics && pendingExam && (
                <div style={{
                    background: "linear-gradient(135deg, rgba(26,110,26,0.15), rgba(74,222,128,0.08))",
                    border: "1px solid rgba(74,222,128,0.3)",
                    borderRadius: "1.25rem", padding: "1.5rem",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: "1rem", flexWrap: "wrap",
                }}>
                    <div>
                        <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#4ade80", marginBottom: "0.25rem" }}>
                            ✅ تم تفعيل البصمة بنجاح!
                        </h3>
                        <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                            لديك امتحان في الانتظار — يمكنك العودة إليه الآن.
                        </p>
                    </div>
                    <button onClick={() => navigate("/exam/start")}
                        style={{
                            padding: "0.85rem 1.75rem", background: "#ffffff", border: "none",
                            borderRadius: "0.85rem", color: "#0a0a0a", cursor: "pointer",
                            fontWeight: 800, fontSize: "0.9rem",
                            display: "inline-flex", alignItems: "center", gap: "0.5rem",
                            boxShadow: "0 4px 20px rgba(255,255,255,0.15)",
                            fontFamily: "'Antonio', sans-serif",
                            textTransform: "uppercase", letterSpacing: "0.04em",
                        }}>
                        العودة للامتحان <ArrowRight size={16} />
                    </button>
                </div>
            )}

            {/* Account Info Card */}
            <form onSubmit={handleSave} style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "1.25rem", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#f0f0f0" }}>{t("settings.accountInfo")}</h2>

                {saved && (
                    <div style={{ background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.3)", borderRadius: "0.75rem", padding: "0.75rem 1rem", color: "#e0e0e0", fontSize: "0.85rem", textAlign: "center" }}>
                        {t("settings.saved")}
                    </div>
                )}

                {[
                    { icon: User, label: t("auth.fullName"), type: "text", placeholder: t("auth.fullName"), value: name, onChange: (v: string) => setName(v) },
                    { icon: Mail, label: t("auth.email"), type: "email", placeholder: "your@email.com", value: "", onChange: () => { } },
                    { icon: Lock, label: t("auth.password"), type: "password", placeholder: t("auth.password"), value: "", onChange: () => { } },
                ].map((field, idx) => {
                    const Icon = field.icon;
                    return (
                        <div key={idx}>
                            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#808080", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                {field.label}
                            </label>
                            <div style={{ position: "relative" }}>
                                <Icon size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "#808080" }} />
                                <input
                                    type={field.type}
                                    placeholder={field.placeholder}
                                    style={{
                                        width: "100%",
                                        background: "rgba(255,255,255,0.04)",
                                        border: "1px solid rgba(255,255,255,0.2)",
                                        borderRadius: "0.75rem",
                                        padding: "0.85rem 1rem 0.85rem 2.75rem",
                                        color: "#f0f0f0",
                                        fontSize: "0.9rem",
                                        fontFamily: "'Inter', sans-serif",
                                        outline: "none",
                                        boxSizing: "border-box",
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}

                <button
                    type="submit"
                    style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                        padding: "0.85rem",
                        background: "linear-gradient(135deg, #ffffff, #8B85FF)",
                        color: "#fff", fontWeight: 700, fontSize: "0.9rem",
                        border: "none", borderRadius: "0.75rem", cursor: "pointer",
                        boxShadow: "0 4px 20px rgba(255,255,255,0.35)",
                        fontFamily: "'Inter', sans-serif",
                    }}
                >
                    <Save size={16} /> {t("settings.save")}
                </button>
            </form>

            <VoiceEnrollmentModal
                isOpen={showVoiceModal}
                onClose={() => setShowVoiceModal(false)}
                onSuccess={() => {
                    setShowVoiceModal(false);
                    setHasVoiceprint(true);
                    setHasBiometrics(true);
                    setVoiceLocked(true);
                    setCanReenroll(false);
                    if (localStorage.getItem("pendingExamToken")) {
                        setPendingExam(true);
                    }
                }}
            />
        </div>
    );
}

