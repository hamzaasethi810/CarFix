-- Shop ownership, subscriptions, published pricing, and webhook replay safety.

CREATE TYPE "ShopClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "SubscriptionStatus" AS ENUM ('NONE', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- Services gain a category so the picker stays navigable as the list grows.
ALTER TABLE "Service" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'Other';
CREATE INDEX "Service_category_idx" ON "Service"("category");

ALTER TABLE "Mechanic"
  ADD COLUMN "claimedById" TEXT,
  ADD COLUMN "claimedAt" TIMESTAMP(3),
  ADD COLUMN "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "stripeCustomerId" TEXT,
  ADD COLUMN "stripeSubscriptionId" TEXT,
  ADD COLUMN "subscriptionEndsAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Mechanic_stripeCustomerId_key" ON "Mechanic"("stripeCustomerId");
CREATE UNIQUE INDEX "Mechanic_stripeSubscriptionId_key" ON "Mechanic"("stripeSubscriptionId");
CREATE INDEX "Mechanic_subscriptionStatus_idx" ON "Mechanic"("subscriptionStatus");

ALTER TABLE "Mechanic"
  ADD CONSTRAINT "Mechanic_claimedById_fkey"
  FOREIGN KEY ("claimedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ShopClaim" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mechanicId" TEXT NOT NULL,
    "status" "ShopClaimStatus" NOT NULL DEFAULT 'PENDING',
    "documentKey" TEXT,
    "businessName" TEXT NOT NULL,
    "contactPhone" TEXT,
    "note" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    CONSTRAINT "ShopClaim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopClaim_userId_mechanicId_key" ON "ShopClaim"("userId", "mechanicId");
CREATE INDEX "ShopClaim_status_idx" ON "ShopClaim"("status");

ALTER TABLE "ShopClaim" ADD CONSTRAINT "ShopClaim_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopClaim" ADD CONSTRAINT "ShopClaim_mechanicId_fkey"
  FOREIGN KEY ("mechanicId") REFERENCES "Mechanic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopClaim" ADD CONSTRAINT "ShopClaim_decidedById_fkey"
  FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ShopServicePrice" (
    "id" TEXT NOT NULL,
    "mechanicId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "minPrice" DOUBLE PRECISION NOT NULL,
    "maxPrice" DOUBLE PRECISION,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShopServicePrice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopServicePrice_mechanicId_serviceId_key" ON "ShopServicePrice"("mechanicId", "serviceId");
CREATE INDEX "ShopServicePrice_serviceId_idx" ON "ShopServicePrice"("serviceId");

ALTER TABLE "ShopServicePrice" ADD CONSTRAINT "ShopServicePrice_mechanicId_fkey"
  FOREIGN KEY ("mechanicId") REFERENCES "Mechanic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopServicePrice" ADD CONSTRAINT "ShopServicePrice_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Stripe retries deliveries, so handling is keyed on the event id.
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);
