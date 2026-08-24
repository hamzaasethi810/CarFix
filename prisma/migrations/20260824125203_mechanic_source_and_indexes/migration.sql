-- Provenance for shop records so OpenStreetMap rows can be ingested on demand
-- and re-ingested idempotently, rather than the directory being hand-seeded.
CREATE TYPE "MechanicSource" AS ENUM ('SEED', 'OSM', 'USER');

ALTER TABLE "Mechanic"
  ADD COLUMN "source" "MechanicSource" NOT NULL DEFAULT 'SEED',
  ADD COLUMN "sourceRef" TEXT;

CREATE UNIQUE INDEX "Mechanic_source_sourceRef_key" ON "Mechanic"("source", "sourceRef");
CREATE INDEX "Mechanic_deletedAt_idx" ON "Mechanic"("deletedAt");

-- Resolving a model year to its generation is the hottest taxonomy query, and
-- platform lookups back the chassis-wide aggregation.
CREATE INDEX "Generation_modelId_yearStart_yearEnd_idx" ON "Generation"("modelId", "yearStart", "yearEnd");
CREATE INDEX "Generation_platformId_idx" ON "Generation"("platformId");
