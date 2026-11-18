# Contabo encrypted backups to Backblaze B2

This supplements the existing local PostgreSQL backup. It does not replace the
legacy job until an actual B2 upload, download and restore have succeeded.
The actual B2 upload/download/recovery passed on November 18 and the daily timer
is enabled. Current validation and remaining owner actions are recorded in
[the activation report](../../../docs/offsite-backup-2026-11-18.md).

## Recovery material

Generate the recovery key **on the owner's computer**, with a strong passphrase.
Keep the encrypted private-key export and passphrase in owner-controlled recovery
storage outside Contabo. Only the armored PUBLIC key is installed at
`/etc/oraliq-backup/recipient.asc`. The container imports it into an ephemeral
keyring and refuses to start if it finds secret keys.

The tested public-key fingerprint is:
`4FBBF0F5BB90FF6123B168146C188612A3E9B377`.

The database snapshot includes queued audio, identity templates and the mail
outbox. The separately encrypted configuration archive contains `application.env`,
the two Compose files and the public recovery key. The application signing secret
is necessary to recover encrypted queued emails. Never upload these configuration
files without encryption. Exam video is not recorded by this backup workflow.

## Owner's B2 setup

1. Create **B2 Cloud Storage** at
   <https://www.backblaze.com/sign-up/cloud-storage>. The account can start without
   a payment card. `Get Started Free` creates the account; `Sign In` opens an
   existing account.
2. Create a new **Private** bucket dedicated to OralIQ backups. Keep public access
   disabled. Set the storage region deliberately at account setup.
3. Configure bucket retention/lifecycle independently of the upload server.
   Suggested policy: protect new versions for seven days with Object Lock in
   governance mode, and retain daily snapshots for at least thirty days. The
   upload application key must not have governance bypass or account/bucket
   administration permissions. Object Lock and default retention are separate
   settings: enabling the feature alone does not protect new objects. These
   settings have **not** been applied yet; review the provider's displayed effects
   before saving an irreversible lock setting.
4. Create an application key restricted to this bucket, with the read/list/write
   permissions required for upload and download verification. Prefer a key without
   remote deletion permissions. Do not use the master account key. If using a web
   console preset that includes deletion, verify bucket retention and absence of
   governance-bypass permission before enabling scheduled uploads.
5. Save the bucket name, key ID and application key in the private local
   `D:\interview-ai\.server-access\b2-backup-access.json` template. Do not send
   secrets through chat or put them in Git. Install only those B2 credentials in
   the root-only `/etc/oraliq-backup/storage.env`:

```dotenv
BACKUP_B2_BUCKET=YOUR_PRIVATE_BUCKET
RCLONE_CONFIG_OFFSITE_TYPE=b2
RCLONE_CONFIG_OFFSITE_ACCOUNT=BUCKET_SCOPED_KEY_ID
RCLONE_CONFIG_OFFSITE_KEY=BUCKET_SCOPED_APPLICATION_KEY
```

The B2 provider currently includes the first 10 GB of storage. All retained
versions and queued-audio snapshots count toward that allowance. Monitor total
stored bytes and upload failures; do not promise permanently free storage.

## Installed layout and first run

- Source: `/opt/oraliq-backup/source`, built with
  `docker build --target runtime -f contabo/Dockerfile -t oraliq-backup:offsite-20261117 .`.
- `/etc/oraliq-backup/backup.env`: private database URL and backup policy. The
  operator derives the URL privately from the production container environment.
  No database passwords are placed in unit files or command arguments.
- `/etc/oraliq-backup/storage.env`: bucket-scoped provider credentials, mode 0600.
- `/etc/oraliq-backup/recipient.asc`: public recovery key, root-owned.
- `/var/backups/oraliq/encrypted`: root-only encrypted artifacts.

Validate configuration with `docker compose -f
/opt/oraliq-backup/source/contabo/compose.yaml config --quiet`. **Never print the
expanded Compose configuration**, which contains credentials.

Run `systemctl start oraliq-offsite-backup.service` only after installing valid
storage credentials. Verify its exit status and the uploaded `complete.json`.
Retrieve that snapshot from B2 to the owner's protected recovery directory;
verify every SHA-256, decrypt there using the exported private key, and restore
only into a fresh database ending in `_loadtest`. The private key and recovery
passphrase must never be transferred to Contabo for this rehearsal.

Only after that passes:

```sh
systemctl enable --now oraliq-offsite-backup.timer
systemctl list-timers oraliq-offsite-backup.timer
```

The timer runs at **03:30 Africa/Cairo**, with up to five minutes of jitter and a
catch-up run after downtime. Daily snapshots can lose up to approximately one
day of changes, longer if jobs fail; this is not continuous/WAL recovery.
Local retention is thirty days, always keeping at least seven verified backups.
An unsuccessful or missing required off-site copy prevents local pruning.

The hook uploads the encrypted database, its checksum/manifest, encrypted config
and config checksum. It reads all five objects back to verify SHA-256, then
publishes and verifies `complete.json` last. No remote sync/deletion is used.
No completed marker means an incomplete attempt. Credentials stay in the
environment; provider diagnostics are not copied into ordinary logs.

The container has a read-only root filesystem, no extra capabilities or public
ports, bounded resources, and a temporary GPG keyring. No alert message delivery
has been configured by this change. A failed job is visible in systemd/journal;
independent failure/host-down notifications remain separate operational work.
