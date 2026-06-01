import { Languages } from "lucide-react";
import { useI18n } from "../i18n";

export default function LanguageToggle({ compact = false }: { compact?: boolean }) {
    const { t, toggleLang } = useI18n();

    return (
        <button
            type="button"
            onClick={toggleLang}
            aria-label="Switch language"
            style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: compact ? "0.3rem" : "0.45rem",
                minHeight: 36,
                padding: compact ? "0.45rem 0.6rem" : "0.5rem 0.85rem",
                borderRadius: "999px",
                border: "1px solid rgba(207,163,85,0.2)",
                background: "rgba(207,163,85,0.06)",
                color: "#cfa355",
                fontSize: compact ? "0.7rem" : "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                whiteSpace: "nowrap",
            }}
        >
            <Languages size={compact ? 13 : 15} />
            {t("language.toggle")}
        </button>
    );
}
