import "server-only";
import { prisma } from "../db";

export const listMakes = () =>
  prisma.make.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });

export const listModels = (makeId: string) =>
  prisma.model.findMany({
    where: { makeId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

export const listGenerations = (modelId: string) =>
  prisma.generation.findMany({
    where: { modelId },
    select: {
      id: true,
      code: true,
      yearStart: true,
      yearEnd: true,
      platform: { select: { name: true } },
    },
    orderBy: { yearStart: "desc" },
  });

export const listTrims = (generationId: string) =>
  prisma.trim.findMany({
    where: { generationId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

export const listEngines = () =>
  prisma.engine.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });

export const listDrivetrains = () =>
  prisma.drivetrain.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });

export const listServices = () =>
  prisma.service.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });

// A year is only valid for a generation that actually spans it; the generation
// is derived here rather than trusted from the client.
export const findGenerationForYear = (modelId: string, year: number) =>
  prisma.generation.findFirst({
    where: {
      modelId,
      yearStart: { lte: year },
      OR: [{ yearEnd: null }, { yearEnd: { gte: year } }],
    },
    select: { id: true, code: true, modelId: true },
  });

export const findGenerationById = (id: string) =>
  prisma.generation.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      yearStart: true,
      yearEnd: true,
      model: { select: { id: true, name: true, make: { select: { id: true, name: true } } } },
    },
  });

export const serviceExists = async (id: string) =>
  Boolean(await prisma.service.findUnique({ where: { id }, select: { id: true } }));
