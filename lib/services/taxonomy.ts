import "server-only";
import {
  listDrivetrains,
  listEngines,
  listGenerations,
  listMakes,
  listModels,
  listServices,
  listServicesGrouped,
  listTrims,
  searchServices,
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
    // A shared platform is what lets facelift halves aggregate together.
    platformId: g.platform?.id ?? null,
    platform: g.platform?.name ?? null,
    years: `${g.yearStart}–${g.yearEnd ?? "present"}`,
  }));
}

/**
 * Suggestions for the service picker. An empty query returns the full grouped
 * list, so the field is useful before anyone types.
 */
export async function suggestServices(query: string, limit = 10) {
  const trimmed = query.trim();
  const rows = trimmed.length === 0 ? await listServicesGrouped() : await searchServices(trimmed, limit);
  return rows.map((s) => ({ id: s.id, name: s.name, category: s.category }));
}
