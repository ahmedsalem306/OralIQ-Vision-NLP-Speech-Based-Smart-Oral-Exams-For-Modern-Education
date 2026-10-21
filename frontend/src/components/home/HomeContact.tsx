import { useState } from "react";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { useI18n } from "../../i18n";
import { cn } from "../../lib/utils";
import { COMPANY, telHref } from "../../content/company";
import { useFieldErrors } from "../../lib/useFieldErrors";
import { BTN, H2 } from "./ui";

const FIELD = "block w-full rounded-lg border border-home-line bg-home-card px-4 py-3 text-home-ink placeholder:text-home-muted/70 focus:border-home-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-home-ink/40";

/**
 * 7. Contact. There is no form backend yet, so sending opens the visitor's email app with the
 * message filled in, addressed to the company email.
 */
export function HomeContact() {
    const { l } = useI18n();
    const [sent, setSent] = useState(false);
    const { errors, validate, clear } = useFieldErrors();

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!validate(e.currentTarget)) return;
        const f = new FormData(e.currentTarget);
        const name = String(f.get("name") || "").trim();
        const from = String(f.get("email") || "").trim();
        const message = String(f.get("message") || "").trim();
        const subject = l(`رسالة من ${name} عن OralIQ`, `A message from ${name} about OralIQ`);
        const body = `${message}\n\n— ${name}${from ? ` <${from}>` : ""}`;
        window.location.href = `mailto:${COMPANY.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        setSent(true);
    };

    const field = (id: string, label: string, input: React.ReactNode) => (
        <div>
            <label htmlFor={id} className="mb-2 block text-sm font-semibold">{label}</label>
            {input}
            {errors[id] && <p id={`${id}-error`} className="mt-1.5 text-sm text-[#FF9A9A]">{errors[id]}</p>}
        </div>
    );

    return (
        <section id="contact" className="scroll-mt-20 border-t border-home-line bg-home-bg text-home-ink">
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20 lg:py-32">
                <div>
                    <h2 className={H2}>{l("تواصل معنا", "Contact us")}</h2>
                    <p className="mt-6 max-w-md text-lg leading-[1.85] text-home-muted">
                        {l("عايز تجرّب OralIQ مع طلابك، أو تضيفه لمنصتك؟ ابعتلنا، وهنرتب معاك تجربة على امتحان حقيقي في مادتك.",
                            "Want to try OralIQ with your students, or add it to your platform? Write to us and we'll set up a trial on a real exam in your course.")}
                    </p>
                    <ul className="mt-10 space-y-5">
                        <li className="flex items-center gap-3">
                            <Mail className="size-5 shrink-0 text-home-muted" aria-hidden />
                            <a className="ltr min-w-0 truncate hover:underline" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
                        </li>
                        {COMPANY.phone && (
                            <li className="flex items-center gap-3">
                                <Phone className="size-5 shrink-0 text-home-muted" aria-hidden />
                                <a className="ltr tabular hover:underline" href={telHref(COMPANY.phone)}>{COMPANY.phone}</a>
                            </li>
                        )}
                        {COMPANY.location.ar && (
                            <li className="flex items-center gap-3">
                                <MapPin className="size-5 shrink-0 text-home-muted" aria-hidden />
                                <span>{l(COMPANY.location.ar, COMPANY.location.en)}</span>
                            </li>
                        )}
                    </ul>
                </div>

                <form onSubmit={submit} className="grid gap-5 rounded-2xl bg-home-card/60 p-6 sm:p-9" noValidate>
                    {field("c-name", l("الاسم", "Name"),
                        <input id="c-name" name="name" required autoComplete="name" aria-invalid={!!errors["c-name"] || undefined} aria-describedby={errors["c-name"] ? "c-name-error" : undefined} onChange={() => clear("c-name")} className={FIELD} />)}
                    {field("c-email", l("البريد الإلكتروني", "Email"),
                        <input id="c-email" name="email" type="email" required autoComplete="email" dir="ltr" placeholder="name@school.edu" aria-invalid={!!errors["c-email"] || undefined} aria-describedby={errors["c-email"] ? "c-email-error" : undefined} onChange={() => clear("c-email")} className={cn(FIELD, "text-start")} />)}
                    {field("c-message", l("الرسالة", "Message"),
                        <textarea id="c-message" name="message" required rows={5} placeholder={l("اكتب رسالتك هنا…", "Write your message here…")} aria-invalid={!!errors["c-message"] || undefined} aria-describedby={errors["c-message"] ? "c-message-error" : undefined} onChange={() => clear("c-message")} className={cn(FIELD, "resize-y")} />)}
                    <div className="flex flex-wrap items-center gap-4">
                        <button type="submit" className={BTN}><Send className="size-4 rtl:-scale-x-100" aria-hidden />{l("إرسال", "Send")}</button>
                        <p className="text-sm text-home-muted" aria-live="polite">
                            {sent
                                ? l("فتحنالك برنامج الإيميل والرسالة جاهزة، دوس إرسال من هناك.", "Your email app is open with the message ready; press send there.")
                                : l("هيفتح برنامج الإيميل عندك والرسالة جاهزة.", "This opens your email app with the message ready.")}
                        </p>
                    </div>
                </form>
            </div>
        </section>
    );
}
