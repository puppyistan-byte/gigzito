#!/bin/bash
# Gigzito PostgreSQL Backup
# Cron: 0 2 * * * /opt/gigzito/script/db_backup.sh

DB_URL="postgresql://gigzito:Postgres2626492@127.0.0.1:5432/gigzito"
BACKUP_DIR="/opt/gigzito/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/gigzito_db_$TIMESTAMP.sql.gz"
LOG="/var/log/gigzito_backup.log"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting DB backup..." >> "$LOG"
pg_dump "$DB_URL" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
  echo "[$(date)] SUCCESS: $BACKUP_FILE ($SIZE)" >> "$LOG"
else
  echo "[$(date)] FAILED: pg_dump exited with error" >> "$LOG"
  exit 1
fi

# Keep last 30 backups
ls -t "$BACKUP_DIR"/gigzito_db_*.sql.gz 2>/dev/null | tail -n +31 | xargs rm -f

echo "[$(date)] Cleanup done. Backups kept: $(ls $BACKUP_DIR/gigzito_db_*.sql.gz | wc -l)" >> "$LOG"
