#!/usr/bin/env python3
"""Small host-side checks. Email is disabled until the owner authorizes delivery.

Requires host Python stdlib, Docker CLI and systemd. No student data or raw logs
enter notifications. Whole-host downtime still needs a monitor on another host.
"""
import argparse
from datetime import datetime, timezone
from email.message import EmailMessage
import hashlib
import json
import os
from pathlib import Path
import shutil
import smtplib
import ssl
import subprocess
import time
import urllib.request

STATE_DIR = Path("/var/lib/oraliq-monitor")
BACKUP_DIR = Path("/var/backups/oraliq/encrypted")
ISSUES = {
    "monitor_check_failed": "تعذّر إكمال فحص المراقبة؛ راجع الخدمة على السيرفر.",
    "api_unavailable": "واجهة API لا تستجيب للفحص المحلي.",
    "website_unavailable": "الموقع العام لا يستجيب لفحص HTTPS.",
    "containers_unhealthy": "إحدى خدمات التطبيق أو قاعدة البيانات متوقفة أو غير سليمة.",
    "database_unavailable": "تعذّر تنفيذ فحص قراءة من قاعدة البيانات.",
    "grading_delayed": "توجد إجابات تنتظر التصحيح منذ أكثر من 30 دقيقة.",
    "grading_stalled": "توجد مهمة تصحيح لم تحدّث إشارة عملها منذ أكثر من 5 دقائق.",
    "email_delayed": "توجد رسائل تفعيل مستحقة تنتظر منذ أكثر من 15 دقيقة.",
    "backup_failed": "آخر تشغيل لخدمة النسخ الخارجي فشل.",
    "backup_stale": "لا توجد نسخة خارجية مكتملة مسجلة خلال آخر 30 ساعة.",
    "disk_low": "استخدام القرص تجاوز 85% أو المساحة المتاحة أقل من 5 جيجا.",
}
TEST_SUBJECT = "OralIQ — اختبار تنبيهات التشغيل"
TEST_TEXT = ("دي رسالة اختبار لتنبيهات تشغيل OralIQ. التنبيهات هتبلغك بأعطال الخدمات، "
             "تأخر التصحيح والبريد، نقص مساحة القرص، أو فشل وتأخر النسخ الخارجي. "
             "الرسالة لا تحتوي على بيانات طلاب. توقف السيرفر بالكامل يحتاج مراقبة من خارج السيرفر.")


def capture(command, timeout=15):
    return subprocess.run(command, stdin=subprocess.DEVNULL, capture_output=True,
                          text=True, check=True, timeout=timeout).stdout.strip()


def atomic_json(path, data):
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False) + "\n")
    temporary.chmod(0o600)
    os.replace(temporary, path)


def load_json(path):
    if not path.exists():
        return {}
    return json.loads(path.read_text())


def record_backup_success():
    # ExecStartPost runs only after the upload command exits successfully. A local commit
    # file alone cannot prove that its last upload/readback finished successfully.
    candidates = sorted(BACKUP_DIR.glob("oraliq_oraliq_*.dump.gz.gpg.complete.json"))
    receipt = load_json(candidates[-1]) if candidates else {}
    if receipt.get("format") != "oraliq-offsite-commit/1" or len(receipt.get("files", [])) != 5:
        raise ValueError("missing_verified_backup_receipt")
    stamp = datetime.fromisoformat(receipt["backup_created_at"].replace("Z", "+00:00"))
    if stamp.tzinfo is None:
        stamp = stamp.replace(tzinfo=timezone.utc)
    atomic_json(STATE_DIR / "backup-success.json", {"created_at": stamp.timestamp(), "recorded_at": time.time()})


def collect():
    issues = []
    for url, code, key, expected in (("http://127.0.0.1:18001/health", "api_unavailable", "status", "ok"),
                      ("https://oralliq.com/service-status.json", "website_unavailable", "accounts_available", True)):
        try:
            with urllib.request.urlopen(url, timeout=8) as response:
                if response.status != 200 or json.loads(response.read(65536)).get(key) != expected:
                    issues.append(code)
        except Exception:
            issues.append(code)
    try:
        containers = json.loads(capture(["docker", "inspect", "oraliq-api-1", "oraliq-worker-1",
                                        "oraliq-mailer-1", "oraliq-db-1"]))
        if len(containers) != 4 or any(not item["State"]["Running"] or
                item["State"].get("Health", {}).get("Status", "healthy") != "healthy" for item in containers):
            issues.append("containers_unhealthy")
    except Exception:
        issues.append("containers_unhealthy")
    # Fixed, read-only aggregate queries: no addresses, answers, tokens or audio are read.
    query = """SET statement_timeout='5s';
SELECT json_build_object(
 'queued_old', (SELECT count(*) FROM grading_jobs WHERE status='queued' AND enqueued_at < timezone('UTC', now()) - interval '30 minutes'),
 'processing_stale', (SELECT count(*) FROM grading_jobs WHERE status='processing' AND COALESCE(heartbeat_at, locked_at, enqueued_at) < timezone('UTC', now()) - interval '5 minutes'),
 'mail_old', (SELECT count(*) FROM email_outbox WHERE status IN ('queued','sending') AND expires_at > timezone('UTC', now()) AND next_attempt_at < timezone('UTC', now()) - interval '15 minutes')
);"""
    try:
        output = capture(["docker", "exec", "oraliq-db-1", "psql", "-U", "oraliq", "-d", "oraliq",
                          "-X", "-At", "-v", "ON_ERROR_STOP=1", "-c", query])
        counts = json.loads(output.splitlines()[-1])
        for field, code in (("queued_old", "grading_delayed"), ("processing_stale", "grading_stalled"),
                            ("mail_old", "email_delayed")):
            if counts[field] > 0:
                issues.append(code)
    except Exception:
        issues.append("database_unavailable")
    try:
        unit = dict(line.split("=", 1) for line in capture(["systemctl", "show", "oraliq-offsite-backup.service",
                    "-p", "Result", "-p", "ExecMainStatus"]).splitlines())
        if unit.get("Result") != "success" or unit.get("ExecMainStatus") != "0":
            issues.append("backup_failed")
        last = load_json(STATE_DIR / "backup-success.json").get("created_at", 0)
        if time.time() - float(last) > 30 * 3600 or float(last) > time.time() + 300:
            issues.append("backup_stale")
    except Exception:
        issues.append("backup_stale")
    disk = shutil.disk_usage("/")
    if disk.used / disk.total >= 0.85 or disk.free < 5 * 1024 ** 3:
        issues.append("disk_low")
    return sorted(set(issues))


