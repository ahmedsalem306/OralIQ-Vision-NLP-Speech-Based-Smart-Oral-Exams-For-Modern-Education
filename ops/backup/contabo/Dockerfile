FROM postgres:17-alpine AS runtime

# Keep the PostgreSQL tools on the same major version as the production database.
RUN apk add --no-cache python3 gnupg rclone
COPY oraliq_db_backup.py /opt/oraliq-backup/oraliq_db_backup.py
COPY contabo/entrypoint.py contabo/upload_b2.py /opt/oraliq-backup/
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PYTHONPATH=/opt/oraliq-backup GNUPGHOME=/tmp/gnupg \
    RCLONE_CONFIG=/dev/null BACKUP_APP_DIR=/opt/oraliq-backup
ENTRYPOINT ["python3", "/opt/oraliq-backup/entrypoint.py"]
CMD ["backup"]

FROM runtime AS tests
RUN apk add --no-cache py3-pytest
COPY . /workspace/ops/backup
WORKDIR /workspace/ops/backup
ENTRYPOINT ["python3", "-m", "pytest"]
CMD ["tests", "-q", "-o", "cache_dir=/tmp/pytest-backup-cache"]
