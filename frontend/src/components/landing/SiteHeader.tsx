import { Link } from "react-router-dom";
import { useI18n } from "../../i18n";
import Logo from "../Logo";
import LanguageToggle, { ThemeToggle } from "../LanguageToggle";

const onBlack = "text-white/75 hover:bg-white/10 hover:text-white";

/** Black bar that sits on top of the black hero and stays with the reader. */
export function SiteHeader({ loggedIn }: { loggedIn: boolean }) {
    const { l } = useI18n();
    const links = [
        { href: "#about", label: l("من نحن", "About") },
        { href: "#offer", label: l("خدماتنا", "Services") },
        { href: "#video", label: l("الفيديو", "Video") },
        { href: "#integrate", label: l("لمنصتك", "For your platform") },
        { href: "#contact", label: l("تواصل معنا", "Contact") },
    ];
    return (
        <header className="sticky top-0 z-40 border-b border-white/10 bg-black text-white">
            <nav className="mx-auto flex h-[4.25rem] max-w-7xl items-center gap-4 px-4 sm:gap-8 sm:px-6" aria-label={l("الرئيسية", "Main")}>
                <Link to="/" aria-label="OralIQ"><Logo size={30} light /></Link>
                <ul className="hidden items-center gap-7 text-[0.9375rem] lg:flex">
                    {links.map((x) => (
                        <li key={x.href}>
                            <a href={x.href} className="text-white/70 transition-colors hover:text-white">{x.label}</a>
                        </li>
                    ))}
                </ul>
                <div className="ms-auto flex items-center gap-1">
                    <LanguageToggle compact className={onBlack} />
                    <ThemeToggle className={onBlack} />
                    {loggedIn ? (
                        <Link to="/dashboard" className="ms-2 inline-flex h-10 items-center whitespace-nowrap bg-white px-5 text-sm font-semibold text-black transition-colors hover:bg-white/85">
                            {l("لوحة التحكم", "Dashboard")}
                        </Link>
                    ) : (
                        <>
                            <Link to="/login" viewTransition className="hidden h-10 items-center px-3 text-sm font-semibold text-white/80 hover:text-white sm:inline-flex">
                                {l("تسجيل الدخول", "Sign in")}
                            </Link>
                            <Link to="/register" viewTransition className="ms-1 inline-flex h-10 items-center whitespace-nowrap bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-white/85 sm:px-5">
                                {l("أنشئ حساب", "Create account")}
                            </Link>
                        </>
                    )}
                </div>
            </nav>
        </header>
    );
}
