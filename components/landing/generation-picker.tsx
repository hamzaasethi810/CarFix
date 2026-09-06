"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { buttonStyles } from "@/components/ui";

type Option = { id: string; name: string };
type Generation = { id: string; code: string; years: string };

/*
  Three steps to the thing this site is for.

  What this replaced was a mock repair order: an invented Mercedes with an
  invented $2,180 brake job, presented as a worked example. It taught the shape
  of a report nobody had asked to read, using numbers that were not real, on a
  page whose entire argument is that you should trust real numbers. It also
  queried the pricing API on every generation you picked, which returns zero
  for all of them, because no prices have been filed yet. A database call whose
  answer is known in advance is not a feature.

  This asks the one question the product can actually answer today. Shops are
  real and there are thousands of them; prices are not, yet. So: name your car,
  and go to the shops that work on it.
*/
export function GenerationPicker({ makes }: { makes: Option[] }) {
  const router = useRouter();
  const [makeId, setMakeId] = useState("");
  const [models, setModels] = useState<Option[]>([]);
  const [modelId, setModelId] = useState("");
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [genId, setGenId] = useState("");
  const [loading, setLoading] = useState<"models" | "generations" | null>(null);

  useEffect(() => {
    if (!makeId) return;
    let live = true;
    setLoading("models");
    fetch(`/api/taxonomy?resource=models&makeId=${encodeURIComponent(makeId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => live && setModels(d))
      .catch(() => live && setModels([]))
      .finally(() => live && setLoading(null));
    return () => {
      live = false;
    };
  }, [makeId]);

  useEffect(() => {
    if (!modelId) return;
    let live = true;
    setLoading("generations");
    fetch(`/api/taxonomy?resource=generations&modelId=${encodeURIComponent(modelId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => live && setGenerations(d))
      .catch(() => live && setGenerations([]))
      .finally(() => live && setLoading(null));
    return () => {
      live = false;
    };
  }, [modelId]);

  const gen = generations.find((g) => g.id === genId);

  const go = () => {
    const params = new URLSearchParams();
    if (makeId) params.set("makeId", makeId);
    if (modelId) params.set("modelId", modelId);
    if (genId) params.set("generationId", genId);
    router.push(`/search${params.size ? `?${params}` : ""}`);
  };

  /*
    Each step appears once the one before it is answered, and not before.

    Three empty dropdowns is a form; one question that becomes the next is a
    conversation, and it makes the order obvious without an instruction. An
    earlier version rendered the later steps at opacity 0, which reserved their
    full height and left a tall gap between the first question and the button —
    the hero looked like two controls had failed to load. They are mounted when
    they become answerable, so the block grows as you go.
  */

  const field =
    "w-full min-h-12 rounded-control border border-separator bg-elevated px-3 text-body " +
    "outline-none transition-[border-color] duration-150 focus:border-accent " +
    "disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="w-full max-w-md">
      <div className="grid gap-3">
        <label className="block">
          <span className="text-caption text-tertiary-label">Make</span>
          <select
            className={field}
            value={makeId}
            onChange={(e) => {
              setMakeId(e.target.value);
              setModels([]);
              setModelId("");
              setGenerations([]);
              setGenId("");
            }}
          >
            <option value="">Choose a make</option>
            {makes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        {models.length > 0 && (
        <label className="block card-enter">
          <span className="text-caption text-tertiary-label">Model</span>
          <select
            className={field}
            value={modelId}
            disabled={!models.length}
            onChange={(e) => {
              setModelId(e.target.value);
              setGenerations([]);
              setGenId("");
            }}
          >
            <option value="">{loading === "models" ? "Loading…" : "Choose a model"}</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        )}

        {generations.length > 0 && (
        <label className="block card-enter">
          <span className="text-caption text-tertiary-label">Generation</span>
          <select
            className={field}
            value={genId}
            disabled={!generations.length}
            onChange={(e) => setGenId(e.target.value)}
          >
            <option value="">
              {loading === "generations" ? "Loading…" : "Choose a generation"}
            </option>
            {generations.map((g) => (
              <option key={g.id} value={g.id}>
                {g.code} · {g.years}
              </option>
            ))}
          </select>
        </label>
        )}
      </div>

      <button
        type="button"
        onClick={go}
        disabled={!makeId}
        className={`${buttonStyles.primary} mt-5 w-full justify-center gap-2 text-body`}
      >
        {gen ? `Find shops for the ${gen.code}` : "Find shops"}
        <ArrowRight aria-hidden="true" strokeWidth={2} className="size-4" />
      </button>

      <p className="mt-3 text-footnote text-tertiary-label">
        Skip any of them to search wider.
      </p>
    </div>
  );
}
