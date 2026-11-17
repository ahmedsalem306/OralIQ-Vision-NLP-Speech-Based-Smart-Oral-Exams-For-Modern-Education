#!/usr/bin/env python3
"""Publish encrypted snapshots to B2; read every object back before committing.

Credentials stay in the process environment. This hook never syncs, overwrites
or deletes remote objects. Bucket retention is administered separately from the
server's upload key. A commit object is published last, after every checksum passes.
"""
import hashlib
import io
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tarfile
import tempfile

from oraliq_db_backup import NAME_RE, gpg_encrypt, sha256_of


class UploadError(Exception):
    pass


def checked_inputs(arguments, *, directory=Path("/backups")):
    if len(arguments) != 3:
        raise UploadError("expected_archive_and_two_sidecars")
    archive, checksum, manifest_file = [Path(value) for value in arguments]
    if archive.parent != directory or not NAME_RE.fullmatch(archive.name) or not archive.name.endswith(".gpg"):
        raise UploadError("unexpected_archive_path")
    if checksum != Path(str(archive) + ".sha256") or manifest_file != Path(str(archive) + ".json"):
        raise UploadError("unexpected_sidecar_path")
    for path in (archive, checksum, manifest_file):
        if path.is_symlink() or not path.is_file() or path.resolve().parent != directory:
            raise UploadError("unsafe_backup_input")
    manifest = json.loads(manifest_file.read_text())
    digest = sha256_of(archive)
    if (manifest.get("encrypted") is not True or manifest.get("status") != "verified"
            or manifest.get("file") != archive.name or manifest.get("sha256") != digest
            or manifest.get("size_bytes") != archive.stat().st_size
            or checksum.read_text().split() != [digest, archive.name]):
        raise UploadError("local_backup_verification_failed")
    return archive, checksum, manifest_file, manifest


def remote_directory(archive):
    bucket = os.environ.get("BACKUP_B2_BUCKET", "")
    if not re.fullmatch(r"[a-zA-Z0-9-]{6,63}", bucket):
        raise UploadError("invalid_bucket_name")
    if os.environ.get("RCLONE_CONFIG_OFFSITE_TYPE") != "b2":
        raise UploadError("b2_remote_not_configured")
    if not all(os.environ.get(key) for key in ("RCLONE_CONFIG_OFFSITE_ACCOUNT", "RCLONE_CONFIG_OFFSITE_KEY")):
        raise UploadError("b2_credentials_not_configured")
    stamp = NAME_RE.fullmatch(archive.name).group("ts")
    return f"offsite:{bucket}/oraliq/production/{stamp}"


def config_snapshot(archive):
    """The app signing/encryption secret is needed to recover encrypted outbox data."""
    destination = Path(str(archive) + ".config.tar.gz.gpg")
    digest_file = Path(str(destination) + ".sha256")
    # Retrying an incomplete upload must reuse the identical encrypted config:
    # GPG encryption is randomized and immutable remote objects cannot be replaced.
    if destination.exists():
        if (destination.is_symlink() or digest_file.is_symlink() or not digest_file.is_file()
                or digest_file.read_text().split() != [sha256_of(destination), destination.name]):
            raise UploadError("existing_configuration_checksum_mismatch")
        return destination, digest_file
    sources = [
        (Path("/run/secrets/application.env"), "application.env"),
        (Path("/run/config/compose.yaml"), "compose.yaml"),
        (Path("/run/config/compose.nginx.yaml"), "compose.nginx.yaml"),
        (Path("/run/secrets/recipient.asc"), "recipient.asc"),
    ]
    with tempfile.TemporaryDirectory(prefix="oraliq-config-") as temporary:
        plain = Path(temporary) / "config.tar.gz"
        with tarfile.open(plain, "w:gz") as package:
            for source, name in sources:
                if not source.is_file() or source.stat().st_size > 1024 * 1024:
                    raise UploadError("missing_or_oversized_recovery_configuration")
                member = tarfile.TarInfo(name)
                content = source.read_bytes()
                member.size, member.mode = len(content), 0o600
                package.addfile(member, io.BytesIO(content))
        partial = Path(str(destination) + ".partial")
        try:
            gpg_encrypt(plain, partial, os.environ["BACKUP_GPG_RECIPIENT"])
            os.replace(partial, destination)
        finally:
            partial.unlink(missing_ok=True)
    digest_file.write_text(f"{sha256_of(destination)}  {destination.name}\n")
    return destination, digest_file


def rclone_base():
    return ["rclone", "--config", "/dev/null", "--contimeout", "30s", "--timeout", "2m",
            "--retries", "3", "--low-level-retries", "5", "--buffer-size", "4M",
            "--transfers", "1", "--checkers", "1", "--b2-chunk-size", "16M"]


def remote_digest(remote):
    with tempfile.TemporaryFile() as diagnostics:
        proc = subprocess.Popen(rclone_base() + ["cat", remote], stdin=subprocess.DEVNULL,
                                stdout=subprocess.PIPE, stderr=diagnostics)
        digest = hashlib.sha256()
        try:
            for block in iter(lambda: proc.stdout.read(1024 * 1024), b""):
                digest.update(block)
            if proc.wait(timeout=150) != 0:
                raise UploadError("remote_readback_failed")
        finally:
            proc.stdout.close()
            if proc.poll() is None:
                proc.kill()
                proc.wait()
        return digest.hexdigest()


def put_verified(path, remote):
    completed = subprocess.run(rclone_base() + ["copyto", "--immutable", "--no-traverse", str(path), remote],
                               stdin=subprocess.DEVNULL, capture_output=True, timeout=900)
    if completed.returncode:
        raise UploadError("remote_upload_failed")
    if remote_digest(remote) != sha256_of(path):
        raise UploadError("remote_checksum_mismatch")


def publish(arguments):
    archive, checksum, manifest_file, manifest = checked_inputs(arguments)
    directory = remote_directory(archive)
    config, config_checksum = config_snapshot(archive)
    files = (archive, checksum, manifest_file, config, config_checksum)
    entries = []
    for path in files:
        put_verified(path, directory + "/" + path.name)
        entries.append({"name": path.name, "sha256": sha256_of(path), "bytes": path.stat().st_size})
    receipt = {"format": "oraliq-offsite-commit/1", "backup_created_at": manifest["created_at"],
               "recovery_key_fingerprint": os.environ["BACKUP_GPG_RECIPIENT"], "files": entries}
    commit = Path(str(archive) + ".complete.json")
    commit.write_text(json.dumps(receipt, indent=2) + "\n")
    put_verified(commit, directory + "/complete.json")
    print(json.dumps({"event": "offsite_readback_verified", "objects": len(files) + 1}), flush=True)


if __name__ == "__main__":
    os.umask(0o077)
    try:
        publish(sys.argv[1:])
    except Exception as error:
        # rclone/gpg diagnostics may contain provider response data. Log only a stage/type.
        stage = str(error) if isinstance(error, UploadError) else type(error).__name__
        print(json.dumps({"event": "offsite_upload_failed", "stage": stage}), file=sys.stderr, flush=True)
        raise SystemExit(1)
