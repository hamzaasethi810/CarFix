import "server-only";
import { validation } from "../errors";
import { hasValidCheckDigit, isWellFormedVin, normalizeVin } from "../vin";
import { decodeVin } from "../providers/vpic";
import { findGenerationForYear } from "../repositories/taxonomy";
import {
  ensureDrivetrain,
  ensureEngine,
  ensureMake,
  ensureModel,
  ensureProvisionalGeneration,
  findDrivetrainByName,
  findEngineByName,
  findMakeByName,
  findModelByName,
  findTrimByName,
} from "../repositories/vin";

export type VinLookup = {
  vin: string;
  /** Ready to submit straight to POST /api/vehicles. */
  prefill: {
    makeId: string;
    modelId: string;
    year: number;
    trimId: string | null;
    engineId: string | null;
    drivetrainId: string | null;
  };
  /** Human-readable for confirmation before saving. */
  summary: {
    make: string;
    model: string;
    year: number;
    generation: string;
    trim: string | null;
    engine: string | null;
    drivetrain: string | null;
  };
  warnings: string[];
};

export async function lookupVin(raw: string): Promise<VinLookup> {
  const vin = normalizeVin(raw);
  if (!isWellFormedVin(vin))
    throw validation("A VIN is 17 characters and cannot contain I, O, or Q.");

  const warnings: string[] = [];
  // Cars built outside North America often omit a valid check digit, so this
  // is surfaced rather than enforced.
  if (!hasValidCheckDigit(vin))
    warnings.push("That VIN's check digit does not match. Confirm the details below.");

  const decoded = await decodeVin(vin);

  if (!decoded.make || !decoded.model || !decoded.year)
    throw validation("That VIN did not return enough detail to identify the car.");

  if (decoded.errorText && !decoded.errorText.startsWith("0")) {
    warnings.push("The VIN database flagged this VIN as incomplete.");
  }

  // Prefer what we already curate; fall back to creating from the decode so an
  // uncurated car is still addable.
  const make =
    (await findMakeByName(decoded.make)) ?? (await ensureMake(titleCase(decoded.make)));
  const model =
    (await findModelByName(make.id, decoded.model)) ??
    (await ensureModel(make.id, titleCase(decoded.model)));

  const curated = await findGenerationForYear(model.id, decoded.year);
  const generation = curated ?? (await ensureProvisionalGeneration(model.id, decoded.year));
  if (!curated)
    warnings.push(
      `We don't have a chassis generation on record for a ${decoded.year} ${make.name} ${model.name} yet, so this is filed under its model year.`,
    );

  const [trim, engine, drivetrain] = await Promise.all([
    decoded.trim ? findTrimByName(generation.id, decoded.trim) : null,
    decoded.engine
      ? (findEngineByName(decoded.engine).then((e) => e ?? ensureEngine(decoded.engine!)))
      : null,
    decoded.drivetrain
      ? findDrivetrainByName(decoded.drivetrain).then((d) => d ?? ensureDrivetrain(decoded.drivetrain!))
      : null,
  ]);

  return {
    vin,
    prefill: {
      makeId: make.id,
      modelId: model.id,
      year: decoded.year,
      trimId: trim?.id ?? null,
      engineId: engine?.id ?? null,
      drivetrainId: drivetrain?.id ?? null,
    },
    summary: {
      make: make.name,
      model: model.name,
      year: decoded.year,
      generation: generation.code,
      trim: trim?.name ?? decoded.trim,
      engine: decoded.engine,
      drivetrain: decoded.drivetrain,
    },
    warnings,
  };
}

const titleCase = (s: string) =>
  s
    .toLowerCase()
    .split(/(\s|-)/)
    .map((part) => (/[a-z]/.test(part) ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join("");
