#!/bin/sh
set -eu
project=${1:-oraliq-loadtest}
output=${2:-./loadtest-artifacts/resources.jsonl}
case "$project" in ''|*[!a-zA-Z0-9_-]*) echo 'Invalid Compose project name' >&2; exit 2;; esac
mkdir -p "$(dirname "$output")"
umask 077
echo 'Recording Docker resource samples every 5 seconds. Ctrl+C to stop.' >&2
while true; do
    printf '{"sample_time_utc":"%s"}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$output"
    ids=$(docker ps --filter "label=com.docker.compose.project=$project" --format '{{.ID}}')
    if [ -n "$ids" ]; then
        docker stats --no-stream --format '{{json .}}' $ids >> "$output"
    fi
    sleep 5
done
