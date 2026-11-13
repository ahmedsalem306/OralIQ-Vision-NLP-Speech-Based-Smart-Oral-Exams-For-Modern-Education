import { useEffect, useState, type RefObject } from "react";
import api from "../../lib/api";
import { useI18n } from "../../i18n";

export function EyeVisibilityMonitor({videoRef,examToken,active}:{videoRef:RefObject<HTMLVideoElement|null>;examToken:string;active:boolean}) {
    const {l}=useI18n();
    const [visible,setVisible]=useState<boolean|null>(null);
    useEffect(()=>{
        if (!active) return;
        let busy=false,cancelled=false;
        const controller=new AbortController();
        const check=async()=>{
            const video=videoRef.current;
            if (busy || !video || video.readyState<2 || !video.videoWidth) return;
            busy=true;
            try {
                // Only the upper camera region is transmitted. No full-face template is used.
                const canvas=document.createElement("canvas");
                canvas.width=640; canvas.height=Math.max(1,Math.round(640*video.videoHeight*.65/video.videoWidth));
                canvas.getContext("2d")?.drawImage(video,0,0,video.videoWidth,video.videoHeight*.65,0,0,canvas.width,canvas.height);
                const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",.65));
                if (!blob || cancelled) return;
                const form=new FormData(); form.append("image",blob,"eyes.jpg");form.append("exam_token",examToken);
                const {data}=await api.post("/accommodations/eyes",form,{signal:controller.signal,timeout:15000});
                if (!cancelled) setVisible(data.eyes_visible===true ? true:null);
            } catch {if (!cancelled) setVisible(null);} finally {busy=false;}
        };
        void check(); const timer=setInterval(()=>void check(),4000);
        return()=>{cancelled=true;clearInterval(timer);controller.abort();};
    },[active,examToken,videoRef]);
    return <aside className="mt-3 rounded-xl border border-rule bg-sheet p-3 text-sm" aria-live="polite">
        <p className="font-semibold">{l("وضع النقاب — تحقق صوتي ومراقبة ظهور العين", "Covered-face mode — voice verification and eye visibility")}</p>
        <p className="mt-1">{!active ? l("أبقي منطقة العين في الجزء العلوي من الكاميرا.","Keep your eye region in the upper part of the camera.") : visible ? l("تم رصد منطقة العين؛ هذا لا يثبت الهوية أو اتجاه النظر.","Eye regions detected; this does not verify identity or gaze direction.") : l("قراءة العين غير متاحة حاليًا؛ ليست مخالفة غش وتحتاج مراجعة المحاضر.","Eye reading is unavailable; this is not a cheating violation and needs lecturer review.")}</p>
    </aside>;
}
