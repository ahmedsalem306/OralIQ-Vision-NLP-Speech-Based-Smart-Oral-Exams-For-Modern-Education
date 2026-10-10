import { Languages, Moon, Sun } from "lucide-react";
import { useI18n } from "../i18n";
import { useTheme } from "../lib/theme";
import { buttonClasses } from "./ui/button";

export default function LanguageToggle({ compact = false }: { compact?: boolean }) {
    const { lang, toggleLang } = useI18n();
    const next = lang === "ar" ? "English" : "العربية";
    return (
        <button
            type="button"
            onClick={toggleLang}
            lang={lang === "ar" ? "en" : "ar"}
            aria-label={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
            className={buttonClasses("ghost", compact ? "sm" : "md")}
        >
            <Languages className="size-4" aria-hidden />
            {next}
        </button>
    );
}

export function ThemeToggle() {
    const { resolved, toggle } = useTheme();
    const { lang } = useI18n();
    const toDark = resolved === "light";
    const label = lang === "ar" ? (toDark ? "الوضع الليلي" : "الوضع النهاري") : (toDark ? "Dark mode" : "Light mode");
    return (
        <button type="button" onClick={toggle} aria-label={label} title={label} className={buttonClasses("ghost", "icon-sm")}>
            {toDark ? <Moon className="size-[18px]" aria-hidden /> : <Sun className="size-[18px]" aria-hidden />}
        </button>
    );
}
