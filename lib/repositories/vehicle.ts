import "server-only";
import { prisma } from "../db";
import type { PhotoSlot } from "../generated/prisma/enums";

const vehicleDetail = {
  id: true,
  ownerId: true,
  year: true,
  mileage: true,
  nickname: true,
  createdAt: true,
  make: { select: { id: true, name: true } },
  model: { select: { id: true, name: true } },
  generation: { select: { id: true, code: true, platform: { select: { name: true } } } },
  trim: { select: { id: true, name: true } },
  engine: { select: { id: true, name: true } },
  drivetrain: { select: { id: true, name: true } },
  photos: { select: { slot: true, storageKey: true } },
  owner: { select: { profile: { select: { username: true, displayName: true } } } },
} as const;

export const findVehicleById = (id: string) =>
  prisma.vehicle.findFirst({ where: { id, deletedAt: null }, select: vehicleDetail });

export const listVehiclesForOwner = (ownerId: string) =>
  prisma.vehicle.findMany({
    where: { ownerId, deletedAt: null },
    select: vehicleDetail,
    orderBy: { createdAt: "desc" },
  });

export const listVehiclesForUsername = (username: string) =>
  prisma.vehicle.findMany({
    where: { deletedAt: null, owner: { profile: { username } } },
    select: vehicleDetail,
    orderBy: { createdAt: "desc" },
  });

export const createVehicle = (data: {
  ownerId: string;
  makeId: string;
  modelId: string;
  generationId: string;
  year: number;
  trimId?: string | null;
  engineId?: string | null;
  drivetrainId?: string | null;
  mileage?: number | null;
  nickname?: string | null;
}) => prisma.vehicle.create({ data, select: vehicleDetail });

// Ownership is part of the WHERE clause, so a mismatched owner updates zero rows
// instead of relying on a separate check that could be skipped.
export const updateVehicleOwnedBy = async (
  id: string,
  ownerId: string,
  data: {
    year?: number;
    generationId?: string;
    trimId?: string | null;
    engineId?: string | null;
    drivetrainId?: string | null;
    mileage?: number | null;
    nickname?: string | null;
  },
) => {
  const { count } = await prisma.vehicle.updateMany({
    where: { id, ownerId, deletedAt: null },
    data,
  });
  if (count === 0) return null;
  return findVehicleById(id);
};

export const softDeleteVehicleOwnedBy = async (id: string, ownerId: string) => {
  const { count } = await prisma.vehicle.updateMany({
    where: { id, ownerId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return count > 0;
};

export const vehicleBelongsTo = async (id: string, ownerId: string) =>
  Boolean(
    await prisma.vehicle.findFirst({
      where: { id, ownerId, deletedAt: null },
      select: { id: true },
    }),
  );

export const upsertVehiclePhoto = async (
  vehicleId: string,
  ownerId: string,
  slot: PhotoSlot,
  storageKey: string,
) => {
  const owned = await vehicleBelongsTo(vehicleId, ownerId);
  if (!owned) return null;

  const existing = await prisma.vehiclePhoto.findUnique({
    where: { vehicleId_slot: { vehicleId, slot } },
    select: { storageKey: true },
  });

  await prisma.vehiclePhoto.upsert({
    where: { vehicleId_slot: { vehicleId, slot } },
    create: { vehicleId, slot, storageKey },
    update: { storageKey },
  });

  return { replacedKey: existing?.storageKey ?? null };
};

export const deleteVehiclePhoto = async (vehicleId: string, ownerId: string, slot: PhotoSlot) => {
  const owned = await vehicleBelongsTo(vehicleId, ownerId);
  if (!owned) return null;

  const existing = await prisma.vehiclePhoto.findUnique({
    where: { vehicleId_slot: { vehicleId, slot } },
    select: { storageKey: true },
  });
  if (!existing) return { removedKey: null };

  await prisma.vehiclePhoto.delete({ where: { vehicleId_slot: { vehicleId, slot } } });
  return { removedKey: existing.storageKey };
};
