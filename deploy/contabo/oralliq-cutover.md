# oralliq.com cutover

The user supplied `oralliq.com` and added the API DNS record on 2026-11-14.
The apex and API now resolve to `217.76.56.223`; `www` points to the apex.
The owner removed the extra parking record before cutover. Nameservers
are `ns73.domaincontrol.com` and `ns74.domaincontrol.com`. The owner manages DNS;
no access to the owner's GoDaddy account has been granted to the agent.

## Current decision: Contabo hosts both frontend and API (17 November)

The owner explicitly chose to remove Vercel. The frontend is a static Vite build
served by host Nginx on `oralliq.com`; API requests use `/api/v1` on the same
origin. GoDaddy remains the domain registrar/DNS provider, not the app host.

Required DNS: **A @ = 217.76.56.223** (no residual GoDaddy parking A values),
and **CNAME www = oralliq.com**. Keep the existing API and email records.
Use `nginx.frontend.oralliq.conf` after authoritative DNS agrees and a certificate
covering the apex/www has been issued. Assets are staged under
`/srv/oraliq-web/releases/exams-open-20261117-v2`, with `current` pointing to it.
Account and exam access are open after isolated real-provider smoke checks and
backup-restore verification. `api-maintenance` is absent; the separate
`payments-maintenance` marker closes only checkout/upgrade until Kashier Live
activation. The independent API subdomain remains in maintenance.
See [the exam-opening report](../../docs/exam-opening-2026-11-17.md) for checks,
the conservative shared Free-provider limits, and remaining operational work.
Do not infer readiness from a static homepage alone.

The frontend's production defaults are now `/api/v1` and `https://oralliq.com`.
The older Vercel plan and validation history below are historical. The current
release details are in [the two-minute Contabo release](../../docs/contabo-two-minute-2026-11-16.md).

## Earlier DNS/frontend plan (superseded)

The **A** record named **api**, value **217.76.56.223**, is now verified. Do not
create an API AAAA record without verified IPv6 routing.
Keep frontend DNS separate: add `oralliq.com` and `www.oralliq.com` to the existing
Vercel project and copy its exact required DNS records. Do not guess a generic
Vercel IP/CNAME or point the frontend at this API-only VPS.

Verify public DNS before certificate issuance. Prepare these production values;
they do not belong in the isolated load-test environment:

```dotenv
API_DOMAIN=api.oralliq.com
ACME_EMAIL=ghartech1@gmail.com
FRONTEND_URL=https://oralliq.com
ALLOWED_ORIGINS=https://oralliq.com,https://www.oralliq.com,https://oral-iq-vision-nlp-speech-based-sma.vercel.app
```

Vercel's production build must eventually use:

```dotenv
VITE_API_URL=https://api.oralliq.com/api/v1
VITE_SITE_URL=https://oralliq.com
```

Do not redeploy these API settings until migration, model checks and HTTPS pass.
Update Google's authorized origins/redirect settings and Kashier's live callback
configuration to the confirmed domains, then test login and payments.

## Preserve the existing Nginx

Nginx already owns host port 80. The default Compose proxy also publishes 80/443,
so use the prepared override instead of stopping or overwriting Nginx:

```sh
docker compose -f compose.yaml -f compose.nginx.yaml config --quiet
docker compose -f compose.yaml -f compose.nginx.yaml up -d --build
```

Use both `-f` arguments for subsequent production Compose operations. Keep this
production project/database separate from `oraliq-loadtest`. The override excludes
Caddy by profile and exposes the production API only at `127.0.0.1:18001`.
Do not enable the `standalone-caddy` profile alongside host Nginx.

`nginx.oralliq.conf` is a prepared virtual host, **not installed or enabled**. Before
enabling its TLS block, obtain a certificate for `api.oralliq.com`. For HTTP-01,
temporarily serve only `/.well-known/acme-challenge/` from `/var/www/oraliq-acme`
in a port-80 virtual host; return 503 for other API requests until TLS is ready.
Do not expose the load-test API at port 18000 or point Nginx at it.

The Compose override was validated on the VPS and the virtual host passed `nginx -t`
using a temporary self-signed certificate in a separate configuration. This is a
syntax check, not public TLS issuance, renewal verification or a live proxy test.

After issuance, install the complete virtual host, run `nginx -t`, then reload.
Verify certificate renewal and its Nginx reload hook. The template overwrites
forwarded identity headers and omits API access logs to reduce student-data
exposure; retain private error logs and aggregate operational metrics.

Before enabling real writes, complete [the migration and release checks](README.md).
The current staging database has fresh test secrets and is not a migrated user DB.

## Verified server state after the DNS update

- Let's Encrypt issued the API certificate, valid until February 12, 2027. Certbot's
  renewal timer is enabled. A dry-run renewal **including the deploy hook** passed;
  the hook validates and reloads Nginx after successful renewal.
