import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";
import { env } from "./env";
import { withStrictSsl } from "./db-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: withStrictSsl(env.DATABASE_URL) }),
  });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
