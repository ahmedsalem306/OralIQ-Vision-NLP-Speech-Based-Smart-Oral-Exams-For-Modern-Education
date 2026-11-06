import { useEffect, useState } from "react";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/apiErrors";
import { useI18n } from "../i18n";
import { Button } from "./ui/button";
import { Alert } from "./ui/feedback";
import { Panel } from "./ui/panel";

interface Invitation { id: number; owner_name: string | null; owner_email: string; }

export default function TeamInvitations() {
    const { l } = useI18n();
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [busy, setBusy] = useState<number | null>(null);
    const [error, setError] = useState("");
    useEffect(() => {
        let cancelled = false;
        api.get<Invitation[]>("/billing/team/invitations").then(({ data }) => {
            if (!cancelled) setInvitations(data);
        }).catch(() => { /* Older backends have no invitations endpoint. */ });
        return () => { cancelled = true; };
    }, []);
    async function decide(id: number, accept: boolean) {
        setBusy(id);
        setError("");
        try {
            await api.post(`/billing/team/invitations/${id}/decision`, { accept });
            if (accept) window.location.reload();
            else setInvitations((items) => items.filter((item) => item.id !== id));
        } catch (err) {
            setError(getApiErrorMessage(err, l("تعذّر الرد على الدعوة.", "Couldn't respond to the invitation.")));
        } finally { setBusy(null); }
    }
    if (!invitations.length) return null;
    return <Panel className="p-6">
        <h2 className="text-xl font-bold">{l("دعوات الانضمام لفريق", "Team invitations")}</h2>
        <p className="mt-3 text-sm text-ink-2">{l("القبول يربط حسابك باشتراك صاحب الفريق وتتحسب امتحاناتك ضمن حصته. لا يتم الانضمام بدون موافقتك.", "Accepting links your account to the team owner's subscription and exam quota. Joining requires your consent.")}</p>
        {error && <Alert tone="error" className="mt-4">{error}</Alert>}
        <ul className="mt-5 space-y-4">{invitations.map((invitation) => <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-4">
            <span>{invitation.owner_name || invitation.owner_email} <span dir="ltr" className="text-sm text-ink-2">{invitation.owner_email}</span></span>
            <div className="flex gap-2">
                <Button disabled={busy !== null} onClick={() => decide(invitation.id, true)}>{l("قبول", "Accept")}</Button>
                <Button variant="secondary" disabled={busy !== null} onClick={() => decide(invitation.id, false)}>{l("رفض", "Decline")}</Button>
            </div>
        </li>)}</ul>
    </Panel>;
}
