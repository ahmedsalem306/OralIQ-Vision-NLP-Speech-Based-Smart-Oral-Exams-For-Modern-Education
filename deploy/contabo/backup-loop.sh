#!/bin/sh
set -eu
umask 077
mkdir -p /backups
minimum_tables=${BACKUP_MIN_TABLES:-16}
case "$minimum_tables" in
    ''|*[!0-9]*) echo "ERROR: BACKUP_MIN_TABLES must be a positive integer" >&2; exit 1 ;;
esac
if [ "$minimum_tables" -lt 1 ]; then
    echo "ERROR: BACKUP_MIN_TABLES must be positive" >&2
    exit 1
fi
while true; do
    stamp=$(date -u +%Y%m%dT%H%M%SZ)
    partial="/backups/oraliq-${stamp}.partial"
    final="/backups/oraliq-${stamp}.dump"
    toc="${partial}.toc"
    if pg_dump --format=custom --no-owner --no-acl --file="$partial" && pg_restore --list "$partial" >"$toc"; then
        table_count=$(awk '$4 == "TABLE" && $5 != "DATA" { count++ } END { print count+0 }' "$toc")
        if [ "$table_count" -lt "$minimum_tables" ]; then
            echo "ERROR: backup has ${table_count} tables; expected at least ${minimum_tables}; archive not published" >&2
            exit 1
        fi
        mv "$partial" "$final"
        rm -f "$toc"
        echo "Backup completed: ${stamp} (${table_count} tables)"
        find /backups -maxdepth 1 -type f -name 'oraliq-*.dump' -mtime +14 -delete
    else
        echo "ERROR: backup failed at ${stamp}" >&2
        exit 1
    fi
    sleep 86400
done
