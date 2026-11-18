# Encrypted B2 backups activated — November 18, 2026

**The off-site backup is enabled.** A real encrypted production snapshot was
uploaded to the owner's private Backblaze B2 bucket, downloaded from B2, decrypted
with an owner-held local recovery key, and restored into a fresh isolated database.
All **20 table row counts matched**. The production database was not overwritten.

The daily timer is enabled and active. Its next run, when checked, was
**November 19, 2026 at 03:31:57 Africa/Cairo**. The configured schedule is 03:30
each day with up to five minutes of random delay, plus catch-up after downtime.

## Storage, credentials and retention

- Bucket: `oralliq-backups-20261117`, verified `allPrivate`, with provider SSE-B2
  AES256 encryption in addition to client-side GPG encryption.
- Namespace: `oraliq/production/`. The application key is restricted to this
  single bucket and prefix. It has no account-key administration or governance
  bypass capability. Credentials are installed only in the root-only server
  configuration and retained in the owner's protected local setup file; no
  credential values are in source, logs or this report.
- The owner enabled Object Lock and confirmed a seven-day default retention.
  A unique non-sensitive probe was uploaded and downloaded successfully. Deleting
  that exact probe with the server key failed with **401 `access_denied`**, the
  provider's Object Lock refusal. No backup deletion was attempted.
- The existing key cannot read or modify bucket-retention settings. The precise
  duration/mode was therefore not read through the API: seven days is the owner's
  confirmed setting, and protection was independently verified by the failed
  deletion. The probe remains a tiny protected file until lifecycle expiry.
- A lifecycle rule was applied only to `oraliq/production/`, preserving unrelated
  rules and using the bucket revision to avoid a conflicting concurrent update:
  hide after 30 days, delete one day after hiding, cancel unfinished multipart
  uploads after seven days. Provider lifecycle processing is asynchronous, so
  physical removal is not promised at an exact 31-day boundary.
- Local encrypted artifacts retain the existing thirty-day/minimum-seven policy.
  Required off-site copy failures prevent local pruning. The existing local
  backup container still runs separately; it was not removed or stopped.

The protection test and lifecycle configuration happened before the first real
backup upload. The lifecycle change did not immediately delete any objects.

## Actual upload/download and recovery proof

Snapshot: `oraliq_oraliq_20261118T214633Z.dump.gz.gpg` (UTC name), **13,095 bytes**.

The job encrypted the database and recovery configuration, verified the archive,
uploaded both payloads with their sidecars, and read them back to verify SHA-256.
It published `complete.json` last. An independent rclone download then retrieved
all **six objects** and compared them with the local originals and commit record.
The upload/download flow took approximately 28.44 seconds for this small database;
this is not a future recovery-time or platform-capacity guarantee.

The downloaded ciphertext was copied to the owner's protected directory on D.
A fresh local GPG keyring imported the passphrase-protected private-key export.
The database and configuration decrypted successfully, the recovered application
signing secret matched the running API by a private digest comparison, and a
wrong passphrase and deliberately modified ciphertext were refused.

Only database data was streamed over pinned SSH for the restore. **The private
recovery key and its passphrase never left the owner's computer.** PostgreSQL 17
restored into a randomly named database ending in `_loadtest` on the separate
load-test PostgreSQL container. All twenty tables and their row counts matched;
the scratch database and temporary local plaintext/test keyring were removed.
This proves logical database/config recovery on the existing host, not a complete
replacement-VPS/DNS/certificate rebuild exercise.

## Installed state and evidence

- Service: `oraliq-offsite-backup.service`, latest execution `Result=success`,
  `ExecMainStatus=0`.
- Timer: `oraliq-offsite-backup.timer`, enabled and active.
- Server checkpoint: `/root/oraliq-offsite-activation-20261118-214629` contains
  upload/download, restore and final reports plus private operational logs.
- Server credentials: `/etc/oraliq-backup/storage.env`, mode 0600; no temporary
  credential upload remains in the operator's incoming folder.
- Local encrypted cloud download and recovery proof:
  `D:\interview-ai\.server-access\b2-recovery-test-20261118`.
- Sanitized reports: `loadtest-artifacts/b2-backup-20261118` (ignored by Git).
- Owner-facing key custody instructions:
  `D:\interview-ai\.server-access\backup-recovery-instructions-ar.txt`.

The application's API/worker images were not changed or restarted. Website
status still reports accounts and exams available, payments unavailable.
The [37-test backup suite](offsite-backup-2026-11-17.md) remains the code baseline;
this activation adds actual provider, protection, download and restoration checks.

## Practical limits and remaining launch work

Daily snapshots can lose roughly the last day's changes after a total host loss,
or more if jobs fail. This is not WAL/PITR. The owner still needs to preserve the
encrypted private-key export and passphrase independently of both this PC and
Contabo; instructions are saved locally without including their secret values.

**External backup-failure/host-down notifications are not configured yet.**
Failures currently appear in systemd/journal. Alert delivery is the next separate
operational step; no unsolicited mail or messaging notification was sent.
Groq plan/throughput validation, school-scale load tests, Kashier Live activation
and the requested account-role correction remain separate work.

Operator instructions: [Contabo/B2 runbook](../ops/backup/contabo/README.md).
Provider references: [application-key permissions](https://www.backblaze.com/docs/en/cloud-storage-application-keys),
[Object Lock deletion refusal](https://www.backblaze.com/apidocs/b2-delete-file-version),
[lifecycle rules](https://www.backblaze.com/docs/cloud-storage-lifecycle-rules).
