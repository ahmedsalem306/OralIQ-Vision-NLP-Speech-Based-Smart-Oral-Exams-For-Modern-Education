import { useState, useEffect, useRef } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, BarChart2, Settings, LogOut, Menu, Camera, ChevronDown, ClipboardList, Award } from "lucide-react";
import { cn } from "../lib/utils";
import api from "../lib/api";
import Logo from "../components/Logo";

export function DashboardLayout() {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [user, setUser] = useState<{ full_name: string; email: string; role: string } | null>(null);
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        // DEMO MODE: Set mock user data instead of checking backend
        setUser({ full_name: "Professor Admin", email: "lecturer@university.edu", role: "lecturer" });
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
            // Store per-account using email as key
            localStorage.setItem(`profilePic_${user.email}`, result);
        };
        reader.readAsDataURL(file);
    };

    const isLecturer = user?.role === "lecturer" || user?.role === "hr" || user?.role === "admin";

    const sidebarItems = [
        { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
        ...(isLecturer ? [
            { icon: ClipboardList, label: "Exam Questions", href: "/dashboard/questions" },
            { icon: Users, label: "Attendance", href: "/dashboard/attendance" },
            { icon: BarChart2, label: "Results", href: "/dashboard/results" },
            { icon: BarChart2, label: "Analytics", href: "/dashboard/analytics" },
        ] : [
            // Students: Overview + My Grades only (exam comes via banner)
            { icon: Award, label: "My Grades", href: "/dashboard/grades" },
        ]),
        { icon: Settings, label: "Settings", href: "/dashboard/settings" },
    ];

    const avatar = profilePic ? (
        <img src={profilePic} alt="Profile" className="w-full h-full object-cover rounded-full" />
    ) : (
        <span style={{ color: "#0F0F1A", fontWeight: 700, fontSize: "1.1rem" }}>
            {user?.full_name ? user.full_name[0].toUpperCase() : "U"}
        </span>
    );

    const V = "rgba(108,99,255,";
    const T = "rgba(0,212,170,";

    return (
        <div style={{ minHeight: "100vh", background: "#0F0F1A", color: "#E8E8F0", display: "flex" }}>
            {/* Mobile overlay */}
            {isOpen && <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setIsOpen(false)} />}

            {/* Sidebar */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )} style={{ background: "#1A1A2E", borderRight: `1px solid ${V}0.2)` }}>

                {/* Logo */}
                <div style={{ height: 72, display: "flex", alignItems: "center", padding: "0 1.25rem", borderBottom: `1px solid ${V}0.15)` }}>
                    <Logo size={34} showText={true} showSubtitle={false} />
                </div>

                {/* Role badge */}
                {user && (
                    <div style={{ padding: "0.75rem 1.25rem", borderBottom: `1px solid ${V}0.1)` }}>
                        <span style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.12em",
                            padding: "0.25rem 0.75rem",
                            borderRadius: "999px",
                            background: isLecturer ? `${T}0.15)` : `${V}0.15)`,
                            color: isLecturer ? "#00D4AA" : "#6C63FF",
                            border: `1px solid ${isLecturer ? T : V}0.3)`,
                        }}>
                            {isLecturer ? "Lecturer" : "Student"}
                        </span>
                    </div>
                )}

                {/* Nav */}
                <nav style={{ padding: "1rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    {sidebarItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.label}
                                to={item.href}
                                onClick={() => setIsOpen(false)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.75rem",
                                    padding: "0.7rem 1rem",
                                    borderRadius: "0.75rem",
                                    fontSize: "0.9rem",
                                    fontWeight: isActive ? 700 : 500,
                                    textDecoration: "none",
                                    transition: "all 0.15s",
                                    background: isActive ? "linear-gradient(135deg, rgba(108,99,255,0.2), rgba(0,212,170,0.1))" : "transparent",
                                    color: isActive ? "#6C63FF" : "#8888A8",
                                    border: isActive ? `1px solid ${V}0.3)` : "1px solid transparent",
                                }}
                            >
                                <Icon size={18} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom */}
                <div style={{ position: "absolute", bottom: "1.5rem", left: "1rem", right: "1rem", textAlign: "center" }}>
                    <p style={{ fontSize: "0.7rem", color: "#444466" }}>© 2026 OralIQ</p>
                </div>
            </aside>

            {/* Main */}
            <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "#0F0F1A" }}>
                {/* Header */}
                <header style={{
                    height: 72,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 2rem",
                    borderBottom: `1px solid ${V}0.15)`,
                    background: "rgba(26,26,46,0.6)",
                    backdropFilter: "blur(12px)",
                    position: "sticky",
                    top: 0,
                    zIndex: 30,
                }}>
                    {/* Mobile menu */}
                    <button
                        className="md:hidden"
                        onClick={() => setIsOpen(!isOpen)}
                        style={{ background: "none", border: "none", color: "#6C63FF", cursor: "pointer" }}
                    >
                        <Menu size={22} />
                    </button>

                    <div style={{ marginLeft: "auto", position: "relative" }}>
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                            style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "none", border: "none", cursor: "pointer" }}
                        >
                            <div className="hidden md:block" style={{ textAlign: "right" }}>
                                <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "#E8E8F0" }}>{user?.full_name || "User"}</p>
                                <p style={{ fontSize: "0.75rem", color: "#8888A8" }}>{user?.email}</p>
                            </div>
                            <div style={{
                                width: 42, height: 42, borderRadius: "50%",
                                background: "linear-gradient(135deg, #6C63FF, #00D4AA)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                overflow: "hidden", boxShadow: "0 0 15px rgba(108,99,255,0.4)",
                                border: "2px solid rgba(108,99,255,0.3)",
                            }}>
                                {avatar}
                            </div>
                            <ChevronDown size={16} style={{ color: "#8888A8" }} />
                        </button>

                        {/* Dropdown */}
                        {dropdownOpen && (
                            <div style={{
                                position: "absolute", right: 0, top: "calc(100% + 0.75rem)",
                                width: 260, background: "#1A1A2E",
                                border: `1px solid ${V}0.2)`,
                                borderRadius: "1rem", boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                                overflow: "hidden", zIndex: 50,
                            }}>
                                {/* Profile header */}
                                <div style={{ padding: "1rem", borderBottom: `1px solid ${V}0.1)`, display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                    <div style={{ position: "relative" }} className="group/av">
                                        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #6C63FF, #00D4AA)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                                            {avatar}
                                        </div>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            style={{
                                                position: "absolute", inset: 0, borderRadius: "50%",
                                                background: "rgba(0,0,0,0.6)", display: "flex",
                                                alignItems: "center", justifyContent: "center",
                                                border: "none", cursor: "pointer", opacity: 0,
                                                transition: "opacity 0.2s",
                                            }}
                                            className="group-hover/av:opacity-100"
                                        >
                                            <Camera size={14} color="white" />
                                        </button>
                                        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleProfilePicChange} />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "#E8E8F0" }}>{user?.full_name}</p>
                                        <p style={{ fontSize: "0.75rem", color: "#8888A8" }}>{user?.email}</p>
                                        <button onClick={() => fileInputRef.current?.click()} style={{ fontSize: "0.7rem", color: "#6C63FF", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 2 }}>
                                            Change photo
                                        </button>
                                    </div>
                                </div>

                                <Link to="/dashboard/settings" style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", color: "#8888A8", textDecoration: "none", fontSize: "0.875rem", transition: "all 0.15s" }}
                                    className="hover:bg-[rgba(108,99,255,0.08)] hover:text-white">
                                    <Settings size={16} /> Settings
                                </Link>
                                <button onClick={handleLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", color: "#FF4D6D", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", transition: "all 0.15s" }}
                                    className="hover:bg-[rgba(255,77,109,0.08)]">
                                    <LogOut size={16} /> Log Out
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                <div style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
