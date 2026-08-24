-- Second factor. The TOTP secret is stored encrypted (AES-256-GCM) and backup
-- codes are stored hashed, so a database dump yields nothing usable.
ALTER TABLE "User"
  ADD COLUMN "totpSecret" TEXT,
  ADD COLUMN "totpEnabledAt" TIMESTAMP(3),
  ADD COLUMN "totpLastUsedAt" TIMESTAMP(3);

CREATE TABLE "BackupCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BackupCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BackupCode_userId_usedAt_idx" ON "BackupCode"("userId", "usedAt");

ALTER TABLE "BackupCode" ADD CONSTRAINT "BackupCode_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
