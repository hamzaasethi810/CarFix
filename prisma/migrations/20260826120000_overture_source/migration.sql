-- Imported shops get their own source so a bad import can be identified and
-- removed without touching anything a person contributed.
ALTER TYPE "MechanicSource" ADD VALUE IF NOT EXISTS 'OVERTURE';
