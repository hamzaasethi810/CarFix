import "server-only";
import { prisma } from "../db";

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


