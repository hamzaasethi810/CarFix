import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { DRIVETRAINS, ENGINES, MAKES, SERVICES } from "./seed-data/vehicles";

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

  /*
    No shops are seeded.

    Shops come from OpenStreetMap the first time somebody searches an area, so
    seeding a fixed set would put a handful of invented places on the map for
    everybody regardless of where they are — and quietly occupy the database
    with rows nobody asked for. The taxonomy above is different: makes, models,
    generations and services are reference data the app cannot work without,
    and no amount of searching produces them.
  */

  const models = MAKES.reduce((n, m) => n + m.models.length, 0);
  console.log(
    `Seed complete: ${MAKES.length} makes, ${models} models, ${generations} generations, ` +
      `${trims} trims, ${SERVICES.length} services. No shops — the map fills ` +
      `itself from OpenStreetMap as people search.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
