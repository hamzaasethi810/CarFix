export type GenerationSpec = {
  /** Chassis code where one exists, otherwise a generation label. Unique per model. */
  code: string;
  from: number;
  to: number | null;
  /** Groups related generations (facelift halves, shared chassis) for aggregation. */
  platform?: string;
  trims?: string[];
};

export type ModelSpec = { name: string; generations: GenerationSpec[] };
export type MakeSpec = { name: string; models: ModelSpec[] };

/**
 * Combines several make lists into one. A make appearing in more than one
 * source ends up with the union of its models, and a model in more than one
 * source with the union of its generations — so coverage files can be split up
 * by marque without any of them needing to know about the others.
 *
 * Earlier sources win on conflict, which keeps curated entries authoritative.
 */
export function mergeMakes(...sources: MakeSpec[][]): MakeSpec[] {
  const byMake = new Map<string, Map<string, ModelSpec>>();
  const order: string[] = [];

  for (const source of sources) {
    for (const make of source) {
      let models = byMake.get(make.name);
      if (!models) {
        models = new Map();
        byMake.set(make.name, models);
        order.push(make.name);
      }

      for (const model of make.models) {
        const existing = models.get(model.name);
        if (!existing) {
          models.set(model.name, { name: model.name, generations: [...model.generations] });
          continue;
        }
        const seen = new Set(existing.generations.map((g) => g.code));
        for (const gen of model.generations) {
          if (!seen.has(gen.code)) existing.generations.push(gen);
        }
      }
    }
  }

  return order.map((name) => ({
    name,
    models: [...byMake.get(name)!.values()].sort((a, b) => a.name.localeCompare(b.name)),
  }));
}
