import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/*
  One directory walker, not two.

  tests/design-system.test.ts and tests/css-vars.test.ts both need the full
  list of .ts/.tsx files under app/ and components/ — the former to sweep
  converted files for retired patterns, the latter to catch a var() with no
  definition in globals.css. Two copies of a directory walker is exactly the
  kind of duplication that drifts, so there is one.
*/

/** Every .ts/.tsx file under app/ and components/, relative to the repo root. */
export function sources(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(new URL(`../${dir}`, import.meta.url))) {
      const rel = join(dir, entry);
      if (statSync(new URL(`../${rel}`, import.meta.url)).isDirectory()) walk(rel);
      else if (/\.tsx?$/.test(entry)) out.push(rel);
    }
  };
  ["app", "components"].forEach(walk);
  return out;
}