def notification(issues):
    if not issues:
        return "OralIQ — الخدمات رجعت للعمل", "فحوص التشغيل رجعت سليمة بعد التنبيه السابق."
    text = "تنبيه تشغيل OralIQ:\n" + "\n".join("• " + ISSUES[code] for code in issues)
    return "OralIQ — تنبيه تشغيل يحتاج مراجعة", text + "\nراجع الخدمة على السيرفر. لا تحتوي الرسالة على بيانات طلاب."


def email_settings():
    # Reuse the configured mail transport without copying secrets into files or process arguments.
    container = json.loads(capture(["docker", "inspect", "oraliq-mailer-1"]))[0]
    return dict(value.split("=", 1) for value in container["Config"]["Env"] if value.startswith("SMTP_"))


def send_email(subject, text):
    settings = email_settings()
    security = settings.get("SMTP_SECURITY", "starttls")
    if security not in {"starttls", "ssl"}:
        raise ValueError("encrypted_smtp_required")
    recipient = os.environ["ALERT_TO"]
    message = EmailMessage()
    message["From"], message["To"], message["Subject"] = settings["SMTP_FROM"], recipient, subject
    message.set_content(text)
    context = ssl.create_default_context()
    host, port = settings["SMTP_HOST"], int(settings.get("SMTP_PORT", "587"))
    connection = (smtplib.SMTP_SSL(host, port, timeout=15, context=context) if security == "ssl"
                  else smtplib.SMTP(host, port, timeout=15))
    with connection as server:
        if security == "starttls":
            server.starttls(context=context)
        server.login(settings["SMTP_USERNAME"], settings["SMTP_PASSWORD"])
        server.send_message(message)


def handle_observation(state, issues, now, *, enabled, sender=send_email, save=lambda _: None, test=False):
    """Two matching samples, one-hour cooldown, at most three attempts/day (test included)."""
    issues = sorted(set(issues))
    fingerprint = hashlib.sha256(json.dumps(issues).encode()).hexdigest()
    if state.get("candidate") == fingerprint:
        state["samples"] = state.get("samples", 0) + 1
    else:
        state["candidate"], state["samples"] = fingerprint, 1
    state["issues"], state["checked_at"] = issues, now
    due = test or (state["samples"] >= 2 and state.get("notified") != fingerprint
                   and (issues or state.get("notified_incident", False)))
    attempts = [stamp for stamp in state.get("attempts", []) if now - stamp < 86400]
    state["attempts"] = attempts
    if not enabled or not due or len(attempts) >= 3 or (attempts and now - attempts[-1] < 3600):
        save(state)
        return "delivery_disabled" if not enabled else "no_delivery_due"
    # Reserve durably BEFORE SMTP, including failures and manual tests. Restart cannot flood mail.
    attempts.append(now)
    save(state)
    try:
        sender(*( (TEST_SUBJECT, TEST_TEXT) if test else notification(issues) ))
    except Exception:
        return "email_send_failed"
    if not test:
        state["notified"], state["notified_incident"] = fingerprint, bool(issues)
    save(state)
    return "email_sent"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--record-backup-success", action="store_true")
    parser.add_argument("--preview-test", action="store_true")
    parser.add_argument("--send-test", action="store_true")
    args = parser.parse_args()
    if args.preview_test:
        print(json.dumps({"to": os.environ.get("ALERT_TO", ""), "subject": TEST_SUBJECT, "text": TEST_TEXT}, ensure_ascii=False))
        return 0
    os.umask(0o077)
    STATE_DIR.mkdir(mode=0o700, exist_ok=True)
    import fcntl
    with (STATE_DIR / ".lock").open("w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if args.record_backup_success:
            record_backup_success()
            print(json.dumps({"event": "backup_success_recorded"}))
            return 0
        enabled = os.environ.get("ALERT_EMAIL_ENABLED", "0") == "1"
        if args.send_test and not enabled:
            raise ValueError("email_delivery_not_authorized")
        try:
            issues = collect()
        except Exception:
            issues = ["monitor_check_failed"]
        state_file = STATE_DIR / "state.json"
        try:
            state = load_json(state_file)
        except Exception:
            # Refuse delivery if the durable rate limiter cannot be read.
            print(json.dumps({"event": "monitor_state_unreadable", "delivery_attempted": False}))
            return 1
        event = handle_observation(state, issues, time.time(), enabled=enabled,
                                   save=lambda data: atomic_json(state_file, data), test=args.send_test)
        print(json.dumps({"event": event, "issues": issues, "email_enabled": enabled}))
        return 1 if event == "email_send_failed" else 0


if __name__ == "__main__":
    raise SystemExit(main())
