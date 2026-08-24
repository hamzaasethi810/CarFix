-- Vehicle photos are removed: they cost storage and database rows without
-- contributing to the pricing data the product exists to collect.
DROP TABLE IF EXISTS "VehiclePhoto";
DROP TYPE IF EXISTS "PhotoSlot";
