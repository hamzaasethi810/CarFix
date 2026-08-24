import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { DRIVETRAINS, ENGINES, MAKES, SERVICES } from "./seed-data/vehicles";
import { MECHANICS } from "./seed-data/mechanics";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

/*
  Every write is an upsert keyed on a natural unique constraint, so this can be
  re-run after adding entries to seed-data/* without disturbing existing rows
  or the experiences attached to them.
*/
async function main() {
  for (const { name, category } of SERVICES) {
    await prisma.service.upsert({
      where: { name },
      create: { name, category },
      update: { category },
    });
  }
  for (const name of ENGINES) {
    await prisma.engine.upsert({ where: { name }, create: { name }, update: {} });
  }
  for (const name of DRIVETRAINS) {
    await prisma.drivetrain.upsert({ where: { name }, create: { name }, update: {} });
  }

  let generations = 0;
  let trims = 0;

  for (const makeSpec of MAKES) {
    const make = await prisma.make.upsert({
      where: { name: makeSpec.name },
      create: { name: makeSpec.name },
      update: {},
    });

    for (const modelSpec of makeSpec.models) {
      const model = await prisma.model.upsert({
        where: { makeId_name: { makeId: make.id, name: modelSpec.name } },
        create: { makeId: make.id, name: modelSpec.name },
        update: {},
      });

      for (const gen of modelSpec.generations) {
        // A platform is namespaced by make so BMW's "Mk7" could never collide
        // with Volkswagen's.
        const platformName = gen.platform ? `${makeSpec.name} ${gen.platform}` : null;
        const platform = platformName
          ? await prisma.platform.upsert({
              where: { name: platformName },
              create: { name: platformName },
              update: {},
            })
          : null;

        const generation = await prisma.generation.upsert({
          where: { modelId_code: { modelId: model.id, code: gen.code } },
          create: {
            modelId: model.id,
            code: gen.code,
            yearStart: gen.from,
            yearEnd: gen.to,
            platformId: platform?.id ?? null,
          },
          update: {
            yearStart: gen.from,
            yearEnd: gen.to,
            platformId: platform?.id ?? null,
          },
        });
        generations += 1;

        for (const trim of gen.trims ?? []) {
          await prisma.trim.upsert({
            where: { generationId_name: { generationId: generation.id, name: trim } },
            create: { generationId: generation.id, name: trim },
            update: {},
          });
          trims += 1;
        }
      }
    }
  }

  for (const shop of MECHANICS) {
    const { specialties, ...data } = shop;
    const existing = await prisma.mechanic.findFirst({
      where: { name: data.name, city: data.city },
      select: { id: true },
    });

    const mechanic = existing
      ? await prisma.mechanic.update({ where: { id: existing.id }, data, select: { id: true } })
      : await prisma.mechanic.create({ data, select: { id: true } });

    for (const serviceName of specialties) {
      const service = await prisma.service.findUnique({
        where: { name: serviceName },
        select: { id: true },
      });
      if (!service) {
        console.warn(`  ! unknown service "${serviceName}" on ${data.name}`);
        continue;
      }
      await prisma.mechanicSpecialty.upsert({
        where: { mechanicId_serviceId: { mechanicId: mechanic.id, serviceId: service.id } },
        create: { mechanicId: mechanic.id, serviceId: service.id },
        update: {},
      });
    }
  }

  const models = MAKES.reduce((n, m) => n + m.models.length, 0);
  console.log(
    `Seed complete: ${MAKES.length} makes, ${models} models, ${generations} generations, ` +
      `${trims} trims, ${MECHANICS.length} mechanics, ${SERVICES.length} services.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
