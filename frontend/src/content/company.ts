/**
 * Company and contact details, shown in the contact section, the footer and the auth pages.
 * Change them here only. Leave `phone` or `location` empty ("") to hide that line.
 *
 * Still provisional: the final company name, email and phone are being set up.
 */
export const COMPANY = {
    /** Shown in the copyright line. */
    name: "OralIQ",
    email: "ahmedsalem250500@gmail.com",
    /** International format; the page builds the tel: link from it. */
    phone: "+20 106 540 7502",
    location: { ar: "المنصورة، مصر", en: "Mansoura, Egypt" },
};

/** "+20 106 540 7502" → "tel:+201065407502" */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
