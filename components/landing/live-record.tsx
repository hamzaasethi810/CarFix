"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Code, RangeScale, Stamp, buttonStyles, money } from "@/components/ui";
import { Reconciliation } from "@/components/reconciliation";
import { RollingFigure } from "@/components/landing/rolling-figure";

type Option = { id: string; name: string };
type Generation = { id: string; code: string; years: string };
type Pricing = { count: number; min: number | null; max: number | null; median: number | null };

/*
  The hero, as an instrument rather than a poster.

  The page's claim is "real prices, tailored to your car", and this is where
  that stops being a sentence and becomes true: the visitor names their car in
  the record's own header, and the document re-prints for it.

  Three states, and the third is the important one.

    reconciled  Nothing chosen yet. A worked example, labelled as an example,
                whose parts and labour add up to its total. It is here to teach
                the shape of a report before asking anyone for one.
    filed       Their generation has filings. The figures roll over to the real
                median and range, and the stamp attests to the sample size.
    not filed   Their generation has none. The record stays a BLANK RULED FORM
                with their car's name at the top, stamped VOID, and the action
                becomes "file the first price for this generation".

  That last state is the whole reason this exists. Shops are listed and prices
  are not, so a generic signup asks a stranger to trust an empty database. A
  blank repair order with their own car already printed on it asks them to
  finish a document, which is a smaller and much more answerable request. The
  cold start becomes the mechanic instead of the thing being hidden.
*/
export function LiveRecord({
  makes,
  example,
}: {
  makes: Option[];
  example: {
    service: string;
    vehicle: string;
    generation: string;
    parts: number;
    labour: number;
    total: number;
    low: number;
    high: number;
    caption: string;
    range: string;
  };
}) {
  const router = useRouter();
  const [makeId, setMakeId] = useState("");
  const [makeName, setMakeName] = useState("");
  const [models, setModels] = useState<Option[]>([]);
  const [modelId, setModelId] = useState("");
  const [modelName, setModelName] = useState("");
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [genId, setGenId] = useState("");
  const [gen, setGen] = useState<Generation | null>(null);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [loading, setLoading] = useState(false);

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

  /*
    Only fires on a chosen generation, never on a keystroke.

    /api/pricing is rate limited under the shared "search" bucket, so a hero
    that queried while someone was still deciding would spend a visitor's
    allowance before they reached the actual search page.
  */
  useEffect(() => {
    if (!genId) {
      setPricing(null);
      return;
    }
    let live = true;
    /*
      The previous figures deliberately stay on screen while the next ones
      load. Clearing them would unmount RollingFigure, which then remounts with
      no previous value and cannot roll — the odometer would simply never play.
      Holding the last figures and updating them in place is also how a native
      instrument behaves: a gauge does not blank while it reads.
    */
    setLoading(true);
    fetch(`/api/pricing?generationId=${encodeURIComponent(genId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!live) return;
        setPricing(d ? { count: d.count ?? 0, min: d.min, max: d.max, median: d.median } : null);
      })
      .catch(() => live && setPricing({ count: 0, min: null, max: null, median: null }))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [genId]);

  const chooseMake = (value: string, name: string) => {
    setMakeId(value);
    setMakeName(name);
    setModels([]);
    setModelId("");
    setModelName("");
    setGenerations([]);
    setGenId("");
    setGen(null);
  };

  const chooseModel = (value: string, name: string) => {
    setModelId(value);
    setModelName(name);
    setGenerations([]);
    setGenId("");
    setGen(null);
  };

  const chosen = Boolean(gen);
  const filed = Boolean(pricing && pricing.count > 0 && pricing.median !== null);

  const title = chosen ? `${makeName} ${modelName}`.trim() : example.vehicle;
  const code = chosen ? (gen?.code ?? "") : example.generation;

  const field =
    "min-h-11 w-full rounded-none border-0 border-b border-separator bg-elevated px-1 " +
    "text-subhead outline-none transition-[border-color] duration-150 focus:border-accent " +
    "disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div>
      {/*
        The selects sit in the record's header, not in a panel beside it.

        A repair order names its vehicle at the top; here the visitor is the
        one filling that line in, so the controls belong on the line they fill.
      */}
      <div className="grid gap-x-6 gap-y-3 border-b border-separator pb-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-title1 font-semibold tracking-tight text-balance">{title}</h2>
            {code && <Code>{code}</Code>}
          </div>
          <p className="text-subhead text-secondary mt-1.5">
            {chosen ? gen?.years : "Name your car and this record becomes yours."}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:w-[26rem]">
          <label className="block">
            <span className="text-caption text-tertiary-label">Make</span>
            <select
              className={field}
              value={makeId}
              onChange={(e) =>
                chooseMake(e.target.value, e.target.selectedOptions[0]?.text ?? "")
              }
            >
              <option value="">Choose</option>
              {makes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-caption text-tertiary-label">Model</span>
            <select
              className={field}
              value={modelId}
              disabled={!models.length}
              onChange={(e) =>
                chooseModel(e.target.value, e.target.selectedOptions[0]?.text ?? "")
              }
            >
              <option value="">{models.length ? "Choose" : "—"}</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-caption text-tertiary-label">Generation</span>
            <select
              className={field}
              value={genId}
              disabled={!generations.length}
              onChange={(e) => {
                setGenId(e.target.value);
                setGen(generations.find((g) => g.id === e.target.value) ?? null);
              }}
            >
              <option value="">{generations.length ? "Choose" : "—"}</option>
              {generations.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.code}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <RecordBody
        chosen={chosen}
        loading={loading}
        filed={filed}
        pricing={pricing}
        example={example}
        code={code}
      />

      <div className="mt-10 flex flex-wrap items-baseline justify-between gap-4 border-t border-separator pt-6">
        <p className="text-footnote text-tertiary-label max-w-sm text-pretty">
          {!chosen
            ? example.caption
            : filed
              ? "Reported by owners, not quoted by shops."
              : "Nothing filed for this generation yet."}
        </p>

        {chosen && filed ? (
          <button
            type="button"
            onClick={() => router.push(`/search?generationId=${encodeURIComponent(genId)}`)}
            className={`${buttonStyles.primary} px-8`}
          >
            See the shops
          </button>
        ) : (
          <Link href="/register" className={`${buttonStyles.primary} px-8`}>
            {chosen ? `File the first ${code} price` : "File a price"}
          </Link>
        )}
      </div>
    </div>
  );
}

function RecordBody({
  chosen,
  loading,
  filed,
  pricing,
  example,
  code,
}: {
  chosen: boolean;
  loading: boolean;
  filed: boolean;
  pricing: Pricing | null;
  example: LiveRecordExample;
  code: string;
}) {
  /*
    The skeleton is only for the very first lookup, when there is genuinely
    nothing to hold. Every later lookup keeps the current record mounted and
    marks it busy, so the figures roll from the old values to the new ones
    instead of the whole block disappearing and reappearing.
  */
  if (loading && !pricing) {
    return (
      <div aria-live="polite" className="mt-2">
        <span className="sr-only">Looking up filed prices</span>
        <HeadRule />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-11 border-b border-separator" aria-hidden="true" />
        ))}
      </div>
    );
  }

  /* Nothing chosen: the worked example, which reconciles. */
  if (!chosen) {
    return (
      <div className="mt-2">
        <HeadRule heads={["Parts", "Labour"]} />
        <div className="op-grid op-line items-baseline border-b border-separator py-3.5 min-h-11" style={{ ["--figure-count" as string]: "2" }}>
          <div className="op-label min-w-0 text-body">{example.service}</div>
          <span className="tabular text-body text-right">{money(example.parts)}</span>
          <span className="tabular text-body text-right">{money(example.labour)}</span>
        </div>

        <div className="mt-10 grid gap-10 sm:grid-cols-2 sm:gap-14 sm:items-start">
          <RangeScale
            low={example.low}
            high={example.high}
            value={example.total}
            caption={example.range}
          />
          <Reconciliation
            lines={[
              { label: "Parts", amount: example.parts },
              { label: "Labour", amount: example.labour },
            ]}
            total={example.total}
          />
        </div>
      </div>
    );
  }

  /* Chosen, and nothing filed. The blank form is the ask. */
  if (!filed) {
    return (
      <div className="mt-2" aria-live="polite">
        <HeadRule heads={["Parts", "Labour"]} />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-11 border-b border-separator" aria-hidden="true" />
        ))}
        <div className="mt-8 flex justify-end">
          <Stamp state="void">Not yet filed</Stamp>
        </div>
      </div>
    );
  }

  /* Chosen, and filed. The figures roll over to the real ones. */
  const median = pricing?.median ?? 0;
  const low = pricing?.min ?? median;
  const high = pricing?.max ?? median;
  const count = pricing?.count ?? 0;

  return (
    <div className="mt-2" aria-live="polite" aria-busy={loading || undefined}>
      <HeadRule heads={["Typical"]} />
      <div
        className="op-grid op-line items-baseline border-b border-separator py-3.5 min-h-11"
        style={{ ["--figure-count" as string]: "1" }}
      >
        <div className="op-label min-w-0 text-body">All reported work</div>
        <span className="tabular text-body text-right">
          <RollingFigure value={money(median)} label={`Median ${money(median)}`} />
        </span>
      </div>

      <div className="mt-10 grid gap-10 sm:grid-cols-2 sm:gap-14 sm:items-start">
        <RangeScale low={low} high={high} value={median} caption="What owners actually paid." />
        <div>
          <div className="flex items-baseline justify-between border-b-2 border-label pt-3 pb-2.5">
            <span className="text-headline font-semibold">Median</span>
            <span className="tabular text-title2 font-semibold">
              <RollingFigure value={money(median)} label={money(median)} />
            </span>
          </div>
          <div className="mt-5 flex justify-end">
            <Stamp>
              {count} filed on {code}
            </Stamp>
          </div>
        </div>
      </div>
    </div>
  );
}

type LiveRecordExample = React.ComponentProps<typeof LiveRecord>["example"];

/** The column heads, matching the ruled frame in components/ui.tsx. */
function HeadRule({ heads = [] }: { heads?: string[] }) {
  return (
    <div
      className="op-grid border-b border-separator pb-2 text-caption text-tertiary-label"
      style={{ ["--figure-count" as string]: String(Math.max(heads.length, 1)) }}
    >
      <span className="op-label">Operation</span>
      {heads.map((h) => (
        <span key={h} className="text-right">
          {h}
        </span>
      ))}
    </div>
  );
}
