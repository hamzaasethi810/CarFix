/*
  The conversion worklist.

  Every entry is a file that still carries something the redesign retires. A
  task converts its files and DELETES their lines from this list; the sweeps in
  tests/design-system.test.ts then hold those files to the new rules forever.

  This exists because the alternative — asserting globally from the first task —
  leaves the suite red for ten tasks, which contradicts the "the full suite must
  stay green" constraint and makes every intermediate review unreadable. A
  shrinking allowlist keeps the suite green at every commit and still fails
  loudly the moment an already-converted file regresses.

  This file exports data only. Its assertions live in
  tests/design-system.test.ts, because vitest only collects tests/**\/*.test.ts.
*/
export const PENDING: Record<string, string[]> = {
  card: [
  ],
  glass: [  ],
  retiredUtilities: [  ],
  deletedPrimitives: [],
  deletedUtilities: [  ],
  layoutTransitions: [  ],
  stampInk: [],
};
