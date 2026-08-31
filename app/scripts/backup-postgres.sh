#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <output-directory>" >&2
  exit 1
fi

out_dir="$1"
mkdir -p "$out_dir"

if [ ! -f ".env.production" ]; then
  echo "ERROR: .env.production not found in current directory" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
. ./.env.production
set +a

: "${POSTGRES_DB:?POSTGRES_DB is required in .env.production}"
: "${POSTGRES_USER:?POSTGRES_USER is required in .env.production}"

timestamp="$(date +%Y%m%d-%H%M%S)"
dump_path="$out_dir/postgres-${POSTGRES_DB}-${timestamp}.dump"

docker compose --env-file .env.production exec -T postgres pg_dump \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -F c > "$dump_path"

chmod 600 "$dump_path"
echo "Backup written: $dump_path"
