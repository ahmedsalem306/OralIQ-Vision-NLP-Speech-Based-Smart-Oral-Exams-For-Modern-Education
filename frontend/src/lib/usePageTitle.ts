import { useEffect } from "react";

/** Sets the browser tab title as "<page> — OralIQ" while the page is mounted. */
export function usePageTitle(title: string | null | undefined) {
    useEffect(() => {
        if (!title) return;
        const prev = document.title;
        document.title = `${title} — OralIQ`;
        return () => { document.title = prev; };
    }, [title]);
}
