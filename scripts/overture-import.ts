import "dotenv/config";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { createInterface as createPromptInterface } from "node:readline/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { withStrictSsl } from "../lib/db-url";
import {
  normalisePlace,
  SAME_PLACE_DEGREES,
  shouldSkipAsDuplicate,
  upsertWasCreate,
  type OverturePlace,
} from "../lib/services/overture-import";

/*
  Loads an Overture extract into the shop table.

  Operator tooling, run from a shell. It reads its target database from
  `process.env.DATABASE_URL` (via `.env`, loaded above) — there is no
  command-line way to point it elsewhere. It is deliberately not reachable
  over HTTP: it writes tens of thousands of rows and re-running it against
  the wrong database would be tedious to undo.

  Idempotent. Rows are keyed on (source, sourceRef), so a second run of the
  same extract updates rather than duplicates.

  Must be run through the npm script below rather than a bare `npx tsx` —
  the service layer this imports pulls in `server-only`, which throws for
  any runtime that hasn't opted into React Server Component conditions, and
  `npx tsx` alone hasn't:

    npm run overture:import -- data/va-places.json [--dry-run] [--yes]
*/

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: withStrictSsl(process.env.DATABASE_URL!) }),
});

const BATCH = 1000;

/** Host and database name only — never the password or the full URL. */
function describeTarget(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  return `${url.hostname}/${url.pathname.replace(/^\//, "")}`;
}

/**
 * Blast-radius guard before the first write. Skipped entirely for
 * `--dry-run`, which writes nothing, and for `--yes`, for scripted use.
 */
async function confirmOrAbort(file: string, yes: boolean) {
  const target = describeTarget(process.env.DATABASE_URL!);
  console.log(`About to import ${file} into ${target}.`);
  if (yes) return;

  const rl = createPromptInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('Type "yes" to proceed: ');
  rl.close();
  if (answer.trim() !== "yes") {
    console.error("Aborted.");
    process.exit(1);
  }
}

async function main() {
  const [file, ...flags] = process.argv.slice(2);
  if (!file) {
    console.error("Usage: npm run overture:import -- <extract.json> [--dry-run] [--yes]");
    process.exit(1);
  }
  const dryRun = flags.includes("--dry-run");
  const yes = flags.includes("--yes");

  if (!dryRun) await confirmOrAbort(file, yes);

  // The service catalogue, once. Names that are not in it are skipped rather
  // than created — an import must never invent a service.
  const services = await prisma.service.findMany({ select: { id: true, name: true } });
  const serviceIdByName = new Map(services.map((s) => [s.name.toLowerCase(), s.id]));

  let read = 0, kept = 0, skippedLowQuality = 0, skippedDuplicate = 0, malformed = 0;
  let created = 0, updated = 0, wouldWrite = 0, failed = 0;
  let batch: ReturnType<typeof normalisePlace>[] = [];

  const flush = async () => {
    const rows = batch.filter((r): r is NonNullable<typeof r> => r !== null);
    batch = [];
    if (rows.length === 0) return;

    for (const row of rows) {
      try {
        // Only shops close enough to matter are candidates for a duplicate.
        // Same radius the matcher below tests against, so the two cannot
        // silently drift apart and let a duplicate through.
        const d = SAME_PLACE_DEGREES;
        const nearby = await prisma.mechanic.findMany({
          where: {
            deletedAt: null,
            lat: { gte: row.lat - d, lte: row.lat + d },
            lng: { gte: row.lng - d, lte: row.lng + d },
          },
          select: { name: true, lat: true, lng: true, source: true, sourceRef: true },
        });

        // A previous run of this same extract is an update, not a duplicate.
        const alreadyMine = nearby.some(
          (n) => n.source === "OVERTURE" && n.sourceRef === row.sourceRef,
        );
        if (!alreadyMine && shouldSkipAsDuplicate(row, nearby)) {
          skippedDuplicate += 1;
          continue;
        }

        if (dryRun) { wouldWrite += 1; continue; }

        const shop = await prisma.mechanic.upsert({
          where: { source_sourceRef: { source: "OVERTURE", sourceRef: row.sourceRef } },
          create: {
            name: row.name, address: row.address, city: row.city, state: row.state,
            country: row.country, zip: row.zip, lat: row.lat, lng: row.lng,
            phone: row.phone, website: row.website,
            source: "OVERTURE", sourceRef: row.sourceRef,
          },
          update: {
            name: row.name, address: row.address, city: row.city, state: row.state,
            country: row.country, zip: row.zip, lat: row.lat, lng: row.lng,
            phone: row.phone, website: row.website,
          },
          select: { id: true, createdAt: true, updatedAt: true },
        });

        for (const name of row.services) {
          const serviceId = serviceIdByName.get(name.toLowerCase());
          if (!serviceId) continue;
          await prisma.mechanicSpecialty.upsert({
            where: { mechanicId_serviceId: { mechanicId: shop.id, serviceId } },
            create: { mechanicId: shop.id, serviceId },
            update: {},
          });
        }
        if (upsertWasCreate(shop.createdAt, shop.updatedAt)) created += 1;
        else updated += 1;
      } catch (e) {
        failed += 1;
        console.error(
          `  failed: ${row.name} (${row.sourceRef}): ${e instanceof Error ? e.message : e}`,
        );
      }
    }
  };

  const lines = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    read += 1;
    let place: OverturePlace;
    try { place = JSON.parse(line); } catch { malformed += 1; continue; }

    const row = normalisePlace(place);
    if (!row) { skippedLowQuality += 1; continue; }
    kept += 1;
    batch.push(row);
    if (batch.length >= BATCH) await flush();
    if (read % 20000 === 0) console.log(`  read ${read.toLocaleString()}…`);
  }
  await flush();

  const written = dryRun
    ? `  ${wouldWrite.toLocaleString()} would be written\n`
    : `  ${created.toLocaleString()} created, ${updated.toLocaleString()} updated\n`;

  console.log(
    `\nread ${read.toLocaleString()} places\n` +
    `  ${skippedLowQuality.toLocaleString()} not workshops, unnamed, unplaced or low confidence\n` +
    `  ${skippedDuplicate.toLocaleString()} already listed\n` +
    written +
    (malformed > 0 ? `  ${malformed.toLocaleString()} unparseable\n` : "") +
    (failed > 0 ? `  ${failed.toLocaleString()} failed\n` : "") +
    `  (${kept.toLocaleString()} passed normalisation)`,
  );

  // A partial import must never look like a clean one to a cron job or CI step.
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); })
  .finally(() => prisma.$disconnect());
