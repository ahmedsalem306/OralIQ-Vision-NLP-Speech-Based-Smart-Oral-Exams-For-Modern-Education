import { useRef, useState } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import { useI18n } from "../../i18n";
import { COMPANY, telHref } from "../../content/company";
import { gsap, useGSAP, withMotion } from "../../lib/gsap";

const field = "mt-1.5 w-full border border-ink/70 bg-sheet px-3.5 py-2.5 text-ink placeholder:text-ink-3 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15";

/**
 * 6. Contact. The form has no server behind it yet, so sending opens the visitor's
 * email app with the message filled in, addressed to the company email.
 */
export function ContactSection() {
    const { l } = useI18n();
    const root = useRef<HTMLElement>(null);
    const [sent, setSent] = useState(false);

    useGSAP(() => {
        withMotion(() => {
            gsap.from("[data-contact-col]", { y: 40, opacity: 0, duration: 0.9, stagger: 0.15, ease: "power3.out", scrollTrigger: { trigger: root.current, start: "top 75%" } });
        });
    }, { scope: root });

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
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
        <section ref={root} id="contact" className="scroll-mt-16 bg-sheet">
            <div className="mx-auto grid max-w-7xl gap-14 px-4 py-24 sm:px-6 sm:py-28 lg:grid-cols-2 lg:gap-20">
                <div data-contact-col>
                    <h2 className="text-[clamp(2.25rem,4.4vw,3.5rem)] font-black">{l("تواصل معنا", "Contact us")}</h2>
                    <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-2">
                        {l("عايز تجرّب OralIQ في مؤسستك، أو تضيفه لمنصتك؟ ابعتلنا وهنرد عليك ونرتب معاك تجربة على امتحان حقيقي.",
                            "Want to try OralIQ at your institution, or add it to your platform? Write to us and we'll arrange a trial on a real exam.")}
                    </p>
                    <ul className="mt-10 space-y-5">
                        <li className="flex items-center gap-4">
                            <Mail className="size-5 shrink-0" aria-hidden />
                            <a className="ltr font-semibold hover:underline" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
                        </li>
                        {COMPANY.phone && (
                            <li className="flex items-center gap-4">
                                <Phone className="size-5 shrink-0" aria-hidden />
                                <a className="ltr font-semibold tabular hover:underline" href={telHref(COMPANY.phone)}>{COMPANY.phone}</a>
                            </li>
                        )}
                        {COMPANY.location.ar && (
                            <li className="flex items-center gap-4">
                                <MapPin className="size-5 shrink-0" aria-hidden />
                                <span className="font-semibold">{l(COMPANY.location.ar, COMPANY.location.en)}</span>
                            </li>
                        )}
                    </ul>
                </div>

                <form data-contact-col onSubmit={submit} className="space-y-5">
                    <label className="block text-sm font-semibold">
                        {l("الاسم", "Name")}
                        <input name="name" required autoComplete="name" className={field} />
                    </label>
                    <label className="block text-sm font-semibold">
                        {l("البريد الإلكتروني", "Email")}
                        <input name="email" type="email" required autoComplete="email" dir="ltr" className={`${field} ltr`} />
                    </label>
                    <label className="block text-sm font-semibold">
                        {l("الرسالة", "Message")}
                        <textarea name="message" required rows={5} placeholder={l("اكتب رسالتك هنا…", "Write your message here…")} className={`${field} resize-y`} />
                    </label>
                    <div className="flex flex-wrap items-center gap-4">
                        <button type="submit" className="inline-flex h-12 items-center bg-pen px-8 font-semibold text-pen-ink transition-colors hover:bg-pen-hover">
                            {l("إرسال", "Send")}
                        </button>
                        <p className="text-sm text-ink-3" aria-live="polite">
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
