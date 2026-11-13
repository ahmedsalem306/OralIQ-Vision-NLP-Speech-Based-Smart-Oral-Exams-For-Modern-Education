import { useCallback, useEffect, useState } from "react";
import api from "../lib/api";
import { useI18n } from "../i18n";
import { Button } from "./ui/button";

type Request = {id:number; student_name:string; exam_key:string; status:string};
export function AccommodationInbox() {
    const {l} = useI18n();
    const [requests,setRequests] = useState<Request[]>([]);
    const [checked,setChecked] = useState<Record<number,boolean>>({});
    const [error,setError] = useState(false);
    const [busy,setBusy] = useState<number | null>(null);
    const load = useCallback(async () => {
        try {const response = await api.get("/accommodations/requests"); setRequests(response.data); setError(false);}
        catch {setError(true);}
    },[]);
    useEffect(() => {void load();const timer=setInterval(()=>void load(),30000);return()=>clearInterval(timer);},[load]);
    if (!error && !requests.length) return null;
    return <section className="my-6 rounded-2xl border border-rule bg-sheet p-5">
        <h2 className="text-lg font-bold">{l("طلبات الطالبات المنتقبات", "Covered-face verification requests")}</h2>
        <p className="mt-2 text-sm text-ink-2">{l("التحقق بالصوت دون كشف الوجه. الموافقة تخص امتحانًا واحدًا، ومراقبة العين لا تثبت الهوية ولا تضمن رصد الغش.", "Voice verification without uncovering. Approval covers one exam; eye monitoring does not establish identity or guarantee cheating detection.")}</p>
        {error && <p role="alert" className="mt-3">{l("تعذر تحميل الطلبات. أعد المحاولة.", "Could not load requests. Retry.")}</p>}
        <Button variant="ghost" className="mt-2" onClick={() => void load()}>{l("تحديث الطلبات", "Refresh requests")}</Button>
        {requests.map(request => <article key={request.id} className="mt-4 border-t border-rule pt-4">
            <p className="font-semibold">{request.student_name} — {l("منتقبة / تحقق صوتي", "Covered face / voice verification")}</p>
            <p className="mt-1 text-xs text-ink-2">{l("معرّف الامتحان", "Exam reference")}: {request.exam_key} · {request.status}</p>
            <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" checked={!!checked[request.id]} onChange={event => setChecked(previous => ({...previous,[request.id]:event.target.checked}))} />{l("تحققت بنفسي من هوية الطالبة بطريقة مناسبة وأعتمدها لهذا الامتحان.", "I independently checked this student's identity using an appropriate method and approve it for this exam.")}</label>
            <div className="mt-3 flex gap-2">{(["approved","rejected"] as const).map(decision => <Button key={decision} variant={decision === "approved" ? "primary" : "ghost"} disabled={busy !== null || (decision === "approved" && !checked[request.id])} onClick={async () => {
                setBusy(request.id);
                try {await api.post(`/accommodations/requests/${request.id}/review`,{decision,identity_checked:!!checked[request.id]}); await load();setChecked(previous=>({...previous,[request.id]:false}));}
                catch {setError(true);} finally {setBusy(null);}
            }}>{decision === "approved" ? l("اعتماد الهوية", "Approve identity") : l("رفض الطلب", "Reject request")}</Button>)}</div>
        </article>)}
    </section>;
}
