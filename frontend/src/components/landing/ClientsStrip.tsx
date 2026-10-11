import { useI18n } from "../../i18n";
import { CLIENTS, type ClientKind } from "../../content/clients";

const KIND: Record<ClientKind, { ar: string; en: string }> = {
    university: { ar: "جامعة", en: "University" },
    school: { ar: "مدرسة", en: "School" },
    center: { ar: "مركز تدريب", en: "Training centre" },
    teacher: { ar: "مدرس", en: "Teacher" },
};

/** Placeholder slots, development only: show the layout without inventing names. */
const SLOTS: ClientKind[] = ["university", "school", "center", "university", "teacher", "school"];

/**
 * "Who uses OralIQ": real institutions from content/clients.ts.
 * Renders nothing in production until the list has entries.
 */
export function ClientsStrip() {
    const { l } = useI18n();
    const preview = CLIENTS.length === 0;
    if (preview && !import.meta.env.DEV) return null;

    return (
        <section aria-labelledby="clients-title" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 id="clients-title" className="text-center text-xl font-semibold text-ink-2">
                {l("جامعات ومدارس ومراكز بتمتحن طلابها شفوي مع OralIQ", "Universities, schools and centres running oral exams with OralIQ")}
            </h2>

            {preview && (
                <p className="mx-auto mt-3 max-w-md text-center text-sm text-warn">
                    {l("معاينة على جهاز التطوير بس: ضيف أسامي العملاء في src/content/clients.ts والقسم هيظهر على الموقع.",
                        "Development preview only: add clients to src/content/clients.ts and the section appears on the live site.")}
                </p>
            )}

            <ul className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-rule bg-rule sm:grid-cols-3 lg:grid-cols-6">
                {preview
                    ? SLOTS.map((k, i) => (
                        <li key={i} className="flex h-28 flex-col items-center justify-center gap-1 bg-sheet text-ink-3">
                            <span className="font-display text-sm font-semibold">{l("شعار العميل", "Client logo")}</span>
                            <span className="text-xs">{l(KIND[k].ar, KIND[k].en)}</span>
                        </li>
                    ))
                    : CLIENTS.map((c) => {
                        const label = l(c.name.ar, c.name.en);
                        const body = c.logo
                            ? <img src={c.logo} alt={label} loading="lazy" className="max-h-12 max-w-[70%] object-contain opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0" />
                            : <span className="px-3 text-center font-display font-semibold text-ink-2">{label}</span>;
                        return (
                            <li key={c.name.en} className="flex h-28 items-center justify-center bg-sheet">
                                {c.href ? <a href={c.href} target="_blank" rel="noopener noreferrer" className="flex size-full items-center justify-center">{body}</a> : body}
                            </li>
                        );
                    })}
            </ul>
        </section>
    );
}
