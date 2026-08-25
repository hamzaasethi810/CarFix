-- Where a shop is, beyond the town name. Existing rows all came from a US-only
-- ingest, so US is the honest backfill rather than a guess.
ALTER TABLE "Mechanic" ADD COLUMN "country" TEXT NOT NULL DEFAULT 'US';

-- Searching "shops in Berlin" should not need to scan every row.
CREATE INDEX "Mechanic_country_idx" ON "Mechanic"("country");
