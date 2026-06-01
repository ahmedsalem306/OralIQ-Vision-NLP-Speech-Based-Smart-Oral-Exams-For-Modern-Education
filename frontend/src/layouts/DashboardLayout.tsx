import { useState, useEffect, useRef } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard, Users, BarChart2, Settings, LogOut, Menu, Camera,
    ClipboardList, Award, MessageSquare, TrendingUp, X, ChevronRight
} from "lucide-react";
import { cn } from "../lib/utils";
import api from "../lib/api";
import Logo from "../components/Logo";
import { motion, AnimatePresence } from "framer-motion";

const PAGE_TITLES: Record<string, string> = {
    "/dashboard": "Overview",
    "/dashboard/questions": "Exam Questions",
    "/dashboard/results": "Results",
    "/dashboard/analytics": "Analytics",
    "/dashboard/attendance": "Attendance",
    "/dashboard/settings": "Settings",
    "/dashboard/grades": "My Grades",
    "/dashboard/messages": "Messages",
    "/dashboard/students": "Students",
};

export function DashboardLayout() {
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState<{ full_name: string; email: string; role: string } | null>(null);
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        api.get("/users/me")
            .then((res) => {
                setUser(res.data);
                const saved = localStorage.getItem(`profilePic_${res.data.email}`);
                if (saved) setProfilePic(saved);
            })
            .catch(() => navigate("/login"));
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/login");
    };

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
    const pageTitle = PAGE_TITLES[location.pathname] || "Dashboard";
    const G = "rgba(207,163,85,";

    const navGroups = [
        {
            label: "Platform",
            items: [
                { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
                ...(isLecturer
                    ? [{ icon: ClipboardList, label: "Exam Questions", href: "/dashboard/questions" }]
                    : [
                        { icon: Award, label: "My Grades", href: "/dashboard/grades" },
                        { icon: MessageSquare, label: "Messages", href: "/dashboard/messages" },
                    ]),
            ],
        },
        ...(isLecturer ? [{
            label: "Analytics",
            items: [
                { icon: BarChart2, label: "Results", href: "/dashboard/results" },
                { icon: TrendingUp, label: "Analytics", href: "/dashboard/analytics" },
                { icon: Users, label: "Attendance", href: "/dashboard/attendance" },
            ],
        }] : []),
        {
            label: "Account",
            items: [
                { icon: Settings, label: "Settings", href: "/dashboard/settings" },
            ],
        },
    ];

    const avatarInner = profilePic
        ? <img src={profilePic} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
        : <span style={{ color: "#0a0a0a", fontWeight: 800, fontSize: "0.9rem" }}>{user?.full_name?.[0]?.toUpperCase() || "U"}</span>;

    return (
        <div className="noise-overlay" style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e5e5e0", display: "flex" }}>
            {/* Mobile overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div className="fixed inset-0 z-40 md:hidden"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
                        onClick={() => setIsOpen(false)} />
                )}
            </AnimatePresence>

            {/* ── Sidebar ── */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 flex flex-col transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )} style={{ width: 220, background: "#0d0d0d", borderRight: `1px solid ${G}0.07)`, flexShrink: 0 }}>

                {/* Logo */}
                <div style={{ height: 60, display: "flex", alignItems: "center", padding: "0 1.125rem", borderBottom: `1px solid ${G}0.06)`, flexShrink: 0 }}>
                    <Logo size={26} showText showSubtitle={false} />
                    <button className="ml-auto md:hidden" onClick={() => setIsOpen(false)}
                        style={{ background: "none", border: "none", color: "#5a5a4a", cursor: "pointer", padding: "0.25rem" }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Nav groups */}
                <nav style={{ flex: 1, padding: "0.625rem 0.5rem", overflowY: "auto" }}>
                    {navGroups.map((group, gi) => (
                        <div key={gi} style={{ marginBottom: "0.375rem" }}>
                            <p style={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: `${G}0.28)`, padding: "0.625rem 0.75rem 0.3rem" }}>
                                {group.label}
                            </p>
                            {group.items.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.href;
                                return (
                                    <Link key={item.href} to={item.href} onClick={() => setIsOpen(false)}
                                        style={{
                                            display: "flex", alignItems: "center", gap: "0.6rem",
                                            padding: "0.525rem 0.75rem", borderRadius: "0.55rem", marginBottom: "0.075rem",
                                            fontSize: "0.835rem", fontWeight: isActive ? 600 : 400,
                                            textDecoration: "none", transition: "all 0.15s",
                                            background: isActive ? `${G}0.09)` : "transparent",
                                            color: isActive ? "#dbb870" : "#5a5a4a",
                                        }}
                                        className={!isActive ? "hover:text-[#9a8a5a] hover:bg-[rgba(207,163,85,0.04)]" : ""}>
                                        <Icon size={14} />
                                        <span style={{ flex: 1 }}>{item.label}</span>
                                        {isActive && (
                                            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#cfa355", flexShrink: 0 }} />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                {/* User card at bottom */}
                {user && (
                    <div style={{ margin: "0.625rem", padding: "0.875rem", background: `${G}0.03)`, border: `1px solid ${G}0.07)`, borderRadius: "0.875rem", flexShrink: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.75rem" }}>
                            <div
                                style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #cfa355, #e8c97a)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, cursor: "pointer", position: "relative" }}
                                onClick={() => fileInputRef.current?.click()}
                                className="group/av"
                            >
                                {avatarInner}
                                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.15s" }} className="group-hover/av:opacity-100">
                                    <Camera size={11} color="white" />
                                </div>
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleProfilePicChange} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#c8c8c0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.full_name}</p>
                                <p style={{ fontSize: "0.62rem", color: "#4a4a3a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>
                            </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", padding: "0.18rem 0.5rem", borderRadius: "999px", background: `${G}0.07)`, color: "#b8934a", border: `1px solid ${G}0.13)` }}>
                                {isLecturer ? "Lecturer" : "Student"}
                            </span>
                            <button onClick={handleLogout}
                                style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "none", border: "none", cursor: "pointer", color: "#3a3a2a", fontSize: "0.72rem", fontWeight: 500, padding: 0 }}
                                className="hover:text-[#c04444]">
                                <LogOut size={12} /> Sign out
                            </button>
                        </div>
                    </div>
                )}
            </aside>

            {/* ── Main ── */}
            <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                {/* Header */}
                <header style={{
                    height: 60, display: "flex", alignItems: "center",
                    padding: "0 1.75rem", gap: "0.75rem",
                    borderBottom: `1px solid ${G}0.06)`,
                    background: "rgba(10,10,10,0.92)", backdropFilter: "blur(16px)",
                    position: "sticky", top: 0, zIndex: 30,
                }}>
                    <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}
                        style={{ background: "none", border: "none", color: `${G}0.6)`, cursor: "pointer", padding: "0.25rem", flexShrink: 0 }}>
                        <Menu size={19} />
                    </button>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{ fontSize: "0.72rem", color: "#2a2a1a", fontWeight: 500 }}>OralIQ</span>
                        <ChevronRight size={11} style={{ color: "#2a2a1a" }} />
                        <span style={{ fontSize: "0.825rem", fontWeight: 600, color: "#7a7a60" }}>{pageTitle}</span>
                    </div>
                    {/* Mobile avatar only */}
                    <div className="md:hidden" style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #cfa355, #e8c97a)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                        {avatarInner}
                    </div>
                </header>

                {/* Page content */}
                <motion.div style={{ flex: 1, padding: "2rem 1.75rem", overflowY: "auto" }}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                    <Outlet />
                </motion.div>
            </main>
        </div>
    );
}
