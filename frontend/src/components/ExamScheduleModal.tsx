import { useState } from "react";
import api from "../lib/api";
import { getApiErrorMessage } from "../lib/apiErrors";
import { parseServerDate } from "../lib/format";
import { useI18n } from "../i18n";
import type { Question } from "../lib/types";
import { Button } from "./ui/button";
import { Field, Input } from "./ui/input";
import { Alert, Modal } from "./ui/feedback";

function localInput(value?: string | null) {
    const date = parseServerDate(value ?? null);
    if (!date) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
}

export default function ExamScheduleModal({ token, question, onClose, onSaved }: {
    token: string;
    question: Question;
    onClose: () => void;
    onSaved: (window: { opens_at: string | null; closes_at: string | null }) => Promise<void>;
}) {
    const { l } = useI18n();
    const [opens, setOpens] = useState(() => localInput(question.opens_at));
    const [closes, setCloses] = useState(() => localInput(question.closes_at));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    async function save() {
        setError("");
        if (opens && closes && new Date(closes) <= new Date(opens)) {
            setError(l("وقت القفل لازم يكون بعد وقت الفتح.", "Closing time must be after opening time."));
            return;
        }
        setBusy(true);
        try {
            const { data } = await api.put(`/questions/exams/${token}/schedule`, {
                opens_at: opens ? new Date(opens).toISOString() : null,
                closes_at: closes ? new Date(closes).toISOString() : null,
            });
            await onSaved(data);
            onClose();
        } catch (err) {
            setError(getApiErrorMessage(err, l("تعذّر حفظ مواعيد الامتحان.", "Couldn't save the exam schedule.")));
        } finally {
            setBusy(false);
        }
    }

    return <Modal open onClose={() => { if (!busy) onClose(); }}
        title={l("صلاحية رابط الامتحان", "Exam link availability")}
        description={l("حدد موعد الفتح والقفل قبل مشاركة الرابط. الطالب اللي بدأ قبل القفل يكمّل مدته.",
            "Set the opening and closing times before sharing. Students who start before closing can finish their allotted time.")}
        footer={<Button onClick={save} disabled={busy}>{busy ? l("جاري الحفظ…", "Saving…") : l("حفظ ونسخ الرابط", "Save and copy link")}</Button>}>
        <div className="space-y-5">
            {error && <Alert tone="error">{error}</Alert>}
            <p className="text-sm text-ink-2">{l("المواعيد بتوقيت جهازك:", "Times use your device timezone:")} <strong dir="ltr">{timezone}</strong></p>
            <Field htmlFor="exam-opens" label={l("يفتح في (اختياري)", "Opens at (optional)")}>
                <Input id="exam-opens" type="datetime-local" value={opens} onChange={(e) => setOpens(e.target.value)} />
            </Field>
            <Field htmlFor="exam-closes" label={l("يقفل في (اختياري)", "Closes at (optional)")}>
                <Input id="exam-closes" type="datetime-local" value={closes} onChange={(e) => setCloses(e.target.value)} />
            </Field>
            <p className="text-sm text-ink-2">{l("لو سيبت الخانتين فاضيين، الرابط يفضل متاح بدون موعد محدد.", "Leave both fields empty to keep the link available without a schedule.")}</p>
        </div>
    </Modal>;
}
