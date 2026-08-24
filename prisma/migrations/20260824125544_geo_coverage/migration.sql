-- Tracks which areas have already been ingested from OpenStreetMap so repeated
-- searches in the same place do not re-hit the shared Overpass API.
CREATE TABLE "GeoCoverage" (
    "id" TEXT NOT NULL,
    "cellLat" DOUBLE PRECISION NOT NULL,
    "cellLng" DOUBLE PRECISION NOT NULL,
    "radiusMiles" INTEGER NOT NULL,
    "shopCount" INTEGER NOT NULL DEFAULT 0,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeoCoverage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GeoCoverage_cellLat_cellLng_key" ON "GeoCoverage"("cellLat", "cellLng");
