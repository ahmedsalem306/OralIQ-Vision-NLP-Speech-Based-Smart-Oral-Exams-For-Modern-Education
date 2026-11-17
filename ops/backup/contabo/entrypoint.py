"""Import only the offline recovery key's PUBLIC half into an ephemeral keyring."""
import os
from pathlib import Path
import re
import subprocess
import sys

import oraliq_db_backup


def prepare_keyring():
    fingerprint = os.environ.get("BACKUP_GPG_RECIPIENT", "")
    if not re.fullmatch(r"[0-9A-F]{40}", fingerprint):
        raise RuntimeError("A full recovery-key fingerprint is required")
    home = Path(os.environ["GNUPGHOME"])
    home.mkdir(mode=0o700, parents=True, exist_ok=True)
    home.chmod(0o700)
    imported = subprocess.run(
        ["gpg", "--batch", "--no-tty", "--import", "/run/secrets/recipient.asc"],
        stdin=subprocess.DEVNULL, capture_output=True, timeout=30,
    )
    if imported.returncode:
        raise RuntimeError("Public recovery-key import failed")
    public = subprocess.run(["gpg", "--batch", "--with-colons", "--list-keys"],
                            capture_output=True, text=True, check=True, timeout=30).stdout
    fingerprints = [line.split(":")[9] for line in public.splitlines() if line.startswith("fpr:")]
    if fingerprint not in fingerprints:
        raise RuntimeError("Public recovery-key fingerprint does not match")
    private = subprocess.run(["gpg", "--batch", "--with-colons", "--list-secret-keys"],
                             capture_output=True, text=True, check=True, timeout=30).stdout
    if any(line.startswith(("sec:", "ssb:")) for line in private.splitlines()):
        raise RuntimeError("The backup job must not contain private recovery keys")


if __name__ == "__main__":
    os.umask(0o077)
    try:
        prepare_keyring()
    except (OSError, RuntimeError, subprocess.SubprocessError):
        print('{"event":"backup_keyring_failed"}', flush=True)
        raise SystemExit(1)
    raise SystemExit(oraliq_db_backup.main(sys.argv[1:]))
