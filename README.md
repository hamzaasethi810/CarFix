# CarFix

A community platform for car enthusiasts. Owners record what a shop actually charged to work on
their specific car, and other owners of the same generation can see real prices before they book.

The product answers one question: **"I own this car. Which local mechanics have worked on cars like
mine, what did owners pay, and how was their experience?"**

---

## Architecture

The browser never talks to the database, object storage, or any credential. Every request crosses a
single server-side trust boundary and is re-authorized there.

```
Browser (React / Next.js)
        │
        ▼
API route handlers      app/api/**        authentication · authorization · Zod validation
        │
        ▼
Service layer           lib/services/**   business rules · response DTOs
        │
        ▼
Repository layer        lib/repositories/**   the only place Prisma is imported
        │
   ┌────┴─────┐
   ▼          ▼
PostgreSQL   Private object storage
```

**The boundary is enforced by lint, not convention.** `eslint.config.mjs` fails the build if a page,
component, or route handler imports Prisma, a repository, server env, or the storage client. Try it:
add `import { prisma } from "@/lib/db"` to any page and run `npm run lint`.

| Layer | Location | May import |
|---|---|---|
| Pages / components | `app/**`, `components/**` | services only |
| Route handlers | `app/api/**` | services only |
| Services | `lib/services/**` | repositories, storage |
| Repositories | `lib/repositories/**` | `lib/db` (Prisma) |

### Security properties

- **Identity comes from the session, never the request.** No endpoint accepts a `userId`, `role`, or
  `verificationStatus` from the client — every Zod schema is `.strict()`, so an injected field is a
  400 rather than a silent privilege escalation.
- **Ownership is part of the query.** `updateVehicleOwnedBy` and friends put `ownerId` in the `WHERE`
  clause, so a mismatched caller updates zero rows instead of relying on a check that could be
  skipped.
- **Responses are built by explicit DTOs** (`lib/services/dto.ts`). ORM objects are never returned,
  so password hashes, storage keys, and private emails cannot leak by accident.
- **Both buckets are private.** Images are served through `/api/media/**`, which resolves the key
  server-side and redirects to a short-lived signed URL.
- **Receipts are destroyed on decision.** See below.
- **Admin actions are audited.** Verification decisions and receipt views both write an `AuditLog`
  row inside the same transaction as the change.

### Receipt lifecycle

Receipts can contain names, addresses, VINs, plates, and payment details, so they are treated as
sensitive and kept for the minimum time needed:

1. The owner optionally uploads a receipt. Ownership is checked **before** anything is written, so an
   unauthorized upload never lands in the bucket.
2. Content is validated by magic bytes, not by filename or declared MIME type, and stored in a
   private bucket under a random UUID key.
3. The experience moves to `PENDING`. Users cannot set their own verification state.
4. An admin opens a **120-second** signed URL to review it. That view is audited.
5. On approve or reject, the object is **deleted from storage** and its key is nulled, in the same
   transaction that records the outcome.

Only `verificationStatus`, `verificationMethod`, and `verifiedAt` survive. The public sees a badge.

### Pricing

Statistics are computed in Postgres (`PERCENTILE_CONT`), never by loading rows into the browser. The
UI leads with the **median** and always shows the sample size — "Based on 23 reported experiences",
never "this repair costs $1,050".

---

## Running locally

Requires Node 20+ and PostgreSQL.

```bash
npm install
cp .env.example .env          # then fill in the values
npm run db:migrate            # create the schema
npm run db:seed               # makes, models, generations, services, sample shops
npm run dev
```

### Database

Create a dedicated database and a non-superuser role:

```sql
CREATE DATABASE carfix_dev;
CREATE ROLE carfix_app LOGIN PASSWORD 'choose-a-password';
\c carfix_dev
GRANT ALL ON SCHEMA public TO carfix_app;
ALTER SCHEMA public OWNER TO carfix_app;
```

> Prisma needs `CREATEDB` for its shadow database during `migrate dev`. Grant it in development
> only. In production, run `npm run db:deploy` as a separate migration role and leave the
> application's runtime role without schema-modification rights.

### Object storage

Any S3-compatible service works. Locally, MinIO:

```bash
brew install minio
MINIO_ROOT_USER=dev-access-key MINIO_ROOT_PASSWORD=dev-secret-key \
  minio server --address :9000 --console-address :9001 ./minio-data
```

Create `carfix-photos` and `carfix-receipts`. **Both must be private.** Never make the receipts
bucket public.

### Rate limiting

Leave the Upstash variables blank in development and rate limiting is skipped. Set them in
production — registration, login, submissions, uploads, and search are all limited.

---

## Deploying free

| Concern | Free option | Portable to |
|---|---|---|
| Hosting | Vercel Hobby | any Node host |
| Database | Neon | self-hosted Postgres (`DATABASE_URL` only) |
| Storage | Cloudflare R2 | MinIO or AWS S3 (`S3_ENDPOINT` only) |
| Rate limiting | Upstash Redis | self-hosted Redis via `lib/rate-limit.ts` |

Nothing is tied to a proprietary SDK — storage goes through `@aws-sdk/client-s3` and the database
through a standard `DATABASE_URL`, so self-hosting later is a config change, not a rewrite.

