"""Off-site publication must fail closed and commit only after verified readback."""
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
spec = importlib.util.spec_from_file_location("upload_b2", ROOT / "contabo/upload_b2.py")
upload = importlib.util.module_from_spec(spec)
spec.loader.exec_module(upload)


@pytest.fixture
def artifact(tmp_path):
    archive = tmp_path / "oraliq_oraliq_20261117T033000Z.dump.gz.gpg"
    archive.write_bytes(b"encrypted-fixture")
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    side = Path(str(archive) + ".sha256")
    side.write_text(f"{digest}  {archive.name}\n")
    manifest = {"file": archive.name, "encrypted": True, "status": "verified", "sha256": digest,
                "size_bytes": archive.stat().st_size, "created_at": "2026-11-17T03:30:00+00:00"}
    meta = Path(str(archive) + ".json")
    meta.write_text(json.dumps(manifest))
    return archive, side, meta, manifest


def test_corrupt_or_plaintext_backup_is_never_accepted(artifact):
    archive, side, meta, manifest = artifact
    args = list(map(str, (archive, side, meta)))
    assert upload.checked_inputs(args, directory=archive.parent)[3] == manifest
    archive.write_bytes(b"tampered")
    with pytest.raises(upload.UploadError):
        upload.checked_inputs(args, directory=archive.parent)
    manifest["encrypted"] = False
    meta.write_text(json.dumps(manifest))
    with pytest.raises(upload.UploadError):
        upload.checked_inputs(args, directory=archive.parent)


def test_sidecar_cannot_be_substituted_with_another_file(artifact):
    archive, side, meta, _ = artifact
    with pytest.raises(upload.UploadError, match="sidecar"):
        upload.checked_inputs([str(archive), str(meta), str(side)], directory=archive.parent)


def test_remote_rejects_path_injection_and_missing_credentials(monkeypatch, artifact):
    monkeypatch.setenv("BACKUP_B2_BUCKET", "bucket/../../other")
    with pytest.raises(upload.UploadError, match="bucket"):
        upload.remote_directory(artifact[0])
    monkeypatch.setenv("BACKUP_B2_BUCKET", "oraliq-test-backups")
    monkeypatch.setenv("RCLONE_CONFIG_OFFSITE_TYPE", "b2")
    monkeypatch.delenv("RCLONE_CONFIG_OFFSITE_KEY", raising=False)
    with pytest.raises(upload.UploadError, match="credentials"):
        upload.remote_directory(artifact[0])


def setup_publication(monkeypatch, artifact):
    archive, *_ = artifact
    config = Path(str(archive) + ".config.tar.gz.gpg")
    config.write_bytes(b"encrypted-config-fixture")
    config_hash = Path(str(config) + ".sha256")
    config_hash.write_text("fixture-checksum")
    monkeypatch.setattr(upload, "checked_inputs", lambda args: artifact)
    monkeypatch.setattr(upload, "remote_directory", lambda path: "offsite:bucket/oraliq/production/stamp")
    monkeypatch.setattr(upload, "config_snapshot", lambda path: (config, config_hash))
    monkeypatch.setenv("BACKUP_GPG_RECIPIENT", "A" * 40)


def test_commit_is_last_and_records_all_five_verified_objects(monkeypatch, artifact):
    setup_publication(monkeypatch, artifact)
    calls = []
    monkeypatch.setattr(upload, "put_verified", lambda path, remote: calls.append((path, remote)))
    upload.publish([])
    assert len(calls) == 6 and calls[-1][1].endswith("/complete.json")
    receipt = json.loads(calls[-1][0].read_text())
    assert len(receipt["files"]) == 5
    assert receipt["files"][0]["sha256"] == artifact[3]["sha256"]


def test_partial_failure_never_publishes_commit(monkeypatch, artifact):
    setup_publication(monkeypatch, artifact)
    calls = []

    def fail_on_config(path, remote):
        calls.append(remote)
        if len(calls) == 4:
            raise upload.UploadError("remote_checksum_mismatch")

    monkeypatch.setattr(upload, "put_verified", fail_on_config)
    with pytest.raises(upload.UploadError, match="checksum"):
        upload.publish([])
    assert not any(remote.endswith("/complete.json") for remote in calls)
    assert not Path(str(artifact[0]) + ".complete.json").exists()


def test_retry_reuses_identical_config_and_rejects_changed_config(monkeypatch, artifact):
    archive = artifact[0]
    target = Path(str(archive) + ".config.tar.gz.gpg")
    target.write_bytes(b"previously-encrypted-config")
    side = Path(str(target) + ".sha256")
    side.write_text(f"{upload.sha256_of(target)}  {target.name}\n")
    assert upload.config_snapshot(archive) == (target, side)
    target.write_bytes(b"changed")
    with pytest.raises(upload.UploadError, match="checksum"):
        upload.config_snapshot(archive)


def test_upload_readback_mismatch_is_an_error(monkeypatch, artifact):
    class SuccessfulCopy:
        returncode = 0

    monkeypatch.setattr(upload.subprocess, "run", lambda *args, **kwargs: SuccessfulCopy())
    monkeypatch.setattr(upload, "remote_digest", lambda remote: "0" * 64)
    with pytest.raises(upload.UploadError, match="checksum"):
        upload.put_verified(artifact[0], "offsite:bucket/file")


def test_credentials_are_not_added_to_rclone_arguments(monkeypatch):
    monkeypatch.setenv("RCLONE_CONFIG_OFFSITE_KEY", "private-provider-key-fixture")
    assert "private-provider-key-fixture" not in " ".join(upload.rclone_base())
