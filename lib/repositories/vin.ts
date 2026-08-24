import "server-only";
import { prisma } from "../db";

/** Case-insensitive exact match, since vPIC returns "TOYOTA" and we store "Toyota". */
export const findMakeByName = (name: string) =>
  prisma.make.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true, name: true },
  });

export const findModelByName = (makeId: string, name: string) =>
  prisma.model.findFirst({
    where: { makeId, name: { equals: name, mode: "insensitive" } },
    select: { id: true, name: true },
  });

export const findEngineByName = (name: string) =>
  prisma.engine.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true, name: true },
  });

export const findDrivetrainByName = (name: string) =>
  prisma.drivetrain.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true, name: true },
  });

export const findTrimByName = (generationId: string, name: string) =>
  prisma.trim.findFirst({
    where: { generationId, name: { equals: name, mode: "insensitive" } },
    select: { id: true, name: true },
  });

/*
  A VIN can describe a car we have not curated yet. Rather than refuse it, the
  taxonomy grows from the decoded values — NHTSA is an authoritative source, so
  this is safe to trust for make and model names.
*/
export const ensureMake = (name: string) =>
  prisma.make.upsert({
    where: { name },
    create: { name },
    update: {},
    select: { id: true, name: true },
  });

export const ensureModel = (makeId: string, name: string) =>
  prisma.model.upsert({
    where: { makeId_name: { makeId, name } },
    create: { makeId, name },
    update: {},
    select: { id: true, name: true },
  });

export const ensureEngine = (name: string) =>
  prisma.engine.upsert({ where: { name }, create: { name }, update: {}, select: { id: true } });

export const ensureDrivetrain = (name: string) =>
  prisma.drivetrain.upsert({ where: { name }, create: { name }, update: {}, select: { id: true } });

/*
  Provisional generation for a model year no curated chassis code covers.

  It spans that single year, so data is never mis-attributed to the wrong
  chassis. Once a real generation is added to seed-data/vehicles.ts covering
  those years, new vehicles resolve to it instead.
*/
export const ensureProvisionalGeneration = (modelId: string, year: number) =>
  prisma.generation.upsert({
    where: { modelId_code: { modelId, code: String(year) } },
    create: { modelId, code: String(year), yearStart: year, yearEnd: year },
    update: {},
    select: { id: true, code: true },
  });
