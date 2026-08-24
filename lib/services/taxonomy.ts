import "server-only";
import {
  listDrivetrains,
  listEngines,
  listGenerations,
  listMakes,
  listModels,
  listServices,
  listTrims,
} from "../repositories/taxonomy";

export const getMakes = () => listMakes();
export const getModels = (makeId: string) => listModels(makeId);
export const getTrims = (generationId: string) => listTrims(generationId);
export const getEngines = () => listEngines();
export const getDrivetrains = () => listDrivetrains();
export const getServices = () => listServices();

export async function getGenerations(modelId: string) {
  const rows = await listGenerations(modelId);
  return rows.map((g) => ({
    id: g.id,
    code: g.code,
    yearStart: g.yearStart,
    yearEnd: g.yearEnd,
    platform: g.platform?.name ?? null,
  }));
}
