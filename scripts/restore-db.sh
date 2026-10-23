#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Restore a MySQL backup created by backup-db.sh.
#
# Usage:
#   ./scripts/restore-db.sh storage/backups/organic_20261023_020000.sql.gz
#   ./scripts/restore-db.sh latest   # restores the most recent backup
#
# Reads DATABASE_URL from the environment or .env.
# DESTRUCTIVE — drops and recreates the database. Prompts for confirmation
# unless FORCE=1 is set.
# ---------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/storage/backups"

# ── Resolve the backup file ─────────────────────────────────────────────────
TARGET="${1:-}"
if [[ -z "$TARGET" ]]; then
  echo "Usage: $0 <backup-file.sql.gz | latest>" >&2
  exit 1
fi

if [[ "$TARGET" == "latest" ]]; then
  TARGET="$(ls -1t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -1)"
  if [[ -z "$TARGET" ]]; then
    echo "[restore] ERROR: no backups found in $BACKUP_DIR" >&2
    exit 1
  fi
  echo "[restore] latest backup: $(basename "$TARGET")"
fi

if [[ ! -f "$TARGET" ]]; then
  echo "[restore] ERROR: file not found: $TARGET" >&2
  exit 1
fi

# ── Load DATABASE_URL ───────────────────────────────────────────────────────
if [[ -z "${DATABASE_URL:-}" ]]; then
  ENV_FILE="$PROJECT_DIR/.env"
  if [[ -f "$ENV_FILE" ]]; then
    DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | sed 's/^DATABASE_URL=//' | tr -d '"' | tr -d "'")"
  fi
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[restore] ERROR: DATABASE_URL not set and no .env found." >&2
  exit 1
fi

# ── Parse the MySQL URL ─────────────────────────────────────────────────────
rest="${DATABASE_URL#*://}"
userpass="${rest%%@*}"
DB_USER="${userpass%%:*}"
DB_PASS="${userpass#*:}"

hostportdb="${rest#*@}"
hostport="${hostportdb%%/*}"
DB_HOST="${hostport%%:*}"
DB_PORT="${hostport##*:}"

DB_NAME="${hostportdb#*/}"
DB_NAME="${DB_NAME%%\?*}"

if [[ -z "$DB_NAME" || -z "$DB_HOST" || -z "$DB_USER" ]]; then
  echo "[restore] ERROR: could not parse DATABASE_URL." >&2
  exit 1
fi

# ── Confirm ─────────────────────────────────────────────────────────────────
if [[ "${FORCE:-}" != "1" ]]; then
  echo ""
  echo "  ⚠️  This will DROP and recreate the '$DB_NAME' database on $DB_HOST:$DB_PORT."
  echo "  File: $(basename "$TARGET")"
  echo ""
  read -r -p "  Type the database name to confirm: " CONFIRM
  if [[ "$CONFIRM" != "$DB_NAME" ]]; then
    echo "[restore] aborted." >&2
    exit 1
  fi
fi

# ── Restore ─────────────────────────────────────────────────────────────────
echo "[restore] $(date -Iseconds) dropping and recreating $DB_NAME …"

export MYSQL_PWD="$DB_PASS"

mysql --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" \
  -e "DROP DATABASE IF EXISTS \`$DB_NAME\`; CREATE DATABASE \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo "[restore] $(date -Iseconds) importing $(basename "$TARGET") …"

gunzip -c "$TARGET" | mysql --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" "$DB_NAME"

echo "[restore] $(date -Iseconds) done — $DB_NAME restored from $(basename "$TARGET")"
echo ""
echo "  Next steps:"
echo "    1. npm run db:deploy      # re-apply any migrations newer than the backup"
echo "    2. pm2 reload organic-site"
