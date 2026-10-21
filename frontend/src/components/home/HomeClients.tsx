import { useI18n } from "../../i18n";
import { CLIENTS, type Client } from "../../content/clients";

/** Placeholder count for the development preview: shows the layout without inventing names. */
const SLOTS = 6;

/**
 * "Our clients": real names and logos from content/clients.ts, in one quiet row like the
 * reference's logo bands. Renders nothing in production until the list has entries.
 */
export function HomeClients() {
    const { l } = useI18n();
    const preview = CLIENTS.length === 0;
    if (preview && !import.meta.env.DEV) return null;

    const item = (c: Client) => {
        const label = l(c.name.ar, c.name.en);
        const body = c.logo
            ? <img src={c.logo} alt={label} loading="lazy" className="max-h-9 max-w-36 object-contain opacity-70 brightness-0 invert transition-opacity hover:opacity-100" />
            : <span className="whitespace-nowrap font-display text-lg text-home-muted">{label}</span>;
        return c.href ? <a href={c.href} target="_blank" rel="noopener noreferrer">{body}</a> : body;
    };

    return (
        <section id="clients" aria-labelledby="clients-title" className="scroll-mt-20 border-y border-home-line bg-home-bg py-14 text-home-ink">
            <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:flex-row lg:items-center">
                <h2 id="clients-title" className="shrink-0 font-display text-2xl font-light">{l("عملاؤنا", "Our clients")}</h2>
                <ul className="flex flex-1 flex-wrap items-center gap-x-12 gap-y-6 lg:justify-end">
                    {preview
                        ? Array.from({ length: SLOTS }).map((_, i) => (
                            <li key={i} className="flex h-10 w-32 items-center justify-center rounded-lg border border-dashed border-home-line text-xs text-home-muted">{l("شعار العميل", "Client logo")}</li>
                        ))
                        : CLIENTS.map((c) => <li key={c.name.en} className="flex h-10 items-center">{item(c)}</li>)}
                </ul>
            </div>
            {preview && (
                <p className="mx-auto mt-6 max-w-7xl px-4 text-sm text-home-muted sm:px-6">
                    {l("معاينة على جهاز التطوير بس: ضيف العملاء في src/content/clients.ts والقسم هيظهر على الموقع.", "Development preview only: add clients to src/content/clients.ts and the section appears on the live site.")}
                </p>
            )}
        </section>
    );
}
