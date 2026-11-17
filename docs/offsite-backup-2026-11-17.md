# Off-site backup preparation — November 17, 2026

**Encrypted backup creation and local-key recovery are verified. Automatic B2
storage is not connected or enabled yet:** the owner is creating the account.
The final provider choice is Backblaze B2, because the owner does not want to
add a payment card. The earlier Cloudflare R2 selection was superseded.

## Prepared and tested

- Built `oraliq-backup:offsite-20261117` on Contabo with PostgreSQL 17 clients,
  GPG and rclone. The application/API/worker images were not changed.
- Generated an RSA-3072 encryption key on the owner's Windows computer using
  the existing Git GPG executable. The encrypted private-key export and recovery
  passphrase remain local. **Neither was uploaded to Contabo.** The server and
  backup container have only the public key.
- Restricted the local recovery directory/files to the current Windows user,
  SYSTEM and Administrators. Root-only server configuration contains the database
  URL and public recipient; the provider file is still an empty template.
- Created `oraliq_oraliq_20261117T021533Z.dump.gz.gpg` (12,318 bytes) plus a
  separately encrypted configuration archive. They were copied, still encrypted,
  to the owner's protected folder on D for the recovery rehearsal.
- Imported the exported private key into a fresh **local** keyring and decrypted
  both archives. The recovered application signing secret matched the running
  API's secret by a private digest comparison. A wrong passphrase and modified
  ciphertext were both refused.
- Streamed the locally decrypted database over pinned SSH into a newly generated
  `_loadtest` database on the isolated PostgreSQL cluster. **All 20 table row
  counts matched** the snapshot source. The scratch database was removed and no
  production database writes were performed. Temporary local plaintext and the
  test keyring were removed after the test.
- **37 backup/publication tests passed** in an isolated container with networking
  disabled. This includes refusing corrupt/plaintext input, preventing a completed
  remote marker after partial failure, retrying with the identical encrypted
  configuration, and retaining old local copies when required off-site storage
  is missing.

## Findings corrected during rehearsal

The standalone backup container needs an explicit application directory to avoid
treating `/` as the app root. `BACKUP_APP_DIR` is now set in the runtime image.

A schema-filtered PostgreSQL dump includes `CREATE SCHEMA public`, even though a
fresh target already has that schema. Restore now uses `--clean --if-exists` in
the same single transaction **after** refusing occupied targets without explicit
replacement confirmation. That refusal also covers schema objects such as
functions/types/sequences when no tables exist. Production-source overwrite still
requires the existing additional production-restoration confirmation.

Retention now skips pruning when off-site storage is required but its upload hook
is absent, as well as when the hook fails. Configuration/checksum/commit sidecars
are removed together with an expired primary archive.

## Current artifacts and remaining steps

Recovery material is local under `D:\interview-ai\.server-access`:

- `oraliq-backup-recovery-key.asc`: passphrase-protected private-key export.
- `backup-recovery-passphrase.txt`: recovery passphrase; retain separately in
  owner-controlled offline/password-manager storage.
- `oraliq-backup-recipient.asc`: public key, also installed on the server.
- `backup-rehearsal-20261117/local-recovery-report.json`: sanitized proof and
  encrypted snapshot artifacts. This is a one-time copy to the owner's computer,
  not an automated cloud backup.
- `b2-backup-access.json`: empty provider-credential template.

The owner should preserve the private export and recovery passphrase somewhere
independent of both this PC and Contabo. Do not put the passphrase in the backup
bucket or send it in chat.

Server configuration lives under `/etc/oraliq-backup`, source under
`/opt/oraliq-backup/source`, encrypted copies under `/var/backups/oraliq/encrypted`.
The service/timer files are installed, but **the timer remains disabled**.
The existing daily local backup container continues to run.

Root-only checkpoints:

- `/root/oraliq-offsite-bootstrap-20261117-020938`: initial public-key-only setup.
- `/root/oraliq-backup-rehearsal-20261117-021527`: encrypted snapshot and restore log.
- `/root/oraliq-backup-final-tests.log`: final 37-test result.

Next: finish B2 signup, create/secure a private backup bucket with retention and
a restricted application key, install the key privately, run upload/readback,
and repeat recovery with an actual B2 download. Then enable the Cairo daily timer
and verify its next scheduled run. No bucket policy, remote upload or cloud
restoration has been claimed complete. Follow the
[operator runbook](../ops/backup/contabo/README.md).

Sources: [B2 signup](https://www.backblaze.com/sign-up/cloud-storage),
[B2 pricing](https://www.backblaze.com/cloud-storage/pricing),
[Object Lock and default retention](https://www.backblaze.com/docs/cloud-storage-enable-object-lock-with-the-native-api),
[application-key capabilities](https://www.backblaze.com/docs/cloud-storage-application-key-capabilities).
