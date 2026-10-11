/**
 * Institutions that use OralIQ, shown on the home page.
 *
 * Add real clients only. Each entry needs a name in both languages; a logo is optional
 * (put the file in /public/clients/ and reference it as "/clients/<file>").
 *
 *   { name: { ar: "جامعة المنصورة", en: "Mansoura University" }, kind: "university", logo: "/clients/mansoura.svg" },
 *
 * While this list is empty, the home page shows labelled placeholder slots on the
 * development server only, and hides the section in production, so a visitor never
 * sees invented clients.
 */
export type ClientKind = "university" | "school" | "center" | "teacher";

export interface Client {
    name: { ar: string; en: string };
    kind: ClientKind;
    logo?: string;
    /** The client's website, if they agreed to be linked. */
    href?: string;
}

export const CLIENTS: Client[] = [];
