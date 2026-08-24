import "server-only";
import { forbidden, notFound, validation } from "../errors";
import { findGenerationForYear, listModels } from "../repositories/taxonomy";
import {
  createVehicle,
  deleteVehiclePhoto,
  findVehicleById,
  listVehiclesForOwner,
  softDeleteVehicleOwnedBy,
  updateVehicleOwnedBy,
  upsertVehiclePhoto,
} from "../repositories/vehicle";
import { deleteObject, putObject } from "../storage/objects";
import { inspectImage, randomKey } from "../storage/files";
import { toVehicleSummary } from "./dto";
import type { PhotoSlot } from "../generated/prisma/enums";

// The generation is derived from make/model/year rather than accepted from the
// client, which is what keeps generation-level aggregation trustworthy.
async function resolveGeneration(makeId: string, modelId: string, year: number) {
  const models = await listModels(makeId);
  if (!models.some((m) => m.id === modelId))
    throw validation("That model does not belong to the selected make.");

  const generation = await findGenerationForYear(modelId, year);
  if (!generation) throw validation("We do not have a generation on record for that model year.");
  return generation;
}

export async function addVehicle(
  ownerId: string,
  input: {
    makeId: string;
    modelId: string;
    year: number;
    trimId?: string | null;
    engineId?: string | null;
    drivetrainId?: string | null;
    mileage?: number | null;
    nickname?: string | null;
  },
) {
  const generation = await resolveGeneration(input.makeId, input.modelId, input.year);
  const vehicle = await createVehicle({ ...input, ownerId, generationId: generation.id });
  return toVehicleSummary(vehicle, ownerId);
}

export async function getVehicle(id: string, viewerId?: string) {
  const vehicle = await findVehicleById(id);
  if (!vehicle) throw notFound();
  return toVehicleSummary(vehicle, viewerId);
}

export async function getGarage(ownerId: string) {
  const vehicles = await listVehiclesForOwner(ownerId);
  return vehicles.map((v) => toVehicleSummary(v, ownerId));
}

export async function editVehicle(
  id: string,
  ownerId: string,
  input: {
    makeId?: string;
    modelId?: string;
    year?: number;
    trimId?: string | null;
    engineId?: string | null;
    drivetrainId?: string | null;
    mileage?: number | null;
    nickname?: string | null;
  },
) {
  const existing = await findVehicleById(id);
  if (!existing) throw notFound();
  if (existing.ownerId !== ownerId) throw forbidden();

  const makeId = input.makeId ?? existing.make.id;
  const modelId = input.modelId ?? existing.model.id;
  const year = input.year ?? existing.year;

  const generationId =
    input.makeId || input.modelId || input.year
      ? (await resolveGeneration(makeId, modelId, year)).id
      : undefined;

  const updated = await updateVehicleOwnedBy(id, ownerId, {
    year: input.year,
    generationId,
    trimId: input.trimId,
    engineId: input.engineId,
    drivetrainId: input.drivetrainId,
    mileage: input.mileage,
    nickname: input.nickname,
  });
  if (!updated) throw forbidden();
  return toVehicleSummary(updated, ownerId);
}

export async function removeVehicle(id: string, ownerId: string) {
  const ok = await softDeleteVehicleOwnedBy(id, ownerId);
  if (!ok) throw notFound();
}

export async function setVehiclePhoto(
  vehicleId: string,
  ownerId: string,
  slot: PhotoSlot,
  file: File,
) {
  const { bytes, mime, ext } = await inspectImage(file);
  const key = randomKey(`vehicles/${vehicleId}`, ext);
  await putObject("photos", key, bytes, mime);

  const result = await upsertVehiclePhoto(vehicleId, ownerId, slot, key);
  if (!result) {
    await deleteObject("photos", key);
    throw forbidden();
  }

  if (result.replacedKey) await deleteObject("photos", result.replacedKey);
  return { slot };
}

export async function removeVehiclePhoto(vehicleId: string, ownerId: string, slot: PhotoSlot) {
  const result = await deleteVehiclePhoto(vehicleId, ownerId, slot);
  if (!result) throw forbidden();
  if (result.removedKey) await deleteObject("photos", result.removedKey);
}
