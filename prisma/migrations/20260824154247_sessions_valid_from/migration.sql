-- Sessions issued before this instant are refused. Bumped when a role changes,
-- so a promotion forces a fresh login rather than upgrading an open tab.
ALTER TABLE "User" ADD COLUMN "sessionsValidFrom" TIMESTAMP(3);
