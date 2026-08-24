-- Least-privilege database roles.
--
-- Run this ONCE per database, as a superuser, after the first migration.
--
--   psql -d carfix_dev -v app_password="'...'" -f prisma/roles.sql
--
-- Why: the application's runtime role should not be able to destroy the
-- database. Prisma parameterises everything, so injection is already
-- structurally prevented — this is the layer underneath that, so a future bug,
-- a dependency compromise, or a careless raw query cannot drop or truncate a
-- table even if it manages to execute SQL.
--
--   carfix_migrate  owns the schema. Runs migrations. Has DDL rights.
--   carfix_app      runtime only. SELECT/INSERT/UPDATE/DELETE and nothing else.
--
-- Note that TRUNCATE is deliberately NOT granted: it is a separate privilege
-- from DELETE, it bypasses row triggers, and the application never needs it
-- (deletions are soft, and tests use DELETE).

\set ON_ERROR_STOP on

-- 1. Migration owner -----------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carfix_migrate') THEN
    CREATE ROLE carfix_migrate LOGIN;
  END IF;
END
$$;

-- 2. Hand ownership of the schema and every existing object to the migrator.
ALTER SCHEMA public OWNER TO carfix_migrate;

DO $$
DECLARE obj record;
BEGIN
  FOR obj IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO carfix_migrate', obj.tablename);
  END LOOP;
  FOR obj IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER SEQUENCE public.%I OWNER TO carfix_migrate', obj.sequencename);
  END LOOP;
  FOR obj IN
    SELECT t.typname FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype = 'e'
  LOOP
    EXECUTE format('ALTER TYPE public.%I OWNER TO carfix_migrate', obj.typname);
  END LOOP;
END
$$;

-- 3. Strip the runtime role back to data access only ---------------------
ALTER ROLE carfix_app NOCREATEDB NOCREATEROLE NOSUPERUSER;

-- No CREATE on the schema means no new tables, and no ownership means no
-- DROP or ALTER of existing ones.
REVOKE ALL ON SCHEMA public FROM carfix_app;
GRANT USAGE ON SCHEMA public TO carfix_app;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM carfix_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO carfix_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO carfix_app;

-- 4. Same treatment for anything migrations create later ------------------
ALTER DEFAULT PRIVILEGES FOR ROLE carfix_migrate IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO carfix_app;
ALTER DEFAULT PRIVILEGES FOR ROLE carfix_migrate IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO carfix_app;

-- 5. The migrator needs its own database only in development, where Prisma
--    creates a shadow database to diff migrations against.
ALTER ROLE carfix_migrate CREATEDB;
