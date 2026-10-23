#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# MySQL backup script for the Organic Foods database.
#
# Usage:
#   ./scripts/backup-db.sh              # reads DATABASE_URL from .env
#   DATABASE_URL="mysql://…" ./scripts/backup-db.sh
#
# Output:  storage/backups/organic_YYYYMMDD_HHMMSS.sql.gz
# Retention: keeps the last 7 daily backups; older ones are deleted.
#
# Schedule with cron (e.g. daily at 02:00):
#   0 2 * * * cd /path/to/organic-site && ./scripts/backup-db.sh >> logs/backup.log 2>&1
# ---------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

BACKUP_DIR="$PROJECT_DIR/storage/backups"
KEEP=7  # number of recent backups to retain

# ── Load DATABASE_URL from .env if not already set ──────────────────────────
if [[ -z "${DATABASE_URL:-}" ]]; then
  ENV_FILE="$PROJECT_DIR/.env"
  if [[ -f "$ENV_FILE" ]]; then
    DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | sed 's/^DATABASE_URL=//' | tr -d '"' | tr -d "'")"
  fi
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[backup] ERROR: DATABASE_URL not set and no .env found." >&2
  exit 1
fi

# ── Parse the MySQL URL ─────────────────────────────────────────────────────
# Format: mysql://USER:PASS@HOST:PORT/DBNAME
proto="${DATABASE_URL%%://*}"
rest="${DATABASE_URL#*://}"

userpass="${rest%%@*}"
DB_USER="${userpass%%:*}"
DB_PASS="${userpass#*:}"

hostportdb="${rest#*@}"
hostport="${hostportdb%%/*}"
DB_HOST="${hostport%%:*}"
DB_PORT="${hostport##*:}"

DB_NAME="${hostportdb#*/}"
# Strip any query string (?ssl=…)
DB_NAME="${DB_NAME%%\?*}"

if [[ -z "$DB_NAME" || -z "$DB_HOST" || -z "$DB_USER" ]]; then
  echo "[backup] ERROR: could not parse DATABASE_URL." >&2
  exit 1
fi

# ── Dump ────────────────────────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILENAME="${DB_NAME}_${TIMESTAMP}.sql.gz"
FILEPATH="$BACKUP_DIR/$FILENAME"

echo "[backup] $(date -Iseconds) dumping $DB_NAME → $FILENAME"

MYSQL_PWD="$DB_PASS" mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --single-transaction \
  --routines \
  --triggers \
  --quick \
  "$DB_NAME" | gzip > "$FILEPATH"

SIZE="$(du -h "$FILEPATH" | cut -f1)"
echo "[backup] $(date -Iseconds) done — $FILENAME ($SIZE)"

# ── Retention: keep only the most recent $KEEP backups ──────────────────────
# List files matching the pattern, newest first; delete everything past $KEEP.
REMOVED=0
while IFS= read -r old; do
  rm -f "$old"
  REMOVED=$((REMOVED + 1))
done < <(ls -1t "$BACKUP_DIR"/${DB_NAME}_*.sql.gz 2>/dev/null | tail -n +$((KEEP + 1)))

if [[ "$REMOVED" -gt 0 ]]; then
  echo "[backup] $(date -Iseconds) removed $REMOVED old backup(s), keeping $KEEP"
fi
