#!/usr/bin/env bash
set -eu
umask 077
cd /opt/plane-hub
stamp=$(date -u +%Y%m%dT%H%M%SZ)
target=/opt/plane-hub/backups/$stamp
mkdir -p "$target"
docker compose --project-name plane-hub --env-file plane.env -f compose.yml -f compose.local.yml exec -T plane-db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" exec pg_dump -w -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$target/plane.dump"
docker run --rm --network none -v plane-hub_uploads:/source:ro -v "$target":/backup postgres:15.7-alpine tar -czf /backup/uploads.tar.gz -C /source .
cp plane.env compose.yml compose.local.yml "$target/"
printf 'Management backup: %s\n' "$target"
