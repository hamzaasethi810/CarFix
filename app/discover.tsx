"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { MapMechanic } from "@/components/mechanic-map";
import { distance, money, num } from "@/components/ui";
import { AreaPicker, type Area } from "@/components/area-picker";
import { GoldCar } from "@/app/shops/[id]/subscription-panel";

// Leaflet needs `window`, so the map never renders on the server.
const MechanicMap = dynamic(
  () => import("@/components/mechanic-map").then((m) => m.MechanicMap),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-grouped" aria-hidden="true" />,
  },
);

type Option = { id: string; name: string };
type Generation = {
  id: string;
  code: string;
  years: string;
  platformId: string | null;
  platform: string | null;
};

type Result = MapMechanic & {
  distanceMiles: number | null;
  wouldReturnPct: number | null;
  subscribed: boolean;
};

/** OSM records often lack city or state, so never render a bare comma. */
const placeLabel = (city: string, state: string) =>
  [city, state].filter((p) => p && p.trim()).join(", ");


export function Discover({
  makes,
  services,
  initial,
}: {
  makes: Option[];
  services: Option[];
  initial: Result[];
}) {
  const [makeId, setMakeId] = useState("");
  const [models, setModels] = useState<Option[]>([]);
  const [modelId, setModelId] = useState("");
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [genValue, setGenValue] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [subscribedOnly, setSubscribedOnly] = useState(false);

  const [results, setResults] = useState<Result[]>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  // Anchor point for the radius. Null until the reader shares a location or
  // the map settles, in which case results are simply unbounded by distance.
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusMiles, setRadiusMiles] = useState(20);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [areaLabel, setAreaLabel] = useState<string | null>(null);

  /*
    Dependent selections are cleared in the change handler, not in an effect,
    so the effects below only ever do the one thing they exist for: fetching.
  */
  function chooseMake(next: string) {
    setMakeId(next);
    setModelId("");
    setModels([]);
    setGenerations([]);
    setGenValue("");
  }

  function chooseModel(next: string) {
    setModelId(next);
    setGenerations([]);
    setGenValue("");
  }

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
    Generations sharing a platform are offered as one combined option first
    (every W212 E-Class), then individually (just the W212R facelift), so the
    reader chooses how wide the data should be.
  */
  const generationOptions = useMemo(() => {
    const platforms = new Map<string, { id: string; name: string; years: string }>();
    for (const g of generations) {
      if (!g.platformId || !g.platform) continue;
      const seen = platforms.get(g.platformId);
      const first = Number(g.years.split("–")[0]);
      const last = g.years.split("–")[1];
      if (!seen) {
        platforms.set(g.platformId, { id: g.platformId, name: g.platform, years: g.years });
      } else {
        const seenFirst = Number(seen.years.split("–")[0]);
        seen.years = `${Math.min(first, seenFirst)}–${
          seen.years.includes("present") || last === "present" ? "present" : Math.max(Number(last), Number(seen.years.split("–")[1]))
        }`;
      }
    }
    return {
      platforms: [...platforms.values()].filter(
        (p) => generations.filter((g) => g.platformId === p.id).length > 1,
      ),
      generations,
    };
  }, [generations]);

  const runSearch = useCallback(
    async (override?: { lat: number; lng: number; radiusMiles?: number }) => {
      setLoading(true);
      const params = new URLSearchParams();
      if (serviceId) params.set("serviceId", serviceId);
      if (makeId) params.set("makeId", makeId);
      if (modelId) params.set("modelId", modelId);
      if (genValue.startsWith("p:")) params.set("platformId", genValue.slice(2));
      else if (genValue.startsWith("g:")) params.set("generationId", genValue.slice(2));
      if (verifiedOnly) params.set("verifiedOnly", "true");
      if (subscribedOnly) params.set("subscribedOnly", "true");

      const anchor = override ?? center;
      if (anchor) {
        params.set("lat", String(anchor.lat));
        params.set("lng", String(anchor.lng));
        params.set("radiusMiles", String(override?.radiusMiles ?? radiusMiles));
      }
      params.set("limit", "50");

      const res = await fetch(`/api/mechanics?${params.toString()}`);
      const body = await res.json().catch(() => null);
      setLoading(false);
      if (!res.ok) return;
      setResults(body.items ?? []);
      setSelectedId(null);
      setPanelOpen(true);
    },
    [serviceId, makeId, modelId, genValue, verifiedOnly, subscribedOnly, center, radiusMiles],
  );

  /*
    Ask once on load. Permission may be denied or unavailable, so this only
    ever improves the default view — it never blocks it.
  */
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    let live = true;
    // Deferred so the effect body itself does not synchronously set state.
    queueMicrotask(() => live && setLocating(true));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!live) return;
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(next);
        setLocating(false);
        setLocationNote(null);
        setAreaLabel("Near you");
        void runSearch({ ...next, radiusMiles: 20 });
      },
      () => {
        if (!live) return;
        setLocating(false);
        setLocationNote("Showing all areas — use Select area, or allow location.");
      },
      { timeout: 8000, maximumAge: 300_000 },
    );

    return () => {
      live = false;
    };
    // Deliberately runs once: this is the initial locate, not a reaction to filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function chooseArea(area: Area) {
    const next = { lat: area.lat, lng: area.lng };
    setCenter(next);
    // A postcode gets a tight radius, a country a wide one.
    setRadiusMiles(area.suggestedRadiusMiles);
    // Nominatim labels are long; the first two parts identify the place.
    setAreaLabel(area.label.split(",").slice(0, 2).join(",").trim());
    setLocationNote(null);
    void runSearch({ ...next, radiusMiles: area.suggestedRadiusMiles });
  }

  function changeRadius(next: number) {
    setRadiusMiles(next);
    if (center) void runSearch({ ...center, radiusMiles: next });
  }

  const selected = results.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="map-root fixed inset-0 top-16">
      <MechanicMap
        mechanics={results}
        selectedId={selectedId}
        onSelect={setSelectedId}
        className="absolute inset-0"
      />

      {/*
        Functional layer. Everything below floats above the map on Liquid Glass;
        the map itself is the content layer.
      */}
      <div className="pointer-events-none absolute inset-0 flex flex-col">
        <div className="pointer-events-auto p-3 sm:p-4">
          <div className="glass rounded-glass p-3 sm:p-4 max-w-4xl mx-auto">
            <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2 lg:grid-cols-5 [&>*]:min-w-0">
              <Picker label="Make" value={makeId} onChange={chooseMake} options={makes} anyLabel="Any make" />
              <Picker
                label="Model"
                value={modelId}
                onChange={chooseModel}
                options={models}
                anyLabel={makeId ? "Any model" : "Pick a make"}
                disabled={!makeId}
              />

              <label className="block">
                <span className="block text-footnote font-medium mb-1">Generation</span>
                <select
                  value={genValue}
                  onChange={(e) => setGenValue(e.target.value)}
                  disabled={generations.length === 0}
                  className="w-full min-h-11 rounded-control bg-elevated/90 border border-separator px-3 text-subhead disabled:opacity-50"
                >
                  <option value="">{modelId ? "Any year" : "Pick a model"}</option>
                  {generationOptions.platforms.length > 0 && (
                    <optgroup label="All years on this chassis">
                      {generationOptions.platforms.map((p) => (
                        <option key={p.id} value={`p:${p.id}`}>
                          {p.name.replace(/^\S+\s/, "")} — all
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Specific generation">
                    {generationOptions.generations.map((g) => (
                      <option key={g.id} value={`g:${g.id}`}>
                        {g.code} ({g.years})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>

              <Picker label="Service" value={serviceId} onChange={setServiceId} options={services} anyLabel="Any service" />

              <label className="block">
                <span className="block text-footnote font-medium mb-1">
                  {center ? "Distance" : "Distance (needs location)"}
                </span>
                <select
                  value={radiusMiles}
                  onChange={(e) => changeRadius(Number(e.target.value))}
                  disabled={!center}
                  aria-label="Search radius in miles"
                  className="w-full min-h-11 rounded-control bg-elevated/90 border border-separator px-3 text-subhead disabled:opacity-50"
                >
                  {[5, 10, 20, 35, 50, 100, 200].map((r) => (
                    <option key={r} value={r}>
                      {r} miles
                    </option>
                  ))}
                </select>
              </label>

              <div className="sm:col-span-2 lg:col-span-5 flex flex-wrap items-center gap-3 pt-1">
                <AreaPicker current={areaLabel} onChoose={chooseArea} />

                {/* Verified reads as a toggle chip rather than a bare checkbox. */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={verifiedOnly}
                  onClick={() => setVerifiedOnly((v) => !v)}
                  className={`inline-flex items-center gap-2 min-h-11 px-4 rounded-full text-subhead font-medium transition-colors duration-150 ${
                    verifiedOnly
                      ? "bg-success/15 text-success"
                      : "bg-black/[0.06] text-secondary hover:bg-black/10"
                  }`}
                >
                  <span aria-hidden="true">{verifiedOnly ? "✓" : "○"}</span>
                  Verified only
                </button>

                <button
                  type="button"
                  role="switch"
                  aria-checked={subscribedOnly}
                  onClick={() => setSubscribedOnly((v) => !v)}
                  className={`inline-flex items-center gap-2 min-h-11 px-4 rounded-full text-subhead font-medium transition-colors duration-150 ${
                    subscribedOnly
                      ? "bg-[color-mix(in_srgb,#b8860b_18%,transparent)] text-[#8a6508]"
                      : "bg-black/[0.06] text-secondary hover:bg-black/10"
                  }`}
                >
                  <GoldCar className="size-4" />
                  Gold shops
                </button>

                <span className="flex-1" />

                {/* The one primary action in this context gets the colour. */}
                <button
                  type="button"
                  onClick={() => void runSearch()}
                  disabled={loading}
                  className="min-h-11 px-7 rounded-full bg-accent-fill text-on-accent text-subhead font-semibold shadow-sm disabled:opacity-50 w-full sm:w-auto"
                >
                  {loading ? "Searching…" : "Search"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results share the flex column with the bar, so they never overlap it. */}
        <div className="flex-1 min-h-0 flex flex-col sm:flex-row sm:items-stretch">
          <div className="pointer-events-auto px-3 pb-3 sm:px-4 sm:pb-4 w-full sm:w-96 mt-auto sm:mt-0 flex flex-col min-h-0">
          <div
            className={`glass rounded-glass overflow-hidden flex flex-col ${
              panelOpen ? "max-h-[45vh]" : "max-h-16"
            } sm:max-h-none sm:flex-1 transition-[max-height] duration-300`}
          >
            <button
              type="button"
              onClick={() => setPanelOpen((v) => !v)}
              aria-expanded={panelOpen}
              className="flex items-center justify-between w-full px-4 min-h-14 text-left sm:cursor-default"
            >
              <span className="text-headline font-semibold">
                {locating
                  ? "Finding you…"
                  : `${results.length} ${results.length === 1 ? "shop" : "shops"}`}
                {center && !locating && (
                  <span className="text-secondary font-normal"> within {radiusMiles} mi</span>
                )}
              </span>
              <span className="text-subhead text-secondary sm:hidden" aria-hidden="true">
                {panelOpen ? "Hide" : "Show"}
              </span>
            </button>

            {locationNote && (
              <p className="px-4 pb-2 text-footnote text-secondary">{locationNote}</p>
            )}

            <ul ref={listRef} className="overflow-y-auto overscroll-contain px-2 pb-2 flex-1">
              {results.length === 0 && !loading && (
                <li className="px-2 py-6 text-subhead text-secondary text-center">
                  No shops matched.
                  {center && radiusMiles < 200
                    ? " Try a wider radius."
                    : " Try clearing some filters."}
                </li>
              )}
              {results.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    aria-current={m.id === selectedId || undefined}
                    className={`w-full text-left rounded-control px-3 py-3 transition-colors ${
                      m.id === selectedId ? "bg-accent-fill/12" : "hover:bg-black/5"
                    }`}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-subhead font-semibold inline-flex items-center gap-1.5">
                        {m.subscribed && <GoldCar className="size-4 shrink-0" />}
                        {m.name}
                      </span>
                      <span className="text-footnote text-secondary shrink-0">
                        {m.distanceMiles !== null
                          ? distance(m.distanceMiles)
                          : placeLabel(m.city, m.state)}
                      </span>
                    </span>
                    <span className="block text-footnote text-secondary mt-1">
                      {m.avgRating !== null ? `${m.avgRating}/5 · ` : ""}
                      {num(m.experienceCount)} {m.experienceCount === 1 ? "experience" : "experiences"}
                      {m.verifiedCount > 0 && (
                        <span className="text-success"> · {m.verifiedCount} verified</span>
                      )}
                      {m.medianPrice !== null && ` · median ${money(m.medianPrice)}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          </div>
        </div>

        {/* Place card for the selected pin. Sits clear of the attribution. */}
        {selected && (
          <div className="pointer-events-auto absolute left-3 right-3 bottom-10 sm:left-auto sm:right-4 sm:w-80">
            <div className="glass rounded-glass p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-headline font-semibold inline-flex items-center gap-1.5">
                    {selected.subscribed && <GoldCar className="size-5 shrink-0" />}
                    {selected.name}
                  </h2>
                  <p className="text-footnote text-secondary mt-0.5">
                    {[placeLabel(selected.city, selected.state), distance(selected.distanceMiles)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Close"
                  className="shrink-0 size-11 -mr-2 -mt-2 grid place-items-center text-secondary text-title3"
                >
                  ×
                </button>
              </div>

              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Stat label="Rating" value={selected.avgRating !== null ? `${selected.avgRating}` : "—"} />
                <Stat label="Reports" value={num(selected.experienceCount)} />
                <Stat label="Median" value={money(selected.medianPrice)} />
              </dl>

              <Link
                href={`/mechanics/${selected.id}`}
                className="mt-3 flex items-center justify-center min-h-11 rounded-control bg-accent-fill text-on-accent text-subhead font-semibold"
              >
                View shop
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Picker({
  label,
  value,
  onChange,
  options,
  anyLabel,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  anyLabel: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-footnote font-medium mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full min-h-11 rounded-control bg-elevated/90 border border-separator px-3 text-subhead disabled:opacity-50"
      >
        <option value="">{anyLabel}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-control bg-black/5 py-2">
      <dt className="text-caption text-secondary">{label}</dt>
      <dd className="text-subhead font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
