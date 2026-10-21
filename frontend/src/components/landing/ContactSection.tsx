import { useState } from "react";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { useI18n } from "../../i18n";
import { COMPANY, telHref } from "../../content/company";
import { Field, Input, Textarea } from "../ui/input";
import { useFieldErrors } from "../../lib/useFieldErrors";

/**
 * 6. Contact. There is no form backend yet, so sending opens the visitor's
 * email app with the message filled in, addressed to the company email.
 */
export function ContactSection() {
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

    return (
        <section id="contact" className="scroll-mt-20">
            <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
                <div className="grid overflow-hidden rounded-[32px] border border-rule bg-sheet shadow-card lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <div className="bg-pen-wash p-8 sm:p-12">
                        <h2 className="text-[clamp(2rem,4vw,3rem)] font-bold leading-tight tracking-tight">{l("تواصل معنا", "Contact us")}</h2>
                        <p className="mt-4 max-w-sm text-lg leading-relaxed text-ink-2">
                            {l("عايز تجرّب OralIQ مع طلابك، أو تضيفه لمنصتك؟ ابعتلنا، وهنرتب معاك تجربة على امتحان حقيقي في مادتك.",
                                "Want to try OralIQ with your students, or add it to your platform? Write to us and we'll set up a trial on a real exam in your course.")}
                        </p>
                        <ul className="mt-10 space-y-5">
                            <li className="flex items-center gap-3">
                                <Mail className="size-5 shrink-0 text-pen" aria-hidden />
                                <a className="ltr min-w-0 truncate font-semibold hover:text-pen" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
                            </li>
                            {COMPANY.phone && (
                                <li className="flex items-center gap-3">
                                    <Phone className="size-5 shrink-0 text-pen" aria-hidden />
                                    <a className="ltr font-semibold tabular hover:text-pen" href={telHref(COMPANY.phone)}>{COMPANY.phone}</a>
                                </li>
                            )}
                            {COMPANY.location.ar && (
                                <li className="flex items-center gap-3">
                                    <MapPin className="size-5 shrink-0 text-pen" aria-hidden />
                                    <span className="font-semibold">{l(COMPANY.location.ar, COMPANY.location.en)}</span>
                                </li>
                            )}
                        </ul>
                    </div>

                    <form onSubmit={submit} className="grid gap-5 p-8 sm:p-12" noValidate>
                        <Field label={l("الاسم", "Name")} htmlFor="c-name" error={errors["c-name"]}>
                            <Input id="c-name" name="name" required autoComplete="name" onChange={() => clear("c-name")} />
                        </Field>
                        <Field label={l("البريد الإلكتروني", "Email")} htmlFor="c-email" error={errors["c-email"]}>
                            <Input id="c-email" name="email" type="email" required autoComplete="email" dir="ltr" placeholder="name@school.edu" onChange={() => clear("c-email")} />
                        </Field>
                        <Field label={l("الرسالة", "Message")} htmlFor="c-message" error={errors["c-message"]}>
                            <Textarea id="c-message" name="message" required rows={5} placeholder={l("اكتب رسالتك هنا…", "Write your message here…")} onChange={() => clear("c-message")} />
                        </Field>
                        <div className="flex flex-wrap items-center gap-4">
                            <button type="submit" className="inline-flex h-12 items-center gap-2 rounded-full bg-pen px-8 font-semibold text-pen-ink transition-colors hover:bg-pen-hover">
                                <Send className="size-4 rtl:-scale-x-100" aria-hidden />{l("إرسال", "Send")}
                            </button>
                            <p className="text-sm text-ink-3" aria-live="polite">
                                {sent
                                    ? l("فتحنالك برنامج الإيميل والرسالة جاهزة، دوس إرسال من هناك.", "Your email app is open with the message ready; press send there.")
                                    : l("هيفتح برنامج الإيميل عندك والرسالة جاهزة.", "This opens your email app with the message ready.")}
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </section>
    );
}
