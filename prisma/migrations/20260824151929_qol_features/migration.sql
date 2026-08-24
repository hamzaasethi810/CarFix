-- Helpful votes, shop replies, saved searches, and photos of the work.

CREATE TABLE "HelpfulVote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HelpfulVote_pkey" PRIMARY KEY ("id")
);
-- One vote per person per report, enforced here rather than trusted from the client.
CREATE UNIQUE INDEX "HelpfulVote_userId_experienceId_key" ON "HelpfulVote"("userId", "experienceId");
CREATE INDEX "HelpfulVote_experienceId_idx" ON "HelpfulVote"("experienceId");
ALTER TABLE "HelpfulVote" ADD CONSTRAINT "HelpfulVote_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HelpfulVote" ADD CONSTRAINT "HelpfulVote_experienceId_fkey"
  FOREIGN KEY ("experienceId") REFERENCES "MechanicExperience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ShopReply" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "mechanicId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "ShopReply_pkey" PRIMARY KEY ("id")
);
-- One reply per report, so a thread cannot be buried under repeats.
CREATE UNIQUE INDEX "ShopReply_experienceId_key" ON "ShopReply"("experienceId");
CREATE INDEX "ShopReply_mechanicId_idx" ON "ShopReply"("mechanicId");
ALTER TABLE "ShopReply" ADD CONSTRAINT "ShopReply_experienceId_fkey"
  FOREIGN KEY ("experienceId") REFERENCES "MechanicExperience"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopReply" ADD CONSTRAINT "ShopReply_mechanicId_fkey"
  FOREIGN KEY ("mechanicId") REFERENCES "Mechanic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopReply" ADD CONSTRAINT "ShopReply_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "serviceId" TEXT,
    "generationId" TEXT,
    "platformId" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "radiusMiles" INTEGER,
    "lastNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SavedSearch_userId_idx" ON "SavedSearch"("userId");
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WorkPhoto" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkPhoto_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WorkPhoto_experienceId_idx" ON "WorkPhoto"("experienceId");
ALTER TABLE "WorkPhoto" ADD CONSTRAINT "WorkPhoto_experienceId_fkey"
  FOREIGN KEY ("experienceId") REFERENCES "MechanicExperience"("id") ON DELETE CASCADE ON UPDATE CASCADE;
