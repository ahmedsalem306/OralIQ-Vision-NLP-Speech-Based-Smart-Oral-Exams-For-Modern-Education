/** Turn axios/FastAPI errors into readable Arabic messages. */
export function getApiErrorMessage(err: unknown, fallback = "حدث خطأ غير متوقع"): string {
    const e = err as { response?: { status?: number; data?: { detail?: unknown }; statusText?: string }; message?: string };
    const detail = e?.response?.data?.detail;

    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
        const first = detail[0] as { msg?: string };
        if (first?.msg) return first.msg;
    }

    const status = e?.response?.status;
    if (status === 404) {
        return "السيرفر لم يجد الطلب — حدّث الصفحة أو انتظر دقيقة ثم أعد المحاولة";
    }
    if (status === 401 || status === 403) {
        return "انتهت الجلسة — سجّل الدخول مرة أخرى من نفس الحساب";
    }
    if (status === 422) {
        return "بيانات Face ID غير صالحة — أعد مسح الوجه";
    }
    if (status && status >= 500) {
        return "خطأ في السيرفر — حاول بعد دقيقة";
    }

    return e?.message || fallback;
}
