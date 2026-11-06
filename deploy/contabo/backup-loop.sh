#!/bin/sh
set -eu
umask 077
mkdir -p /backups
while true; do
    stamp=$(date -u +%Y%m%dT%H%M%SZ)
    partial="/backups/oraliq-${stamp}.partial"
    final="/backups/oraliq-${stamp}.dump"
    if pg_dump --format=custom --no-owner --no-acl --file="$partial" && pg_restore --list "$partial" >/dev/null; then
        mv "$partial" "$final"
        echo "Backup completed: ${stamp}"
        find /backups -maxdepth 1 -type f -name 'oraliq-*.dump' -mtime +14 -delete
    else
        echo "ERROR: backup failed at ${stamp}" >&2
        exit 1
    fi
    sleep 86400
done
