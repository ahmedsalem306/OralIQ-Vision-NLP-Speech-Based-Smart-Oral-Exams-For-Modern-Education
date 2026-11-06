# OralIQ — Contabo deployment (8 vCPU / 24 GB)

This is the deployment package, not a running server. Buy the VPS and domain before the cutover.
Frontend stays on Vercel. PostgreSQL, API, grading worker, HTTPS proxy and local backups run here.
No Supabase or Hugging Face *hosting* is required. Model files still download from their original
registries (including Hugging Face Hub) and are cached in the persistent `models` volume.

## First deployment

Use a maintained Linux server with Docker Engine and the Compose plugin installed using Docker's
official instructions. Run from `deploy/contabo` in a checkout of the approved release:

1. Copy `.env.example` to `.env`, then fill `POSTGRES_PASSWORD` (random hex), `SECRET_KEY`
   (at least 32 random characters), `API_DOMAIN`, `ACME_EMAIL`, origins, SMTP and live payment keys.
   Keep the existing JWT signing key if migrating existing users, so sessions remain valid.
   Generate passwords locally with `openssl rand -hex 32`; do not paste them into Git or screenshots.
2. Point the API domain's A record at the server. Remove any stale AAAA record unless IPv6 works.
   Allow SSH from your management IP and public TCP 80/443 (UDP 443 is optional). Do not publish
   database port 5432 or API port 8000. Compose publishes only the HTTPS proxy.
3. `docker compose config --quiet` validates required settings without displaying secrets.
4. `docker compose up -d --build`
5. `docker compose ps` and `docker compose logs --tail=100 api worker backup`
6. Check `https://<API_DOMAIN>/health`. Warm the model cache before the first real class using a
   test account and recording; first use downloads models. Submit an answer and wait for `completed`.

API finishes schema setup before serving traffic. Worker starts after API's health check. The
shared PostgreSQL queue keeps recordings/jobs through restarts; completed recordings are purged
by the existing worker. Failed audio is kept for 72 hours, configurable in `.env`.

## Resource defaults and capacity

| Service | CPU ceiling | Memory ceiling |
| --- | ---: | ---: |
| API + biometric endpoints | 2 | 4 GB |
| Grading worker | 5 | 14 GB |
| PostgreSQL | 1 | 3 GB |
| Proxy / backups | shared | 256 MB / 512 MB |

Two grading jobs run at once, each Whisper job uses two CPU threads and Whisper has two inference
workers. One API worker keeps the existing process-local rate limiter coherent. Model caches and
PostgreSQL use persistent named volumes. Leave the remaining RAM to Linux and disk cache.

Students can record simultaneously; grading capacity is a different number. Do not sell 150/500
simultaneous students just because a plan currently advertises that limit. Measure on the actual
CPU, whose vCPUs may be shared. Start with small classes, then load-test the provided
`backend/scripts/load_test_submit.py` on staging with real-length Arabic audio. Measure submit p95,
worker RSS, CPU, queue age, disk, failed jobs and drain time. Decide the saleable seat limit from
those results. API queue metrics: `/api/v1/exams/grading/metrics` (admin authentication required).

Backlog estimate: if two slots each take 120 seconds per answer, 100 answers arriving together
need about `ceil(100 / 2) * 120 = 6000` seconds (100 minutes) to drain. This is an example,
not measured performance or a promise. Add capacity or reduce audio length when waits are high.

Load-test input is a private `students.load.json` file: an array of objects containing `token`
(bearer token), `question_id` and `exam_key` for distinct enrolled test students. Use an open,
immediate-results exam and fresh attempts, then run from `backend`:

```sh
python scripts/load_test_submit.py --base-url https://<staging-api-domain> --students students.load.json --audio test-answer.webm --concurrency 10 --confirm-staging
```

The script writes actual submissions and reports submit p95, accepted requests, completion count
and total drain time. Repeat with increasing concurrency on staging, not against real students.

## Vercel cutover (after the API is live)

In the connected Vercel project's environment settings set:

```text
VITE_API_URL=https://<API_DOMAIN>/api/v1
VITE_SITE_URL=https://<your-frontend-domain>
```

Set the same frontend origins in backend `ALLOWED_ORIGINS` and `FRONTEND_URL`. Update Google's
authorized JavaScript origins and Kashier's webhook to
`https://<API_DOMAIN>/api/v1/billing/webhook/kashier`. Redeploy Vercel: Vite embeds env values at
build time. Check sign-up mail, login, biometric enrollment, a scheduled exam, upload, completed
grading and a real minimal payment before opening enrollment. Keep the previous backend reachable
until all in-progress exams finish. The repository's current HF URL remains the transitional
frontend target until this cutover; it is not used by this server deployment.

## Migrate existing data

Do not start an empty database and assume current users will appear. Pause new registrations,
payments and exams; let in-progress sittings and grading drain; take a source backup. Use a
PostgreSQL custom-format dump from the existing production database (not SQLite development
files), copy it securely, and restore it into this stack before accepting new writes. Preserve
IDs, embeddings, payments, jobs and the JWT signing key. Do not run old and new databases with
independent writes during the cutover. If the source turns out to be SQLite, prepare and verify
a dedicated data conversion before migration; `pg_restore` cannot import SQLite.

## Backups, recovery and updates

The backup service writes a compressed custom-format dump immediately and every 24 hours,
validates its archive listing and keeps 14 days under `./backups`. It exits on failure so Docker
restarts it. Watch its error logs and the newest dump timestamp; configure external alerts.
Backups on the same VPS do not protect against loss of the VPS: copy them encrypted to a separate
provider every day. Disk must hold active DB/WAL, queued audio, model cache and the retained dumps.
This daily policy can lose up to 24 hours of changes; use WAL archiving/PITR if that is unacceptable.

Test restore into a separate database, never overwrite the live one to test:

```sh
docker compose exec db createdb -U oraliq oraliq_restore_check
cat backups/<chosen-dump>.dump | docker compose exec -T db pg_restore -U oraliq -d oraliq_restore_check --no-owner --no-acl --exit-on-error
docker compose exec db psql -U oraliq -d oraliq_restore_check -c 'SELECT count(*) FROM users;'
```

Compare key table counts and sample rows with the source. For a release, take a fresh backup,
record the previous commit/image, update code, rebuild, then `docker compose up -d --build`.
Schema changes in this release only add nullable schedule columns. Never run `docker compose down -v`
against production: that removes the database/model volumes. Test the release and rollback on
staging first; this local environment has no Docker daemon or purchased VPS to validate containers.

References: [Compose health dependencies](https://docs.docker.com/compose/how-tos/startup-order/),
[Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https),
[PostgreSQL pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html).
