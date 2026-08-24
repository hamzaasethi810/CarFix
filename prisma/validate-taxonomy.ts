/*
  Guards the invariants the taxonomy depends on:
    - no duplicate chassis codes within a model
    - no overlapping year ranges, since the model year is what resolves a
      vehicle to its generation

  Runs as part of `npm run db:seed`, so bad data cannot reach the database.
*/
import { MAKES } from "./seed-data/vehicles";

let overlaps = 0, dupes = 0, gens = 0, models = 0;
for (const make of MAKES) {
  models += make.models.length;
  for (const model of make.models) {
    gens += model.generations.length;
    const codes = new Set<string>();
    for (const g of model.generations) {
      if (codes.has(g.code)) { console.log(`DUP  ${make.name} ${model.name} ${g.code}`); dupes++; }
      codes.add(g.code);
    }
    // Overlapping year ranges would make year->generation resolution ambiguous.
    const sorted = [...model.generations].sort((a, b) => a.from - b.from);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1], cur = sorted[i];
      const prevEnd = prev.to ?? 9999;
      if (cur.from <= prevEnd) {
        console.log(`OVERLAP ${make.name} ${model.name}: ${prev.code}(${prev.from}-${prev.to}) vs ${cur.code}(${cur.from}-${cur.to})`);
        overlaps++;
      }
    }
  }
}
console.log(`makes=${MAKES.length} models=${models} generations=${gens} overlaps=${overlaps} dupes=${dupes}`);

if (overlaps > 0 || dupes > 0) {
  console.error("\nTaxonomy is invalid. Fix the entries above before seeding.");
  process.exit(1);
}
