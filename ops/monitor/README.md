# Host operation checks

`oraliq_monitor.py` uses Python's standard library on the Contabo host. It checks
local API health, the public HTTPS health response, the four production containers,
a real read-only database query, grading and mail queue delays, root disk space,
the last offsite backup unit result and a successful offsite run within 30 hours.
The backup unit's `ExecStartPost` records success only after the upload/readback
command exits successfully. The presence of a locally written commit file alone
is not treated as proof of successful remote upload.

Install files under `/opt/oraliq-monitor`, units under `/etc/systemd/system`, and
`offsite-success.conf` under
`/etc/systemd/system/oraliq-offsite-backup.service.d/`. The private configuration
file `/etc/oraliq-monitor/monitor.env` contains:

```ini
ALERT_EMAIL_ENABLED=0
ALERT_TO=ghartech1@gmail.com
```

Keep notification delivery disabled until the owner approves actual test delivery
and ongoing incident notifications. Enabling the timer with delivery disabled only
records checks locally; it sends no mail. Never copy SMTP credentials to this
configuration: the script reads the existing mailer container configuration in
memory. It requires encrypted SMTP with verified TLS and sends only fixed issue
descriptions, without student names, recordings, transcripts, tokens or raw logs.

The service needs root access to the existing Docker daemon and backup state.
Its systemd filesystem restrictions do not make access to that daemon unprivileged.
It does not restart services, modify the database, prune backups or call an ASR API.

To review the exact test message:

```sh
ALERT_TO=ghartech1@gmail.com python3 /opt/oraliq-monitor/oraliq_monitor.py --preview-test
```

After explicit approval, set `ALERT_EMAIL_ENABLED=1` in the private file and invoke
the script with that environment and `--send-test`. Use the same state directory
as the timer. A test consumes the same rate budget as incident mail. Two matching
observations are required before an incident or recovery message. At most one
delivery attempt per hour and three attempts per rolling 24 hours are permitted;
failed SMTP attempts count too. Repeated identical incidents do not resend until
their state changes. Review suppressed/failed delivery in the unit journal.

Host checks cannot send mail while this entire VPS or its network is down. A
separate external uptime monitor is still needed for that scenario. An outage of
the SMTP provider may also prevent email alerts; local journals remain available.

Verification:

```sh
python3 -m unittest discover -s ops/monitor -p 'test_*.py'
systemctl start oraliq-monitor.service
journalctl -u oraliq-monitor.service -n 5 --no-pager
```
