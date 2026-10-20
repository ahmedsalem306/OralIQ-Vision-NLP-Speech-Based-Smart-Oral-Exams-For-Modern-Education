import { useI18n } from "../../i18n";
import { CLIENTS, type Client } from "../../content/clients";

/** Placeholder count for the development preview: shows the layout without inventing names. */
const SLOTS = 8;

/**
 * "Our clients": real names and logos from content/clients.ts, moving in one band.
 * Renders nothing in production until the list has entries.
 */
export function ClientsStrip() {
    const { l } = useI18n();
    const preview = CLIENTS.length === 0;
    if (preview && !import.meta.env.DEV) return null;

    const item = (c: Client) => {
        const label = l(c.name.ar, c.name.en);
        const body = c.logo
            ? <img src={c.logo} alt={label} loading="lazy" className="max-h-11 max-w-40 object-contain opacity-75 grayscale transition hover:opacity-100 hover:grayscale-0" />
            : <span className="whitespace-nowrap font-display text-lg font-semibold text-ink-2">{label}</span>;
        return c.href ? <a href={c.href} target="_blank" rel="noopener noreferrer">{body}</a> : body;
    };

    // The band repeats once so the loop has no visible jump; the copy is hidden from screen readers.
    const row = (hidden: boolean) => (
        <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-14 pe-14">
            {preview
                ? Array.from({ length: SLOTS }).map((_, i) => (
                    <li key={i} className="flex h-16 w-40 items-center justify-center rounded-xl border border-dashed border-rule-strong text-sm font-semibold text-ink-3">
                        {l("شعار العميل", "Client logo")}
                    </li>
                ))
                : CLIENTS.map((c) => <li key={c.name.en} className="flex h-16 items-center">{item(c)}</li>)}
        </ul>
    );

    return (
        <section aria-labelledby="clients-title" className="py-20">
            <h2 id="clients-title" className="text-center text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-tight">{l("عملاؤنا", "Our clients")}</h2>

            {preview && (
                <p className="mx-auto mt-3 max-w-md px-4 text-center text-sm text-warn">
                    {l("معاينة على جهاز التطوير بس: ضيف العملاء في src/content/clients.ts والقسم هيظهر على الموقع.",
                        "Development preview only: add clients to src/content/clients.ts and the section appears on the live site.")}
                </p>
            )}

            <div className="group relative mt-10 flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
                <div className="flex w-max motion-safe:animate-[oiq-marquee_40s_linear_infinite] group-hover:[animation-play-state:paused]">
                    {row(false)}
                    {row(true)}
                </div>
            </div>
        </section>
    );
}
