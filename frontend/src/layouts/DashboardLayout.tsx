import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard, Users, BarChart3, Settings, LogOut, Menu, X,
    ClipboardList, Award, Inbox, TrendingUp, CalendarCheck,
} from "lucide-react";
import { cn } from "../lib/utils";
import api from "../lib/api";
import Logo from "../components/Logo";
import LanguageToggle, { ThemeToggle } from "../components/LanguageToggle";
import { Avatar } from "../components/ui/avatar";
import { buttonClasses } from "../components/ui/button";
import { useI18n } from "../i18n";
import { MotionConfig, motion } from "motion/react";
import { usePageTitle } from "../lib/usePageTitle";

type Me = { full_name: string; email: string; role: string };

export function DashboardLayout() {
    const { t, l } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState<Me | null>(null);
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        api.get("/users/me")
            .then((res) => {
                setUser(res.data);
                try {
                    const saved = localStorage.getItem(`profilePic_${res.data.email}`);
                    if (saved) setProfilePic(saved);
                } catch { /* no saved picture */ }
            })
            .catch((err) => {
                const status = err?.response?.status;
                if (status === 401 || status === 403) {
                    localStorage.removeItem("token");
                    navigate("/login", { replace: true });
                }
            });
    }, [navigate]);

    // Close the mobile drawer on Esc (links close it on click)
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen]);

    const handleLogout = () => { localStorage.removeItem("token"); navigate("/login"); };

    const isLecturer = user ? ["lecturer", "hr", "admin"].includes(user.role) : false;

    const navItems = isLecturer
        ? [
            { icon: LayoutDashboard, label: t("nav.overview"), href: "/dashboard" },
            { icon: ClipboardList, label: t("nav.questions"), href: "/dashboard/questions" },
            { icon: BarChart3, label: t("nav.results"), href: "/dashboard/results" },
            { icon: TrendingUp, label: t("nav.analytics"), href: "/dashboard/analytics" },
            { icon: CalendarCheck, label: t("nav.attendance"), href: "/dashboard/attendance" },
            { icon: Users, label: t("nav.students"), href: "/dashboard/students" },
        ]
        : [
            { icon: LayoutDashboard, label: t("nav.overview"), href: "/dashboard" },
            { icon: Inbox, label: l("دعوات الامتحانات", "Exam invites"), href: "/dashboard/messages" },
            { icon: Award, label: t("nav.grades"), href: "/dashboard/grades" },
        ];

    const currentTitle =
        location.pathname === "/dashboard/settings"
            ? t("nav.settings")
            : navItems.find((n) => n.href === location.pathname)?.label;
    usePageTitle(user ? currentTitle : null);

    return (
        <div className="min-h-dvh bg-paper text-ink md:flex">
            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-pen focus:px-4 focus:py-2 focus:text-pen-ink"
            >
                {l("تخطَّ إلى المحتوى", "Skip to content")}
            </a>

            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-overlay animate-[oiq-fade-in_150ms_ease-out] md:hidden"
                    onClick={() => setIsOpen(false)}
                    aria-hidden
                />
            )}

            {/* ── Sidebar ── */}
            <aside
                id="sidebar"
                className={cn(
                    "fixed inset-y-0 start-0 z-50 flex w-[17rem] shrink-0 flex-col bg-navy text-navy-ink",
                    "transition-transform duration-200 ease-out md:sticky md:top-0 md:h-dvh",
                    !isOpen && "max-md:ltr:-translate-x-full max-md:rtl:translate-x-full",
                )}
                aria-label={l("القائمة الرئيسية", "Main menu")}
            >
                <div className="flex h-[4.5rem] shrink-0 items-center justify-between px-5">
                    <Link to="/dashboard" aria-label="OralIQ"><Logo size={32} light /></Link>
                    <button
                        type="button"
                        className={cn(buttonClasses("ghost", "icon-sm", "text-navy-muted hover:bg-white/10 hover:text-white"), "md:hidden")}
                        onClick={() => setIsOpen(false)}
                        aria-label={l("إغلاق القائمة", "Close menu")}
                    >
                        <X className="size-5" aria-hidden />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-2">
                    <ul role="list" className="space-y-0.5">
                        {(user ? navItems : []).map((item) => (
                            <li key={item.href}>
                                <NavItem {...item} active={location.pathname === item.href} onNavigate={() => setIsOpen(false)} />
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="shrink-0 space-y-1 border-t border-white/10 px-3 py-3">
                    <NavItem icon={Settings} label={t("nav.settings")} href="/dashboard/settings" active={location.pathname === "/dashboard/settings"} onNavigate={() => setIsOpen(false)} />
                    <div className="flex items-center gap-1 px-1 pt-1">
                        <LanguageToggle compact className="text-navy-muted hover:bg-white/10 hover:text-white" />
                        <ThemeToggle className="text-navy-muted hover:bg-white/10 hover:text-white" />
                    </div>
                </div>

                {user && (
                    <div className="m-3 mt-0 flex shrink-0 items-center gap-3 rounded-2xl bg-white/[0.06] px-3 py-3">
                        <Avatar name={user.full_name} src={profilePic} />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{user.full_name}</p>
                            <p className="truncate text-xs text-navy-muted">
                                {isLecturer ? t("auth.role.lecturer") : t("auth.role.student")}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleLogout}
                            className={buttonClasses("ghost", "icon-sm", "text-navy-muted hover:bg-white/10 hover:text-[#FF9AA4]")}
                            aria-label={t("nav.signOut")}
                            title={t("nav.signOut")}
                        >
                            <LogOut className="size-[18px] rtl:-scale-x-100" aria-hidden />
                        </button>
                    </div>
                )}
            </aside>

            {/* ── Main ── */}
            <div className="flex min-w-0 flex-1 flex-col">
                {/* Mobile top bar */}
                <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-rule bg-paper/90 px-4 backdrop-blur md:hidden">
                    <button
                        type="button"
                        className={buttonClasses("ghost", "icon-sm")}
                        onClick={() => setIsOpen(true)}
                        aria-label={l("فتح القائمة", "Open menu")}
                        aria-expanded={isOpen}
                        aria-controls="sidebar"
                    >
                        <Menu className="size-5" aria-hidden />
                    </button>
                    <Logo size={26} />
                    <Avatar name={user?.full_name} src={profilePic} size="sm" />
                </header>

                <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8 sm:py-10">
                    <MotionConfig reducedMotion="user">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <Outlet />
                        </motion.div>
                    </MotionConfig>
                </main>
            </div>
        </div>
    );
}

interface NavItemProps {
    icon: typeof Users;
    label: string;
    href: string;
    active: boolean;
    onNavigate: () => void;
}

function NavItem({ icon: Icon, label, href, active, onNavigate }: NavItemProps) {
    return (
        <Link
            to={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
                "relative flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-[0.9375rem] transition-colors",
                active
                    ? "bg-white/[0.12] font-semibold text-white before:absolute before:inset-y-2.5 before:start-0 before:w-[3px] before:rounded-full before:bg-[#8EA6FF]"
                    : "text-navy-muted hover:bg-white/[0.06] hover:text-white",
            )}
        >
            <Icon className="size-[18px] shrink-0" aria-hidden />
            <span className="truncate">{label}</span>
        </Link>
    );
}
