import { useState, useEffect, useRef } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard, Users, BarChart2, Settings, LogOut, Menu, Camera,
    ClipboardList, Award, MessageSquare, TrendingUp, X, ChevronRight
} from "lucide-react";
import { cn } from "../lib/utils";
import api from "../lib/api";
import Logo from "../components/Logo";
import { AnimatePresence, motion } from "framer-motion";
import LanguageToggle from "../components/LanguageToggle";
import { useI18n } from "../i18n";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function DashboardLayout() {
    const { t, dir } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState<{ full_name: string; email: string; role: string } | null>(null);
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const location = useLocation();
    const navigate = useNavigate();
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        api.get("/users/me")
            .then((res) => {
                setUser(res.data);
                const saved = localStorage.getItem(`profilePic_${res.data.email}`);
                if (saved) setProfilePic(saved);
            })
            .catch((err) => {
                const status = err?.response?.status;
                if (status === 401 || status === 403) {
                    localStorage.removeItem("token");
                    navigate("/login", { replace: true });
                }
            });
    }, [navigate]);

    // Animate page content on route change
    useGSAP(() => {
        if (!contentRef.current) return;
        gsap.fromTo(contentRef.current,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
        );
    }, { dependencies: [location.pathname], scope: contentRef });

    const handleLogout = () => { localStorage.removeItem("token"); navigate("/login"); };

    const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const result = ev.target?.result as string;
            setProfilePic(result);
            localStorage.setItem(`profilePic_${user.email}`, result);
        };
        reader.readAsDataURL(file);
    };

    const isLecturer = user?.role === "lecturer" || user?.role === "hr" || user?.role === "admin";
    const pageTitle = ({
        "/dashboard": t("nav.overview"),
        "/dashboard/questions": t("nav.questions"),
        "/dashboard/results": t("nav.results"),
        "/dashboard/analytics": t("nav.analytics"),
        "/dashboard/attendance": t("nav.attendance"),
        "/dashboard/settings": t("nav.settings"),
        "/dashboard/grades": t("nav.grades"),
        "/dashboard/messages": t("nav.messages"),
        "/dashboard/students": t("nav.students"),
    } as Record<string, string>)[location.pathname] || "Dashboard";

    const navGroups = [
        {
            label: t("nav.platform"),
            items: [
                { icon: LayoutDashboard, label: t("nav.overview"), href: "/dashboard" },
                ...(isLecturer
                    ? [{ icon: ClipboardList, label: t("nav.questions"), href: "/dashboard/questions" }]
                    : [
                        { icon: Award, label: t("nav.grades"), href: "/dashboard/grades" },
                        { icon: MessageSquare, label: t("nav.messages"), href: "/dashboard/messages" },
                    ]),
            ],
        },
        ...(isLecturer ? [{
            label: t("nav.analytics"),
            items: [
                { icon: BarChart2, label: t("nav.results"), href: "/dashboard/results" },
                { icon: TrendingUp, label: t("nav.analytics"), href: "/dashboard/analytics" },
                { icon: Users, label: t("nav.attendance"), href: "/dashboard/attendance" },
            ],
        }] : []),
        {
            label: t("nav.account"),
            items: [
                { icon: Settings, label: t("nav.settings"), href: "/dashboard/settings" },
            ],
        },
    ];

    const avatarInner = profilePic
        ? <img src={profilePic} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
        : <span style={{ color: "#0a0a0a", fontWeight: 800, fontSize: "0.85rem" }}>{user?.full_name?.[0]?.toUpperCase() || "U"}</span>;

    return (
        <div className="noise-overlay" style={{ minHeight: "100vh", background: "#0a0a0a", color: "#f0f0f0", display: "flex" }}>
            {/* Mobile overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div className="fixed inset-0 z-40 md:hidden"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
                        onClick={() => setIsOpen(false)} />
                )}
            </AnimatePresence>

            {/* ── Sidebar ── */}
            <aside className={cn(
                `fixed inset-y-0 ${dir === "rtl" ? "right-0" : "left-0"} z-50 flex flex-col transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static`,
                isOpen ? "translate-x-0" : (dir === "rtl" ? "translate-x-full" : "-translate-x-full")
            )} style={{
                width: 230, background: "#0d0d0d",
                borderRight: "1px solid rgba(255,255,255,0.04)", flexShrink: 0,
            }}>
                {/* Logo */}
                <div style={{
                    height: 64, display: "flex", alignItems: "center",
                    padding: "0 1.25rem",
                    borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0,
                }}>
                    <span style={{
                        fontFamily: "'Antonio', sans-serif", fontSize: "1.3rem",
                        fontWeight: 700, color: "#fff", textTransform: "uppercase",
                        letterSpacing: "0.02em",
                    }}>ORALIQ</span>
                    <button className="ml-auto md:hidden" onClick={() => setIsOpen(false)}
                        style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: "0.25rem" }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Nav groups */}
                <nav style={{ flex: 1, padding: "0.75rem 0.625rem", overflowY: "auto" }}>
                    {navGroups.map((group, gi) => (
                        <div key={gi} style={{ marginBottom: "0.5rem" }}>
                            <p style={{
                                fontFamily: "'Antonio', sans-serif",
                                fontSize: "0.6rem", fontWeight: 700,
                                letterSpacing: "0.2em", textTransform: "uppercase",
                                color: "rgba(255,255,255,0.15)",
                                padding: "0.75rem 0.75rem 0.35rem",
                            }}>{group.label}</p>
                            {group.items.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.href;
                                return (
                                    <Link key={item.href} to={item.href} onClick={() => setIsOpen(false)}
                                        style={{
                                            display: "flex", alignItems: "center", gap: "0.7rem",
                                            padding: "0.6rem 0.75rem", borderRadius: "0.6rem", marginBottom: "0.1rem",
                                            fontSize: "0.85rem", fontWeight: isActive ? 600 : 400,
                                            textDecoration: "none", transition: "all 0.15s",
                                            background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                                            color: isActive ? "#fff" : "rgba(255,255,255,0.35)",
                                        }}
                                        className={!isActive ? "hover:text-white/60 hover:bg-white/[0.03]" : ""}>
                                        <Icon size={15} />
                                        <span style={{ flex: 1 }}>{item.label}</span>
                                        {isActive && (
                                            <div style={{
                                                width: 5, height: 5, borderRadius: "50%",
                                                background: "#fff", flexShrink: 0,
                                            }} />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                {/* User card */}
                {user && (
                    <div style={{
                        margin: "0.75rem", padding: "1rem",
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        borderRadius: "1rem", flexShrink: 0,
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", marginBottom: "0.85rem" }}>
                            <div
                                style={{
                                    width: 34, height: 34, borderRadius: "50%",
                                    background: "#fff", display: "flex", alignItems: "center",
                                    justifyContent: "center", overflow: "hidden", flexShrink: 0,
                                    cursor: "pointer", position: "relative",
                                }}
                                onClick={() => fileInputRef.current?.click()}
                                className="group/av"
                            >
                                {avatarInner}
                                <div style={{
                                    position: "absolute", inset: 0, borderRadius: "50%",
                                    background: "rgba(0,0,0,0.6)", display: "flex",
                                    alignItems: "center", justifyContent: "center",
                                    opacity: 0, transition: "opacity 0.15s",
                                }} className="group-hover/av:opacity-100">
                                    <Camera size={11} color="white" />
                                </div>
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleProfilePicChange} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#e0e0e0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.full_name}</p>
                                <p style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.25)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>
                            </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{
                                fontFamily: "'Antonio', sans-serif",
                                fontSize: "0.6rem", fontWeight: 700,
                                textTransform: "uppercase", letterSpacing: "0.1em",
                                padding: "0.2rem 0.55rem", borderRadius: "999px",
                                background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)",
                                border: "1px solid rgba(255,255,255,0.08)",
                            }}>
                                {isLecturer ? t("auth.role.lecturer") : t("auth.role.student")}
                            </span>
                            <button onClick={handleLogout}
                                style={{
                                    display: "flex", alignItems: "center", gap: "0.3rem",
                                    background: "none", border: "none", cursor: "pointer",
                                    color: "rgba(255,255,255,0.2)", fontSize: "0.72rem", fontWeight: 500, padding: 0,
                                }}
                                className="hover:text-red-400">
                                <LogOut size={12} /> {t("nav.signOut")}
                            </button>
                        </div>
                    </div>
                )}
            </aside>

            {/* ── Main ── */}
            <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                {/* Header */}
                <header style={{
                    height: 64, display: "flex", alignItems: "center",
                    padding: "0 1.75rem", gap: "0.75rem",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: "rgba(10,10,10,0.95)", backdropFilter: "blur(20px)",
                    position: "sticky", top: 0, zIndex: 30,
                }}>
                    <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}
                        style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: "0.25rem", flexShrink: 0 }}>
                        <Menu size={19} />
                    </button>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.15)", fontWeight: 500 }}>OralIQ</span>
                        <ChevronRight size={11} style={{ color: "rgba(255,255,255,0.15)" }} />
                        <span style={{
                            fontFamily: "'Antonio', sans-serif",
                            fontSize: "0.9rem", fontWeight: 600, color: "rgba(255,255,255,0.6)",
                            textTransform: "uppercase", letterSpacing: "0.02em",
                        }}>{pageTitle}</span>
                    </div>
                    <LanguageToggle compact />
                    {/* Mobile avatar */}
                    <div className="md:hidden" style={{
                        width: 30, height: 30, borderRadius: "50%",
                        background: "#fff", display: "flex", alignItems: "center",
                        justifyContent: "center", overflow: "hidden", flexShrink: 0,
                    }}>
                        {avatarInner}
                    </div>
                </header>

                {/* Page content */}
                <div ref={contentRef} className="oiq-dashboard-page" style={{ flex: 1, padding: "2rem 1.75rem", overflowY: "auto" }}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
