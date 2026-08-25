"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { MapMechanic } from "@/components/mechanic-map";
import { distance, money, num } from "@/components/ui";
import { AreaPicker, type Area } from "@/components/area-picker";
import { GoldCar } from "@/app/shops/[id]/subscription-panel";
import { ServicePicker } from "@/components/service-picker";

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
  confirmed: boolean;
};

/** OSM records often lack city or state, so never render a bare comma. */
const placeLabel = (city: string, state: string) =>
  [city, state].filter((p) => p && p.trim()).join(", ");


export function Discover({
  makes,
  initial,
}: {
  makes: Option[];
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
  const [sort, setSort] = useState<"relevant" | "price" | "rating" | "distance">("relevant");

  const [results, setResults] = useState<Result[]>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  /*
    Stowing the shop list off the left edge, so the map underneath it can be
    seen. Two ways in — drag the header, or the button beside it — because a
    gesture that is the only route to something is a gesture most people never
    find, and no route at all for anyone using a keyboard.
  */
  const [manuallyStowed, setManuallyStowed] = useState(false);

  /*
    How many of the filter menus are open. They overlay the shop list, so the
    list steps aside while one is showing and comes straight back when it
    closes — the person does not have to move it themselves to read a menu.
  */
  const [openMenus, setOpenMenus] = useState(0);
  const noteMenu = useCallback((open: boolean) => {
    setOpenMenus((n) => Math.max(0, n + (open ? 1 : -1)));
  }, []);

  // Either reason stows it; a menu closing only undoes the menu's own stow.
  const panelStowed = manuallyStowed || openMenus > 0;
  /** Live finger/pointer offset mid-drag; null when not dragging. */
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const dragStartX = useRef<number | null>(null);

  /** Far enough that a scroll or a stray tap is not mistaken for a dismissal. */
  const STOW_THRESHOLD = 64;

  function onDragStart(e: React.PointerEvent) {
    // Only a primary press, and never a drag that begins on a real control.
    if (e.button !== 0) return;
    dragStartX.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onDragMove(e: React.PointerEvent) {
    if (dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    // Leftward only, and it does not rubber-band past its own width.
    setDragOffset(Math.min(0, Math.max(dx, -400)));
  }

  function onDragEnd(e: React.PointerEvent) {
    if (dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    dragStartX.current = null;
    setDragOffset(null);
    if (dx < -STOW_THRESHOLD) setManuallyStowed(true);
  }
  const listRef = useRef<HTMLUListElement>(null);

  // Anchor point for the radius. Null until the reader shares a location or
  // the map settles, in which case results are simply unbounded by distance.
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusMiles, setRadiusMiles] = useState(20);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  // Filters the visible results by name, for looking up one specific shop.
  const [shopQuery, setShopQuery] = useState("");
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
      // High enough that a city-wide search shows every shop it found, rather
      // than the nearest handful. The pins cluster, so density is not an issue.
      params.set("sort", sort);
      params.set("limit", "500");

      const res = await fetch(`/api/mechanics?${params.toString()}`);
      const body = await res.json().catch(() => null);
      setLoading(false);
      if (!res.ok) return;
      setResults(body.items ?? []);
      setSelectedId(null);
      setPanelOpen(true);
    },
    [serviceId, makeId, modelId, genValue, verifiedOnly, subscribedOnly, sort, center, radiusMiles],
  );

  /*
    A sort is not a filter: changing it re-orders what is already on screen and
    should not need the Search button pressed again. Skipped on first render so
    the initial load does not fire two identical searches.
  */
  const sortedOnce = useRef(false);
  useEffect(() => {
    if (!sortedOnce.current) {
      sortedOnce.current = true;
      return;
    }
    void runSearch();
  }, [sort, runSearch]);

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

  /*
    Narrowing the list the reader is already looking at, rather than a new
    query — the point is to find one shop among the results, and filtering in
    memory is instant where a round trip would not be.
  */
  const visible = useMemo(() => {
    const q = shopQuery.trim().toLowerCase();
    if (q === "") return results;
    return results.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.state.toLowerCase().includes(q),
    );
  }, [results, shopQuery]);

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
        {/*
          z-20 / z-10 on these two wrappers is load-bearing, not decoration.

          Both the filter bar and the results panel use .glass, and
          backdrop-filter creates a stacking context. That trapped the area
          picker's menu inside the bar's own context, so its z-50 could not
          lift it above the results panel — the two contexts both sat at
          z-index auto and painted in DOM order, which put the later one
          (results) on top. Ordering the wrappers is what actually decides it.
          Verified against a reduction: with backdrop-filter removed the menu
          won, with it present the panel won, and ordering the wrappers fixed
          it while keeping the glass.
        */}
        <div className="pointer-events-auto p-3 sm:p-4 relative z-20">
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

              <ServicePicker value={serviceId} onChange={setServiceId} onOpenChange={noteMenu} />

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
                <AreaPicker current={areaLabel} onChoose={chooseArea} onOpenChange={noteMenu} />

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

                <label className="inline-flex items-center gap-2">
                  <span className="text-footnote text-secondary">Sort</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as typeof sort)}
                    aria-label="Sort results"
                    className="min-h-11 rounded-full bg-black/[0.06] px-4 pr-8 text-subhead font-medium"
                  >
                    {/* Relevance is the only one that reads the filters. */}
                    <option value="relevant">Most relevant</option>
                    <option value="price">Price, lowest first</option>
                    <option value="rating">Best reviewed</option>
                    <option value="distance">Nearest first</option>
                  </select>
                </label>

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
        <div className="flex-1 min-h-0 flex flex-col sm:flex-row sm:items-stretch relative z-10">
          <div
            className={`pointer-events-auto px-3 pb-3 sm:px-4 sm:pb-4 w-full sm:w-96 mt-auto sm:mt-0 flex flex-col min-h-0 motion-safe:transition-transform motion-safe:duration-300 ${
              panelStowed ? "-translate-x-[calc(100%+1rem)]" : "translate-x-0"
            }`}
            style={dragOffset !== null ? { transform: `translateX(${dragOffset}px)`, transition: "none" } : undefined}
            aria-hidden={panelStowed}
          >
          <div
            className={`relative glass rounded-glass overflow-hidden flex flex-col ${
              panelOpen ? "max-h-[45vh]" : "max-h-16"
            } sm:max-h-none sm:flex-1 transition-[max-height] duration-300`}
          >
            <button
              type="button"
              onClick={() => setPanelOpen((v) => !v)}
              onPointerDown={onDragStart}
              onPointerMove={onDragMove}
              onPointerUp={onDragEnd}
              onPointerCancel={onDragEnd}
              aria-expanded={panelOpen}
              className="flex items-center justify-between w-full px-4 min-h-14 text-left sm:cursor-default touch-pan-y select-none"
            >
              <span className="text-headline font-semibold">
                {locating
                  ? "Finding you…"
                  : `${visible.length} ${visible.length === 1 ? "shop" : "shops"}`}
                {shopQuery.trim() !== "" && results.length !== visible.length && (
                  <span className="text-secondary font-normal"> of {results.length}</span>
                )}
                {center && !locating && !shopQuery.trim() && (
                  <span className="text-secondary font-normal"> within {radiusMiles} mi</span>
                )}
              </span>
              <span className="text-subhead text-secondary sm:hidden" aria-hidden="true">
                {panelOpen ? "Hide" : "Show"}
              </span>
            </button>

            {/* The tap-and-keyboard equivalent of dragging it away. */}
            <button
              type="button"
              onClick={() => setManuallyStowed(true)}
              className="absolute right-2 top-2 hidden sm:grid size-9 place-items-center rounded-full text-secondary hover:text-label hover:bg-black/[0.06]"
              aria-label="Move the shop list aside"
            >
              <span aria-hidden="true" className="text-headline">&lsaquo;</span>
            </button>

            {/* Look up one shop among the results. */}
            <div className="px-3 pb-2">
              <div className="relative">
                <input
                  type="search"
                  value={shopQuery}
                  onChange={(e) => setShopQuery(e.target.value)}
                  placeholder="Find a shop by name or town"
                  aria-label="Filter these shops by name or town"
                  className="w-full min-h-11 rounded-control bg-elevated/80 border border-separator pl-9 pr-9 text-subhead"
                />
                <span
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary"
                >
                  ⌕
                </span>
                {shopQuery && (
                  <button
                    type="button"
                    onClick={() => setShopQuery("")}
                    aria-label="Clear shop filter"
                    className="absolute right-0 top-1/2 -translate-y-1/2 size-9 grid place-items-center text-secondary"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {locationNote && (
              <p className="px-4 pb-2 text-footnote text-secondary">{locationNote}</p>
            )}

            <ul ref={listRef} className="overflow-y-auto overscroll-contain px-2 pb-2 flex-1">
              {visible.length === 0 && results.length > 0 && (
                <li className="px-2 py-6 text-subhead text-secondary text-center">
                  No shop here matches &ldquo;{shopQuery.trim()}&rdquo;.
                </li>
              )}

              {results.length === 0 && !loading && (
                <li className="px-2 py-6 text-subhead text-secondary text-center">
                  <p>
                    No shops matched.
                    {center && radiusMiles < 200
                      ? " Try a wider radius."
                      : " Try clearing some filters."}
                  </p>
                  <Link
                    href="/shops/add"
                    className="inline-flex items-center min-h-11 px-4 mt-3 rounded-full bg-fill text-accent text-subhead font-semibold"
                  >
                    Add a shop we are missing
                  </Link>
                </li>
              )}
              {visible.map((m) => (
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
                        {!m.confirmed && (
                          <span
                            title="Added by a member of the public and not yet confirmed"
                            className="text-caption font-medium rounded-full px-1.5 py-0.5 bg-warning/12 text-warning"
                          >
                            Unconfirmed
                          </span>
                        )}
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
                      {m.fromPrice !== null && ` · from ${money(m.fromPrice)}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          </div>

          {/*
            The way back. A gesture must never be the only route to something,
            so stowing has a button as well as a drag, and this tab is a real
            focusable control rather than a hit area on the map.
          */}
          {/*
            The edge the list went behind. Clicking it also counts as a click
            outside the menus, so they close on their own and the list returns
            without needing to be told twice.
          */}
          {panelStowed && (
            <button
              type="button"
              onClick={() => setManuallyStowed(false)}
              /*
                Grey mixed from --label rather than hardcoded, so it tracks the
                palette if the ink colour is ever retuned. The app is light-only
                today, so this is about staying in the token system, not about
                dark mode.
              */
              className="pointer-events-auto absolute left-0 top-0 bottom-0 w-8 sm:w-9 grid place-items-center
                bg-[color-mix(in_srgb,var(--label)_14%,transparent)]
                hover:bg-[color-mix(in_srgb,var(--label)_22%,transparent)]
                backdrop-blur-md border-r border-separator
                text-label motion-safe:transition-colors"
              aria-label={`Show the shop list (${visible.length} ${visible.length === 1 ? "shop" : "shops"})`}
            >
              {/* Big enough to read as a control at a glance. */}
              <span aria-hidden="true" className="text-title3 leading-none font-semibold">&rsaquo;</span>
            </button>
          )}
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
                <Stat label="From" value={money(selected.fromPrice)} />
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