- The installed virtual host currently serves **TLS maintenance responses**, not
  the full proxy template above. External HTTPS validation succeeds and `/health`
  returns intentional 503 with `Retry-After: 300`; HTTP redirects to HTTPS. The
  ACME HTTP challenge route stays available. No test database is public.
- A separate candidate checkout is `/srv/oraliq`, Compose project `oraliq`. Its API
  uses loopback 18001 and a new PostgreSQL database; a worker and local backup service
  run beside it. Fresh secrets are mode 0600. Test-fixture mode is disabled. The API
  health check passes and the first scheduled local database dump completed.
- The owner confirmed the old site's data are experiments only. No old database
  has been deleted or overwritten. The new database has not been migrated from it.
- Kashier Live activation is still pending. SMTP account/domain verification and
  authentication inside the API now pass. One explicitly approved test message was
  accepted by SMTP and the owner confirmed Inbox arrival. End-to-end signup and
  recipient authentication-header checks remain separate.
  Do not cut over the public frontend yet.
- The API's automatic face/gaze preload remains disabled pending resolution of face
  weight authorization. Worker Whisper/SBERT/voice loading is checked separately;
  loading a model is not an Arabic exam, biometric-accuracy or capacity result.
- Whisper medium CPU int8, SBERT and voice preloading passed in the candidate worker
  (`GRADING_PRELOAD_MODELS=1`); idle worker RSS was about 1.85 GiB. API face/gaze
  preloading remains off. Model weights are cached on the VPS, not the operator's C drive.
- The initial local dump was created before schema setup and had zero tables. That
  archive is quarantined under root's private directory. Backup now waits for API health
  and requires 16 tables. The corrected dump passed an actual separate-database restore;
  an intentionally empty database was rejected with exit 1 and no published dump.
- [Email setup](email-setup.md) uses a privately supplied Resend key and
  `OralIQ <noreply@auth.oralliq.com>`. The key is in the private server environment,
  not source or frontend settings. The temporary upload copy was removed after
  API-container authentication passed. Kashier activation remains in progress.
- A controlled reboot applied kernel `6.8.0-149-generic`. Docker/Nginx/certificate timer
  and candidate API/DB/worker/backup returned automatically. Private health is 200,
  public TLS remains maintenance 503. Active grading queue was empty before reboot;
  recovery of an in-flight real grading job still needs a separate pilot test.
- The queued-mail release `a7f3dd8` is now deployed on the private candidate stack after
  verifying a pre-release database dump. API and mailer health pass. The mailer has a
  fresh DB heartbeat and zero queued/sent/reserved messages; no additional real mail
  was sent for the queue tests. `/system/email-delivery` requires admin authentication.
  The public API virtual host continues to serve maintenance responses.
- SSH administration now uses the explicitly approved `oraliq-ops` account with
  key authentication and password-required sudo. Fresh key/sudo sessions passed before
  and after disabling root SSH and SSH password/keyboard-interactive authentication.
  The existing root session was retained during validation. Existing unrelated accounts
  and public keys were preserved. Previous SSH configuration is saved privately under
  `/root/ssh-before-oraliq-ops-*` for provider-console recovery. Credentials are kept
  outside the repository on the owner's machine; never copy them into deployment docs.
- Private candidate release `71678d1` adds Linux anonymous grading-audio files and the
  recovery smoke. The exact built image passed all 15 recovery checks against an isolated
  load-test schema before rollout. A fresh 18-table archive was verified, then API/worker/
  mailer were updated successfully. Private health is 200 and public HTTPS remains
  maintenance 503. This test used simulated inference and a test-only 5-second lease.
  A separate actual 500-account login probe returned 20 successes and 480 rate limits;
  [school login admission remains unresolved](../../ops/loadtest/README.md).
- Private speech release `5e25455` was built and checked with the owner's actual
  34.539-second audio, using application defaults without experimental wrappers.
  It reproduced the controlled transcript and 97.9 content score exactly; the full
  fresh-process pipeline took 70.687 seconds including model initialization. Before
  rollout the exact image also passed 15 isolated PostgreSQL recovery checks, and an
  18-table backup archive was verified. API/worker/mailer updated successfully, private
  health is 200, public TLS remains maintenance 503, and mail monitoring has no issues
  or reserved/sent messages. Raw uploaded probe files were removed. The detailed audio
  reports/transcripts are private and excluded from Git.
- Shared-school password-login image `fc8ba0e` is now deployed privately after all
  427 Linux/PostgreSQL tests passed, a real 500/500 valid-login probe and password
  abuse checks passed, and the synthetic ten-student HTTP exam workflow passed.
  Recovery smoke and an 18-table backup archive passed before updating API/worker/mailer.
  Private health is 200, public HTTPS remains maintenance 503, mail monitoring has no
  issues and no real mail was sent by these tests. See the measured limits and remaining
  [workflow/browser/capacity boundaries](../../docs/password-login-admission.md).
