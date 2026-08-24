import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const SERVICES = [
  "Oil change",
  "Brake pads",
  "Brake pads + rotors",
  "Transmission service",
  "Coolant service",
  "Spark plugs",
  "Battery",
  "Tires",
  "Alignment",
  "Motor mounts",
  "Water pump",
  "Thermostat",
  "Suspension",
  "Exhaust",
  "Diagnostic",
  "Other",
];

const ENGINES = ["S58 3.0L I6 TT", "B58 3.0L I6 T", "LT1 6.2L V8", "Coyote 5.0L V8", "EA888 2.0L I4 T", "FA24 2.4L H4 T"];
const DRIVETRAINS = ["RWD", "AWD", "FWD", "4WD"];

// A deliberately small, enthusiast-focused seed. The schema and API are shaped
// so a full vehicle-data provider can replace this without a migration.
const TAXONOMY = [
  {
    make: "BMW",
    models: [
      {
        name: "M3",
        generations: [
          { code: "G80", platform: "G8x", yearStart: 2021, yearEnd: null, trims: ["Base", "Competition", "Competition xDrive", "CS"] },
          { code: "F80", platform: "F8x", yearStart: 2014, yearEnd: 2018, trims: ["Base", "Competition", "CS"] },
          { code: "E90", platform: "E9x", yearStart: 2008, yearEnd: 2013, trims: ["Base", "Competition"] },
        ],
      },
      {
        name: "M2",
        generations: [
          { code: "G87", platform: "G8x", yearStart: 2023, yearEnd: null, trims: ["Base"] },
          { code: "F87", platform: "F8x", yearStart: 2016, yearEnd: 2021, trims: ["Base", "Competition", "CS"] },
        ],
      },
    ],
  },
  {
    make: "Subaru",
    models: [
      {
        name: "WRX",
        generations: [
          { code: "VB", platform: null, yearStart: 2022, yearEnd: null, trims: ["Base", "Premium", "Limited", "GT"] },
          { code: "VA", platform: null, yearStart: 2015, yearEnd: 2021, trims: ["Base", "Premium", "Limited", "STI"] },
        ],
      },
    ],
  },
  {
    make: "Ford",
    models: [
      {
        name: "Mustang",
        generations: [
          { code: "S650", platform: null, yearStart: 2024, yearEnd: null, trims: ["EcoBoost", "GT", "Dark Horse"] },
          { code: "S550", platform: null, yearStart: 2015, yearEnd: 2023, trims: ["EcoBoost", "GT", "Mach 1", "Shelby GT350"] },
        ],
      },
    ],
  },
  {
    make: "Chevrolet",
    models: [
      {
        name: "Camaro",
        generations: [
          { code: "6th Gen", platform: "Alpha", yearStart: 2016, yearEnd: 2024, trims: ["LT", "SS", "ZL1"] },
        ],
      },
    ],
  },
  {
    make: "Volkswagen",
    models: [
      {
        name: "Golf GTI",
        generations: [
          { code: "Mk8", platform: "MQB", yearStart: 2022, yearEnd: null, trims: ["S", "SE", "Autobahn"] },
          { code: "Mk7", platform: "MQB", yearStart: 2015, yearEnd: 2021, trims: ["S", "SE", "Autobahn"] },
        ],
      },
    ],
  },
];

const MECHANICS = [
  {
    name: "Apex Motorworks",
    description: "European performance specialists. In-house dyno and corner balancing.",
    address: "3410 Pickett Rd",
    city: "Fairfax",
    state: "VA",
    zip: "22031",
    lat: 38.8462,
    lng: -77.3064,
    phone: "703-555-0142",
    website: "https://example.com/apex",
    specialties: ["Brake pads + rotors", "Suspension", "Spark plugs", "Diagnostic"],
  },
  {
    name: "Redline Auto Service",
    description: "General repair with a strong Subaru and Ford following.",
    address: "820 W Broad St",
    city: "Falls Church",
    state: "VA",
    zip: "22046",
    lat: 38.8823,
    lng: -77.1711,
    phone: "703-555-0188",
    website: null,
    specialties: ["Oil change", "Tires", "Alignment", "Coolant service"],
  },
  {
    name: "Torque District",
    description: "Enthusiast-owned shop. Track prep and alignment specialists.",
    address: "1145 Fern St",
    city: "Arlington",
    state: "VA",
    zip: "22202",
    lat: 38.8577,
    lng: -77.0524,
    phone: "703-555-0199",
    website: "https://example.com/torque",
    specialties: ["Alignment", "Suspension", "Exhaust", "Brake pads"],
  },
];

async function main() {
  for (const name of SERVICES) {
    await prisma.service.upsert({ where: { name }, create: { name }, update: {} });
  }
  for (const name of ENGINES) {
    await prisma.engine.upsert({ where: { name }, create: { name }, update: {} });
  }
  for (const name of DRIVETRAINS) {
    await prisma.drivetrain.upsert({ where: { name }, create: { name }, update: {} });
  }

  for (const entry of TAXONOMY) {
    const make = await prisma.make.upsert({
      where: { name: entry.make },
      create: { name: entry.make },
      update: {},
    });

    for (const model of entry.models) {
      const created = await prisma.model.upsert({
        where: { makeId_name: { makeId: make.id, name: model.name } },
        create: { makeId: make.id, name: model.name },
        update: {},
      });

      for (const gen of model.generations) {
        const platform = gen.platform
          ? await prisma.platform.upsert({
              where: { name: gen.platform },
              create: { name: gen.platform },
              update: {},
            })
          : null;

        const generation = await prisma.generation.upsert({
          where: { modelId_code: { modelId: created.id, code: gen.code } },
          create: {
            modelId: created.id,
            code: gen.code,
            yearStart: gen.yearStart,
            yearEnd: gen.yearEnd,
            platformId: platform?.id ?? null,
          },
          update: { yearStart: gen.yearStart, yearEnd: gen.yearEnd, platformId: platform?.id ?? null },
        });

        for (const trim of gen.trims) {
          await prisma.trim.upsert({
            where: { generationId_name: { generationId: generation.id, name: trim } },
            create: { generationId: generation.id, name: trim },
            update: {},
          });
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
      if (!service) continue;
      await prisma.mechanicSpecialty.upsert({
        where: { mechanicId_serviceId: { mechanicId: mechanic.id, serviceId: service.id } },
        create: { mechanicId: mechanic.id, serviceId: service.id },
        update: {},
      });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
