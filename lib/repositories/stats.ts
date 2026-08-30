import "server-only";
import { prisma } from "../db";

/*
  Counts for the landing page's proof panel.

  Three COUNT queries rather than one aggregate: they are over unrelated
  tables, so there is nothing to join, and Postgres answers each from its own
  index. The caller caches the result.
*/
export const countReportedServices = () => prisma.mechanicExperience.count();
export const countShops = () => prisma.mechanic.count();
export const countGenerations = () => prisma.generation.count();
