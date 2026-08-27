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
  /*
    On a phone the filter panel is the whole screen — every control stacked
    vertically leaves no map at all, which is the one thing this page is for.
    It collapses to a single summary line once a search has run, and swiping
    it up or tapping the summary moves between the two. Desktop has the room,
    so it stays open there.
  */
  const [filtersOpen, setFiltersOpen] = useState(true);
  const filterDragY = useRef<number | null>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

  /*
    Whether the panel is taking too much of the screen to leave a usable map.

    The first version of this asked whether the screen was narrow, which is the
    wrong question: a phone held sideways is 852 points wide and 393 tall, so
    it passed the width test and got the full panel — 444 points of controls in
    a 393 point window, taller than the screen it was drawn in. A tablet in
    portrait had the same problem for the same reason.

    Height is what actually matters, and measuring the panel against the window
    settles it for every device without naming any of them.
  */
  const filtersCrowdTheMap = useCallback(() => {
    const bar = filterBarRef.current?.getBoundingClientRect().height ?? 0;
    return bar > window.innerHeight * 0.35;
  }, []);

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
  const dragStartY = useRef<number | null>(null);
  /*
    A drag ends in a click too. Without this the swipe sets the sheet closed
    and the click that follows immediately toggles it back open, so the gesture
    appears to do nothing at all.
  */
  const draggedRef = useRef(false);

  /** Far enough that a scroll or a stray tap is not mistaken for a dismissal. */
  const STOW_THRESHOLD = 64;

  function onFilterPointerDown(e: React.PointerEvent) {
    filterDragY.current = e.clientY;
  }

  function onFilterPointerUp(e: React.PointerEvent) {
    if (filterDragY.current === null) return;
    const dy = e.clientY - filterDragY.current;
    filterDragY.current = null;
    // Far enough to be a deliberate swipe rather than a tap that wandered.
    if (dy < -40) setFiltersOpen(false);
    else if (dy > 40) setFiltersOpen(true);
  }

  function onDragStart(e: React.PointerEvent) {
    // Only a primary press, and never a drag that begins on a real control.
    if (e.button !== 0) return;
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
    draggedRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onDragMove(e: React.PointerEvent) {
    if (dragStartX.current === null || dragStartY.current === null) return;
    const dx = e.clientX - dragStartX.current;
    // A vertical swipe is a collapse, not a slide, so do not track it sideways.
    if (Math.abs(e.clientY - dragStartY.current) > Math.abs(dx)) return;
    // Leftward only, and it does not rubber-band past its own width.
    setDragOffset(Math.min(0, Math.max(dx, -400)));
  }

  /*
    One gesture, two meanings, decided by direction.

    Dragging sideways pushes the list off the edge, which is what there is room
    for on a wide screen. Dragging up or down collapses and expands it, which is
    what a phone needs — the list and the map cannot both have the screen, and
    flicking a sheet down to see what is under it is the motion people already
    expect there.
  */
  function onDragEnd(e: React.PointerEvent) {
    if (dragStartX.current === null || dragStartY.current === null) return;
    const dx = e.clientX - dragStartX.current;
    const dy = e.clientY - dragStartY.current;
    dragStartX.current = null;
    dragStartY.current = null;
    setDragOffset(null);
    draggedRef.current = Math.abs(dx) > 8 || Math.abs(dy) > 8;

    if (Math.abs(dy) > Math.abs(dx)) {
      if (dy > STOW_THRESHOLD) setPanelOpen(false);
      else if (dy < -STOW_THRESHOLD) setPanelOpen(true);
      return;
    }
    if (dx < -STOW_THRESHOLD) setManuallyStowed(true);
  }
  const listRef = useRef<HTMLUListElement>(null);

  // Anchor point for the radius. Null until the reader shares a location or
  // the map settles, in which case results are simply unbounded by distance.
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusMiles, setRadiusMiles] = useState(20);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  /*
    True while the server is still pulling this area in from OpenStreetMap.
    An area that has never been searched genuinely has no shops yet, and
    showing "none found" would be a wrong answer rather than an empty one.
  */
  const [ingesting, setIngesting] = useState(false);
  const ingestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /*
    The retry has to call the search, and the search schedules the retry, so one
    of them has to reach the other through a ref rather than by name.
  */
  const runSearchRef = useRef<
    ((o?: { lat: number; lng: number; radiusMiles?: number }) => Promise<void>) | null
  >(null);
  // Filters the visible results by name, for looking up one specific shop.
  const [shopQuery, setShopQuery] = useState("");

  /** What the collapsed bar says is being searched for. */
  const filterSummary = useMemo(() => {
    const parts = [
      makes.find((m) => m.id === makeId)?.name,
      models.find((m) => m.id === modelId)?.name,
      serviceId ? "a service" : null,
      verifiedOnly ? "verified" : null,
      subscribedOnly ? "gold" : null,
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : `Any shop within ${radiusMiles} mi`;
  }, [makes, makeId, models, modelId, serviceId, verifiedOnly, subscribedOnly, radiusMiles]);

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

      /*
        The area is being fetched behind this response. Ask again shortly —
        once — rather than leaving somebody looking at an empty map they have
        no reason to think will fill in.
      */
      setIngesting(Boolean(body.ingesting));
      if (ingestTimer.current) clearTimeout(ingestTimer.current);
      if (body.ingesting) {
        ingestTimer.current = setTimeout(() => void runSearchRef.current?.(override), 9000);
      }
      // Get out of the way once there is something to look at, but only where
      // the panel would otherwise leave no map worth showing.
      if (typeof window !== "undefined" && filtersCrowdTheMap()) setFiltersOpen(false);
    },
    [serviceId, makeId, modelId, genValue, verifiedOnly, subscribedOnly, sort, center, radiusMiles, filtersCrowdTheMap],
  );

  useEffect(() => {
    runSearchRef.current = runSearch;
  }, [runSearch]);

  useEffect(
    () => () => {
      if (ingestTimer.current) clearTimeout(ingestTimer.current);
    },
    [],
  );

  /*
    A sort is not a filter: changing it re-orders what is already on screen and
    should not need the Search button pressed again.

    It compares the previous sort value rather than tracking whether the effect
    has run before. runSearch is rebuilt whenever the centre or radius changes,
    which re-runs this effect for reasons that have nothing to do with sorting,
    and a "have I run yet" flag also survives the remount React does in Strict
    Mode. Between them that fired two extra searches on every page load — one
    before the location was even known.
  */
  const lastSort = useRef(sort);
  useEffect(() => {
    if (lastSort.current === sort) return;
    lastSort.current = sort;
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
      {/*
        The map is fixed to the viewport, so it sits outside the page shell and
        gets none of its safe-area padding. With viewport-fit set to cover — as
        it must be for a full-bleed map — everything here would otherwise be
        drawn under the Dynamic Island and the home indicator. Measured on an
        iPhone 16 Pro Max held sideways, the shop count, the zoom buttons and
        the first letter of "Make" were all underneath it.
      */}
      <div
        className="pointer-events-none absolute inset-0 flex flex-col"
        style={{
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
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
          <div
            ref={filterBarRef}
            className="glass rounded-glass p-3 sm:p-4 max-w-4xl mx-auto"
            onPointerDown={onFilterPointerDown}
            onPointerUp={onFilterPointerUp}
          >
            {/*
              What is being searched for, and a way back to change it. Offered
              at every size: a laptop window can be short, and a tablet held
              sideways has less height than a phone held upright.
            */}
            {!filtersOpen && (
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="flex items-center justify-between w-full gap-3 min-h-11 text-left"
                aria-expanded={false}
              >
                <span className="min-w-0 flex-1 truncate text-subhead">
                  <span className="font-semibold">{filterSummary}</span>
                  {areaLabel && <span className="text-secondary"> · {areaLabel}</span>}
                </span>
                <span className="shrink-0 inline-flex items-center gap-1 text-footnote font-medium text-accent">
                  Filters
                  {/* Points down: this opens downwards. */}
                  <span aria-hidden="true" className="text-subhead leading-none">&#9662;</span>
                </span>
              </button>
            )}

            {/*
              Scrolls rather than overflowing. In landscape on a phone the full
              set of controls is taller than the window, and the Search button
              is the last of them — it was rendered 9 points below the bottom
              of the screen with no way to reach it.
            */}
            <div
              /*
                Two columns from the smallest size up. In one column the five
                pickers plus the actions were taller than a phone screen and
                the last of them had to be scrolled to. Paired up they fit,
                which matters more than how much map is visible while somebody
                is actively choosing filters.
              */
              className={`${filtersOpen ? "grid" : "hidden"} gap-2.5 sm:gap-3 grid-cols-2 lg:grid-cols-5 [&>*]:min-w-0
                max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain`}
            >
              {/* Says the panel moves, and gives the thumb something to aim at. */}
              <div className="col-span-2 lg:col-span-5 -mt-1 mb-0.5 flex justify-center">
                <span aria-hidden="true" className="h-1 w-9 rounded-control bg-white/15" />
              </div>

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

              <div className="col-span-2 lg:col-span-5 flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
                <AreaPicker current={areaLabel} onChoose={chooseArea} onOpenChange={noteMenu} />

                {/* Verified reads as a toggle chip rather than a bare checkbox. */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={verifiedOnly}
                  onClick={() => setVerifiedOnly((v) => !v)}
                  className={`inline-flex items-center gap-2 min-h-11 px-4 rounded-control text-subhead font-medium transition-colors duration-150 ${
                    verifiedOnly
                      ? "bg-success/15 text-success"
                      : "bg-white/[0.06] text-secondary hover:bg-fill"
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
                  className={`inline-flex items-center gap-2 min-h-11 px-4 rounded-control text-subhead font-medium transition-colors duration-150 ${
                    subscribedOnly
                      ? "bg-[color-mix(in_srgb,var(--gold)_18%,transparent)] text-gold"
                      : "bg-white/[0.06] text-secondary hover:bg-fill"
                  }`}
                >
                  <GoldCar className="size-4" />
                  Gold shops
                </button>

                {/*
                  Sort and Search travel together, pushed to the trailing edge.

                  They were separate flex items in a wrapping row, and Search
                  was full-width below the small breakpoint, so it claimed a
                  line of its own and pushed itself off the bottom of a phone
                  held sideways. Kept as one group they stay on the same line as
                  the sort, and the panel is a row shorter everywhere.

                  The visible labels are single words; the full meaning is on
                  the select's accessible name, where it does not cost width.
                */}
                <div className="flex items-center gap-2 ml-auto">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as typeof sort)}
                    aria-label="Sort results by"
                    className="min-h-11 rounded-control bg-white/[0.06] pl-4 pr-8 text-subhead font-medium"
                  >
                    {/* Relevance is the only one that reads the filters. */}
                    <option value="relevant">Relevance</option>
                    <option value="price">Price</option>
                    <option value="rating">Rating</option>
                    <option value="distance">Distance</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    aria-label="Hide the filters"
                    className="min-h-11 px-3 rounded-control text-subhead font-medium text-secondary hover:text-label whitespace-nowrap inline-flex items-center gap-1"
                  >
                    Hide
                    {/* Points up: this is the way back. */}
                    <span aria-hidden="true" className="leading-none">&#9652;</span>
                  </button>

                  {/* The one primary action in this context gets the colour. */}
                  <button
                    type="button"
                    onClick={() => void runSearch()}
                    disabled={loading}
                    className="min-h-11 px-6 rounded-control bg-accent-fill text-on-accent text-subhead font-semibold shadow-sm disabled:opacity-50 whitespace-nowrap"
                  >
                    {loading ? "Searching…" : "Search"}
                  </button>
                </div>
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
            {/* Signals the sheet can be dragged, the way sheets usually do. */}
            <span
              aria-hidden="true"
              className="sm:hidden mx-auto mt-2 h-1 w-9 rounded-control bg-white/15"
            />

            <button
              type="button"
              onClick={() => {
                // The gesture already decided; do not undo it.
                if (draggedRef.current) {
                  draggedRef.current = false;
                  return;
                }
                setPanelOpen((v) => !v);
              }}
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
                  : ingesting && visible.length === 0
                    ? "Looking up this area…"
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
              className="absolute right-2 top-2 hidden sm:grid size-11 place-items-center rounded-full text-secondary hover:text-label hover:bg-fill"
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
                  className="w-full min-h-11 rounded-control bg-elevated/80 border border-separator pl-9 pr-11 text-subhead"
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
                    className="absolute right-0 top-1/2 -translate-y-1/2 size-11 grid place-items-center text-secondary"
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

              {/*
                Nothing has been searched for yet. The map starts empty and
                fills from OpenStreetMap once there is somewhere to centre it
                on, so this is the ordinary first view rather than a failure —
                and it should ask for the one thing it needs instead of
                reporting that nothing matched.
              */}
              {results.length === 0 && !loading && !center && (
                <li className="px-2 py-6 text-subhead text-secondary text-center">
                  <p className="text-label font-medium">Where are you looking?</p>
                  <p className="mt-1 text-pretty">
                    Allow location, or use <strong>Near you</strong> to name a town,
                    postcode or city. Shops in that area load automatically.
                  </p>
                </li>
              )}

              {results.length === 0 && !loading && center && ingesting && (
                <li className="px-2 py-6 text-subhead text-secondary text-center">
                  <p className="text-label font-medium">Looking up this area…</p>
                  <p className="mt-1 text-pretty">
                    Shops here have not been fetched before. This takes a few
                    seconds the first time, then it is instant for everyone.
                  </p>
                </li>
              )}

              {/*
                Nothing matched. Which filter is doing the excluding is knowable
                here, so it says so rather than leaving somebody to guess which
                of five controls to undo.
              */}
              {results.length === 0 && !loading && center && !ingesting && (
                <li className="px-2 py-6 text-subhead text-secondary text-center">
                  <p className="text-label font-medium">No shops match these filters</p>
                  <p className="mt-1 text-pretty">Try broadening your search:</p>
                  <ul className="mt-2 space-y-1 text-footnote">
                    {radiusMiles < 200 && (
                      <li>Widen the distance beyond {radiusMiles} miles</li>
                    )}
                    {makeId && <li>Search any make, not just this one</li>}
                    {serviceId && <li>Search any service</li>}
                    {verifiedOnly && <li>Include shops without verified prices</li>}
                    {subscribedOnly && <li>Include shops that are not gold</li>}
                    {!makeId && !serviceId && !verifiedOnly && !subscribedOnly && radiusMiles >= 200 && (
                      <li>Try a different area</li>
                    )}
                  </ul>
                  <div className="flex flex-wrap justify-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setMakeId("");
                        setModelId("");
                        setGenValue("");
                        setServiceId("");
                        setVerifiedOnly(false);
                        setSubscribedOnly(false);
                        if (center) void runSearch({ ...center, radiusMiles: Math.min(200, radiusMiles * 2) });
                      }}
                      className="inline-flex items-center min-h-11 px-4 rounded-control bg-accent-fill text-on-accent text-subhead font-semibold"
                    >
                      Broaden the search
                    </button>
                    <Link
                      href="/shops/add"
                      className="inline-flex items-center min-h-11 px-4 rounded-control bg-fill text-accent text-subhead font-semibold"
                    >
                      Add a shop
                    </Link>
                  </div>
                </li>
              )}
              {visible.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    aria-current={m.id === selectedId || undefined}
                    className={`w-full text-left rounded-control px-3 py-3 transition-colors ${
                      m.id === selectedId ? "bg-accent-fill/12" : "hover:bg-fill"
                    }`}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-subhead font-semibold inline-flex items-center gap-1.5">
                        {m.subscribed && <GoldCar className="size-4 shrink-0" />}
                        {m.name}
                        {!m.confirmed && (
                          <span
                            title="Added by a member of the public and not yet confirmed"
                            className="text-caption font-medium rounded-control px-1.5 py-0.5 bg-warning/12 text-warning"
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

        {/*
          The card for the pin just tapped. z-30 puts it above the filter bar:
          it is the answer to a deliberate action, so it should never be the
          thing that ends up underneath. Anchored to the trailing edge so it
          does not fight the results list on the leading one.
        */}
        {selected && (
          <div className="pointer-events-auto absolute left-3 right-3 bottom-10 sm:left-auto sm:right-4 sm:w-80 z-30">
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
    <div className="rounded-control bg-fill py-2">
      <dt className="text-caption text-secondary">{label}</dt>
      <dd className="text-subhead font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
