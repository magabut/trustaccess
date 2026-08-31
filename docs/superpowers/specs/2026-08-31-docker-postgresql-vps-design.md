# TrustAccess Docker/PostgreSQL VPS Deployment Design

## Goal

Deploy TrustAccess on a VPS with Docker Compose so the application and its
database use reproducible runtimes and survive application restarts without
the native SQLite crash currently seen with `better-sqlite3`.

The deployment must support the real e.id verifier flow, preserve the existing
Next.js pages and API contracts, keep PostgreSQL private to the Docker network,
and provide a documented HTTPS and backup path for production use.

## Scope

### Included

- Replace the SQLite/better-sqlite3 persistence layer with PostgreSQL.
- Convert the existing SQL schema and database access used by application
  routes and services to PostgreSQL-compatible access.
- Add a production Dockerfile for the Next.js application using Node 22 LTS.
- Add Docker Compose services for `web`, `postgres`, and `caddy`.
- Add database readiness and application health checks.
- Add production environment documentation without committing secrets.
- Add an idempotent database migration/bootstrap path and retain a separate
  demo seed command for local or explicitly requested demo data.
- Document VPS deployment, HTTPS, upgrades, logs, and PostgreSQL backups.

### Excluded

- Changing the e.id API protocol or credentials.
- Replacing the existing application UI or authentication flow.
- Introducing an ORM; SQL remains the persistence interface.
- Kubernetes, cloud-managed databases, multi-region deployment, or horizontal
  scaling.
- Automatic database restore or destructive migration rollback.

## Architecture

```text
Internet
   |
   | HTTPS :443 / HTTP :80
   v
Caddy reverse proxy
   |
   | Docker network, web:3000
   v
Next.js production container
   |                         \
   | Docker network,          \ HTTPS e.id API
   | postgres:5432             \
   v                            v
PostgreSQL volume             e.id gateway
```

### Services

#### `web`

- Built from a multi-stage Dockerfile.
- Runs the Next.js production server with `NODE_ENV=production`.
- Uses Node.js 22 LTS.
- Receives `DATABASE_URL`, `SESSION_SECRET`, and e.id settings at runtime.
- Does not contain `.env` files or credentials in the image.
- Depends on PostgreSQL health, but application startup must still handle a
  transient database connection failure cleanly.
- Exposes port 3000 only to the Compose network, not to the public host.

#### `postgres`

- Uses PostgreSQL 16.
- Stores data in a named Docker volume.
- Publishes no host port by default.
- Uses a non-default database name, user, and password from the deployment
  environment.
- Has a `pg_isready` health check.

#### `caddy`

- Publishes ports 80 and 443.
- Proxies the configured domain to `web:3000`.
- Persists certificate state in a named volume.
- Obtains and renews Let's Encrypt certificates automatically.
- Is the only public entry point to the application.

## Configuration

The repository will include `.env.production.example` containing variable names
and safe placeholder values only. The real environment file will remain
outside version control with restrictive permissions.

Required production variables:

```env
POSTGRES_DB=trustaccess
POSTGRES_USER=trustaccess
POSTGRES_PASSWORD=<strong-random-password>
DATABASE_URL=postgresql://trustaccess:<password>@postgres:5432/trustaccess
SESSION_SECRET=<strong-random-secret>
EID_CLIENT_ID=<e.id-client-id>
EID_CLIENT_SECRET=<e.id-client-secret>
EID_VERIFIER_BASE_URL=https://gateway.e.id
EID_BASE_URL=https://api-wallet.e.id
EID_LOGIN_VERIFICATION_ID=<valid-verification-id>
EID_FAKE=0
DOMAIN=example.com
```

The Compose configuration must fail clearly when required production values
are missing. `SESSION_SECRET` must not fall back to the development default in
production.

## PostgreSQL Migration

### Schema

The current SQLite schema will be translated to PostgreSQL while preserving
table names, columns, constraints, and application semantics. SQLite-specific
syntax, pragmas, and `AUTOINCREMENT` behavior will be replaced with PostgreSQL
identity/sequence-compatible definitions.

The migration must create all application tables, indexes, foreign keys, and
checks in a deterministic order. It must be safe to run more than once using a
tracked migration or equivalent idempotent bootstrap mechanism.

