-- Listings added by the public start provisional: visible but labelled, and
-- barred from the gold badge until corroborated.
CREATE TYPE "ListingStatus" AS ENUM ('PROVISIONAL', 'CONFIRMED', 'REJECTED');

ALTER TABLE "Mechanic"
  ADD COLUMN "listingStatus" "ListingStatus" NOT NULL DEFAULT 'CONFIRMED',
  ADD COLUMN "submittedById" TEXT,
  ADD COLUMN "submittedAt" TIMESTAMP(3);

CREATE INDEX "Mechanic_listingStatus_idx" ON "Mechanic"("listingStatus");

ALTER TABLE "Mechanic" ADD CONSTRAINT "Mechanic_submittedById_fkey"
  FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
