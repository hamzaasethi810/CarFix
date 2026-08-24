-- A role that can review receipts and business documents without being able to
-- grant administrator rights or moderate reports.
ALTER TYPE "Role" ADD VALUE 'REVIEWER' BEFORE 'ADMIN';
