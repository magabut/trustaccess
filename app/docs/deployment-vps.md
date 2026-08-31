# TrustAccess VPS Deployment (Docker + PostgreSQL + Caddy)

This guide deploys TrustAccess with Docker Compose on a VPS.

## 1) Prerequisites

- Ubuntu VPS with DNS `A` record pointing your domain to the server.
- Docker Engine + Compose plugin installed.
- Ports 80 and 443 open in firewall/security group.

Install Docker (Ubuntu):

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## 2) Prepare Environment File

In `app/`:

```bash
cp .env.production.example .env.production
chmod 600 .env.production
```

Edit `.env.production` and set real values:

- `POSTGRES_PASSWORD`
- `SESSION_SECRET`
- `EID_CLIENT_ID`
- `EID_CLIENT_SECRET`
- `EID_LOGIN_VERIFICATION_ID` (must be valid)
- `DOMAIN`

Production should use `EID_FAKE=0`.

## 3) Start Stack

```bash
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production ps
```

Expected:
- `postgres` healthy
- `web` healthy
- `caddy` running

## 4) Health Check

```bash
curl -fsS "https://$DOMAIN/api/health"
```

Expected response:

```json
{"ok":true}
```

## 5) Logs and Operations

```bash
docker compose --env-file .env.production logs -f web
docker compose --env-file .env.production logs -f postgres
docker compose --env-file .env.production logs -f caddy
```

Update service after changes:

```bash
docker compose --env-file .env.production up -d --build
```

Safe stop (keeps database volume):

```bash
docker compose --env-file .env.production down
```

DESTRUCTIVE (deletes database data):

```bash
docker compose --env-file .env.production down -v
```

## 6) Backup PostgreSQL

Create backup (in `app/`):

```bash
chmod +x scripts/backup-postgres.sh
scripts/backup-postgres.sh ./backups
```

The script writes a timestamped custom-format dump and sets mode `600`.

### Suggested retention (example)

```bash
find ./backups -type f -name '*.dump' -mtime +14 -delete
```

### Cron example (daily 02:30)

```bash
30 2 * * * cd /opt/trustaccess/app && ./scripts/backup-postgres.sh ./backups && find ./backups -type f -name '*.dump' -mtime +14 -delete
```

## 7) Restore Example

Create restore target DB and restore dump:

```bash
docker compose --env-file .env.production exec -T postgres createdb -U "$POSTGRES_USER" restore_check
cat ./backups/<generated-file>.dump | docker compose --env-file .env.production exec -T postgres pg_restore -U "$POSTGRES_USER" -d restore_check
```

Drop temporary restore DB after verification:

```bash
docker compose --env-file .env.production exec -T postgres dropdb -U "$POSTGRES_USER" restore_check
```
