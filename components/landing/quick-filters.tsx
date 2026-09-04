"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonStyles } from "@/components/ui";

type Option = { id: string; name: string };
type Generation = {
  id: string;
  code: string;
  years: string;
  platformId: string | null;
  platform: string | null;
};

/*
  The hero's actual job, as a control rather than a sentence.

  Three steps to the thing the site is for: make, model, generation. It hands
  the query to /search and renders no results itself, which keeps the map and
  the result list off the landing page entirely.

  Generation is the point, not a refinement. "BMW 3 Series" spans twenty
  years and four platforms whose brake jobs have nothing to do with each
  other; an E90 owner and an F30 owner are shopping for different work at
  different prices. Every price on this site is filed by generation, and this
  is where that promise is made.
*/
export function QuickFilters({ makes }: { makes: Option[] }) {
  const router = useRouter();
  const [makeId, setMakeId] = useState("");
  const [models, setModels] = useState<Option[]>([]);
  const [modelId, setModelId] = useState("");
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [genValue, setGenValue] = useState("");

  /*
    The effects only fetch. Clearing the dependent selects happens in the
    change handlers below, where the user action actually is: doing it here
    means setting state synchronously out of an effect, which cascades a
    second render every time a list loads.
  */
  useEffect(() => {
    if (!makeId) return;
    let live = true;
    fetch(`/api/taxonomy?resource=models&makeId=${encodeURIComponent(makeId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => live && setModels(d))
      .catch(() => live && setModels([]));
    return () => {
      live = false;
    };
  }, [makeId]);

  useEffect(() => {
    if (!modelId) return;
    let live = true;
    fetch(`/api/taxonomy?resource=generations&modelId=${encodeURIComponent(modelId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => live && setGenerations(d))
      .catch(() => live && setGenerations([]));
    return () => {
      live = false;
    };
  }, [modelId]);

  const chooseMake = (value: string) => {
    setMakeId(value);
    setModels([]);
    setModelId("");
    setGenerations([]);
    setGenValue("");
  };

  const chooseModel = (value: string) => {
    setModelId(value);
    setGenerations([]);
    setGenValue("");
  };

  const go = () => {
    const params = new URLSearchParams();
    if (makeId) params.set("makeId", makeId);
    if (modelId) params.set("modelId", modelId);
    /*
      Same encoding the search page already uses: a platform groups the
      facelift halves of one generation together, a generation id picks just
      the one. Mirrored here so the link lands on the right filter rather
      than a near miss.
    */
    if (genValue.startsWith("p:")) params.set("platformId", genValue.slice(2));
    else if (genValue.startsWith("g:")) params.set("generationId", genValue.slice(2));

    router.push(`/search${params.size ? `?${params}` : ""}`);
  };

  /*
    Bottom-ruled, matching components/form.tsx.

    A form on a document has a rule under each entry rather than a rounded box
    around it, and these three selects sit beside real form fields elsewhere in
    the product, so they have to speak the same way.
  */
  const field =
    "w-full min-h-11 rounded-none border-0 border-b border-separator bg-elevated px-1 text-subhead " +
    "outline-none transition-[border-color] duration-150 " +
    "focus:border-accent " +
    "disabled:opacity-45 disabled:cursor-not-allowed";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
      /*
        A ruled region, not a card.

        This was the last rounded, bordered, floating panel on the landing
        page: a document world with one soft-cornered tile in it reads as an
        unconverted widget, which is exactly what it was. Separation now comes
        from a rule above and the change of stock, like every other region.
      */
      className="border-t-2 border-label bg-elevated px-0 pt-5"
    >
      {/*
        A heading, not a kicker. The small-caps label floating above content
        is the eyebrow pattern, and it is the single most templated thing on
        a generated page. This carries the same words with the weight of a
        real heading instead.
      */}
      <h2 className="text-headline tracking-[-0.01em]">
        Find a deal for your generation
      </h2>

      <div className="mt-5 space-y-3">
        <label className="block">
          <span className="sr-only">Make</span>
          <select className={field} value={makeId} onChange={(e) => chooseMake(e.target.value)}>
            <option value="">Choose a make</option>
            {makes.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="sr-only">Model</span>
          <select
            className={field}
            value={modelId}
            disabled={models.length === 0}
            onChange={(e) => chooseModel(e.target.value)}
          >
            <option value="">{makeId ? "Choose a model" : "Model"}</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="sr-only">Generation</span>
          <select
            className={field}
            value={genValue}
            disabled={generations.length === 0}
            onChange={(e) => setGenValue(e.target.value)}
          >
            <option value="">{modelId ? "Any generation" : "Generation"}</option>
            {generations.map((g) => (
              <option key={g.id} value={`g:${g.id}`}>
                {g.code} · {g.years}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button type="submit" className={`${buttonStyles.primary} mt-5 w-full justify-center`}>
        See what it costs
      </button>

      <p className="mt-3 text-footnote text-tertiary-label">
        Skip any of them to search wider.
      </p>
    </form>
  );
}
