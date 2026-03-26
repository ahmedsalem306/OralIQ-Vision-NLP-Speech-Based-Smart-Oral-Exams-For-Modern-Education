import { useState, useRef, useEffect } from "react";
import { Camera, User, Mail, Lock, Save } from "lucide-react";
import api from "../lib/api";

export default function Settings() {
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string>("");
    const [name, setName] = useState("");
    const [saved, setSaved] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        api.get("/users/me").then(res => {
            setUserEmail(res.data.email);
            setName(res.data.full_name || "");
            const pic = localStorage.getItem(`profilePic_${res.data.email}`);
            if (pic) setProfilePic(pic);
        }).catch(() => { });
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
                <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#E8E8F0", marginBottom: "0.25rem" }}>Settings</h1>
                <p style={{ color: "#8888A8", fontSize: "0.9rem" }}>Manage your account and preferences</p>
            </div>

            {/* Profile Picture Card */}
            <div style={{ background: "#1A1A2E", border: "1px solid rgba(108,99,255,0.15)", borderRadius: "1.25rem", padding: "2rem" }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#E8E8F0", marginBottom: "1.5rem" }}>Profile Picture</h2>
                <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
                    <div style={{ position: "relative" }} className="group">
                        <div style={{
                            width: 96, height: 96, borderRadius: "50%",
                            background: "linear-gradient(135deg, #6C63FF, #00D4AA)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            overflow: "hidden", boxShadow: "0 0 30px rgba(108,99,255,0.3)",
                            border: "3px solid rgba(108,99,255,0.3)",
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
                        <p style={{ color: "#E8E8F0", fontWeight: 600, marginBottom: "0.25rem" }}>Upload a new photo</p>
                        <p style={{ color: "#8888A8", fontSize: "0.8rem", marginBottom: "0.75rem" }}>JPG, PNG or GIF. Max 5MB.</p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                padding: "0.5rem 1.25rem",
                                background: "rgba(108,99,255,0.15)",
                                border: "1px solid rgba(108,99,255,0.3)",
                                borderRadius: "0.75rem",
                                color: "#6C63FF",
                                fontSize: "0.85rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: "'Space Grotesk', sans-serif",
                            }}
                        >
                            Choose Photo
                        </button>
                    </div>
                </div>
            </div>

            {/* Account Info Card */}
            <form onSubmit={handleSave} style={{ background: "#1A1A2E", border: "1px solid rgba(108,99,255,0.15)", borderRadius: "1.25rem", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#E8E8F0" }}>Account Information</h2>

                {saved && (
                    <div style={{ background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.3)", borderRadius: "0.75rem", padding: "0.75rem 1rem", color: "#00D4AA", fontSize: "0.85rem", textAlign: "center" }}>
                        Changes saved successfully!
                    </div>
                )}

                {[
                    { icon: User, label: "Full Name", type: "text", placeholder: "Your full name", value: name, onChange: (v: string) => setName(v) },
                    { icon: Mail, label: "Email", type: "email", placeholder: "your@email.com", value: "", onChange: () => { } },
                    { icon: Lock, label: "New Password", type: "password", placeholder: "Leave blank to keep current", value: "", onChange: () => { } },
                ].map((field, idx) => {
                    const Icon = field.icon;
                    return (
                        <div key={idx}>
                            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#8888A8", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                {field.label}
                            </label>
                            <div style={{ position: "relative" }}>
                                <Icon size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "#8888A8" }} />
                                <input
                                    type={field.type}
                                    placeholder={field.placeholder}
                                    style={{
                                        width: "100%",
                                        background: "rgba(255,255,255,0.04)",
                                        border: "1px solid rgba(108,99,255,0.2)",
                                        borderRadius: "0.75rem",
                                        padding: "0.85rem 1rem 0.85rem 2.75rem",
                                        color: "#E8E8F0",
                                        fontSize: "0.9rem",
                                        fontFamily: "'Space Grotesk', sans-serif",
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
                        background: "linear-gradient(135deg, #6C63FF, #8B85FF)",
                        color: "#fff", fontWeight: 700, fontSize: "0.9rem",
                        border: "none", borderRadius: "0.75rem", cursor: "pointer",
                        boxShadow: "0 4px 20px rgba(108,99,255,0.35)",
                        fontFamily: "'Space Grotesk', sans-serif",
                    }}
                >
                    <Save size={16} /> Save Changes
                </button>
            </form>
        </div>
    );
}
