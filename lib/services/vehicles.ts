import "server-only";
import { forbidden, notFound, validation } from "../errors";
import { findGenerationForYear, listModels } from "../repositories/taxonomy";
import {
  createVehicle,
  findVehicleById,
  listVehiclesForOwner,
  softDeleteVehicleOwnedBy,
  updateVehicleOwnedBy,
} from "../repositories/vehicle";
import { toVehicleSummary } from "./dto";

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