### Database access

`src/lib/db.ts` will expose the existing application-level operations through a
PostgreSQL connection pool. The implementation must:

- use `DATABASE_URL`;
- reuse a process-level pool rather than opening a connection per query;
- release pooled connections correctly;
- preserve the existing `all`, `get`, and `run` call patterns where practical;
- use PostgreSQL parameter placeholders and result handling;
- support explicit transactions for multi-statement operations that must be
  atomic;
- return actionable errors without terminating the Node process.

The adapter must not silently recreate or reset production data when the
application starts.

### Seed data

The existing demo seed becomes an explicit operation, not an automatic web
startup action. It must be safe to run against a fresh database and must not
duplicate demo rows when run twice. Production deployment does not run demo
seed unless explicitly requested by an operator.

## Application Health

Add a lightweight health endpoint that returns success only when the web
process is alive and the database can answer a simple query. Docker Compose
will use it for the `web` health check. The endpoint must not expose secrets,
database details, or e.id credentials.

The login start and result routes must continue returning their current JSON
contract. External e.id failures must result in an HTTP error response with a
safe message; they must not crash the process. The real e.id mode remains the
production default and must use the configured valid verification ID.

## Docker and Operational Security

- Use a `.dockerignore` that excludes `.env*`, `.git`, `.next`, `node_modules`,
  local database files, logs, and development artifacts.
- Use a multi-stage build and copy only production runtime artifacts.
- Run the web process as a non-root user where supported by the Next.js image.
- Keep PostgreSQL and web ports private to the Compose network.
- Store the production environment file with mode `600`.
- Never log `EID_CLIENT_SECRET`, `SESSION_SECRET`, database passwords, or full
  authorization tokens.
- Pin major image versions and document the upgrade procedure.
- Configure restart policies for `web`, `postgres`, and `caddy`.

## VPS Deployment

The deployment documentation will cover:

1. Installing Docker Engine and the Compose plugin on an Ubuntu VPS.
2. Configuring DNS for the domain to point to the VPS.
3. Creating the production environment file securely.
4. Starting the stack with `docker compose up -d --build`.
5. Checking service health and viewing logs.
6. Verifying HTTPS and the login flow with a newly generated e.id QR.
7. Updating the application without deleting the PostgreSQL volume.
8. Rotating e.id credentials and session secrets.
9. Restoring from a PostgreSQL dump.

The documented commands must distinguish safe operations from destructive
operations. `docker compose down` must not remove the database volume, and
volume deletion must be explicitly marked destructive.

## Backups

Provide an operator command or script that runs `pg_dump` from the PostgreSQL
service and writes a timestamped dump to a host backup directory. Document a
cron/systemd timer example, retention guidance, and a restore command. Backup
files must not be committed and should have restrictive permissions.

## Verification

The implementation is complete only when all of the following pass:

- `npm test` passes.
- `npm run build` passes using the PostgreSQL implementation.
- `docker compose config` validates the Compose file.
- `docker compose build` completes without copying secrets.
- A fresh Compose stack starts with healthy `postgres` and `web` services.
- The health endpoint reports database connectivity.
- Database schema/bootstrap can run twice without duplicate schema errors.
- The application can create a user and session through the login result path.
- With `EID_FAKE=0`, login start returns a fresh real e.id wallet URL and
  valid session ID.
- After e.id approval, login result returns success and the dashboard loads.
- Restarting `web` preserves users and sessions stored in PostgreSQL.
- A PostgreSQL dump can be created and restored into a clean database.
- Caddy serves the configured domain over HTTPS.

## Risks and Decisions

- Existing data in the local SQLite database will not be migrated
  automatically in the first deployment. If needed, a separate export/import
  task must be performed after the PostgreSQL path is stable.
- Caddy requires the domain's DNS and VPS firewall ports 80/443 to be correct;
  certificate issuance cannot be verified fully without a real domain.
- The e.id verification ID is account/environment-specific and remains an
  operator-provided secret/configuration value, not a generated application
  default.
- Direct SQL is retained to minimize behavioral changes. A future ORM
  migration is outside this scope.