1. Create a Neon project and copy its connection string.
2. Create two **private** R2 buckets and an API token.
3. Create an Upstash Redis database.
4. Import the repo into Vercel and add every variable from `.env.example` as an environment
   variable. Generate `AUTH_SECRET` with `openssl rand -base64 32`.
5. Run `npm run db:deploy` and `npm run db:seed` against the production database.

Never expose any of these to the client. There are no `NEXT_PUBLIC_` secrets.

### Making an admin

There is deliberately no self-service path to the admin role:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';
```

The session revalidates against the database on every request, so the change takes effect on the
user's next request — and revoking it is equally immediate.

---

## Testing

```bash
npm test
```

43 tests cover the security-critical behavior: cross-user vehicle and experience access, admin-only
endpoints, self-verification attempts, rating and price bounds, upload content-sniffing, receipt
destruction on decision, audit logging, and generation-level aggregation.

---

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | development server |
| `npm run build` | production build |
| `npm test` | test suite |
| `npm run lint` | lint, including the architecture boundary rules |
| `npm run db:migrate` | create and apply a migration (development) |
| `npm run db:deploy` | apply migrations (production) |
| `npm run db:seed` | seed taxonomy, services, and sample mechanics |

---

## Scope

**Built:** accounts and profiles, vehicle garages with derived generations and three photo slots
(front, back, interior), a mechanic directory with geo search, structured experiences with prices and
six rating dimensions, receipt verification, pricing analytics, reporting, and an admin queue.

**Deliberately not built, but designed for:** maintenance and modification history ("enthusiast
Carfax"), a marketplace, community discussions, and premium analytics. The schema keeps vehicle
taxonomy normalized and relationships explicit so these can be added without redesigning the core.

---

## Database security

The database is PostgreSQL. On a Homebrew macOS install the cluster lives at
`/opt/homebrew/var/postgresql@18`, listens on `localhost:5432` only, and each
environment is a separate database (`carfix_dev`, `carfix_test`).

### Two roles, deliberately

| Role | Used by | Can |
|---|---|---|
| `carfix_migrate` | migrations only | own the schema, DDL |
| `carfix_app` | the running app | `SELECT` / `INSERT` / `UPDATE` / `DELETE` |

`carfix_app` cannot `DROP`, `TRUNCATE`, `ALTER`, `CREATE`, or escalate itself.
`TRUNCATE` is withheld specifically: it is a separate privilege from `DELETE`,
it bypasses row triggers, and the app never needs it.

Apply with `psql -d <db> -f prisma/roles.sql`, then verify:

```bash
./scripts/db-security-check.sh
```

That script is the regression test for the privilege model — re-run it after any
migration that adds tables, since new tables inherit grants through
`ALTER DEFAULT PRIVILEGES` and this proves it actually happened.

### Injection

Every query is parameterised, including the raw-SQL search and pricing
aggregates, which use tagged `Prisma.sql` templates. Verified at the wire
protocol by logging what Postgres receives: a payload of
`'; DROP TABLE "Mechanic"; --` arrives as a single bound value in `$1`, never as
SQL, and no destructive statement executes. Injection is prevented
structurally, not by filtering.

### Known local-development weakness

Homebrew ships `pg_hba.conf` with `trust` authentication, so any local user can
connect as any role without a password. That is fine for a laptop on
`localhost`, but a production cluster must use `scram-sha-256` and require TLS
(`?sslmode=require` on both connection strings). Managed Postgres such as Neon
does both by default.

---

## Applying the database role split

The application's runtime role must not be able to destroy the database. Run
this once per environment, as a superuser.

**1. Create the roles and move ownership**

```bash
psql -d carfix_prod -f prisma/roles.sql
```

That gives `carfix_migrate` ownership of the schema and strips `carfix_app`
back to `SELECT` / `INSERT` / `UPDATE` / `DELETE`.

**2. Set passwords** (skip on managed Postgres that issues its own):

```sql
ALTER ROLE carfix_app     PASSWORD 'a-long-random-string';
ALTER ROLE carfix_migrate PASSWORD 'a-different-long-random-string';
```

**3. Point the app and the migrator at different roles**

```bash
# The app's environment — this is the only one the running app ever sees.
DATABASE_URL="postgresql://carfix_app:...@host:5432/carfix_prod?sslmode=require"

# Migrations only. Keep this OUT of the app's environment; supply it in CI or
# at the shell when running npm run db:deploy.
MIGRATE_DATABASE_URL="postgresql://carfix_migrate:...@host:5432/carfix_prod?sslmode=require"
```

**4. Prove it worked**

```bash
./scripts/db-security-check.sh
```

Thirteen assertions: nine destructive statements must be refused, four data
operations must succeed. Re-run it after any migration that adds tables — new
tables inherit grants through `ALTER DEFAULT PRIVILEGES`, and this confirms it
actually happened.

**On a managed provider (Neon, RDS, Supabase)** the bootstrap role is usually
not a true superuser. Run `roles.sql` as the database owner instead; every
statement in it is within an owner's rights. `sslmode=require` is already the
default on those providers — keep it.

**Also change from the Homebrew default:** local installs ship `pg_hba.conf`
with `trust`, meaning any local user can connect as any role without a
password. Production must use `scram-sha-256` and require TLS.
