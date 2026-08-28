"use client";

import { AnchoredMenu } from "@/components/anchored-menu";
import { buttonStyles, popoverSurface } from "@/components/ui";
import { useEffect, useRef, useState } from "react";

export type Area = { label: string; lat: number; lng: number; suggestedRadiusMiles: number };

/*
  Lets someone search anywhere rather than being stuck wherever the browser
  placed them. Accepts a city, postcode, state, or country — Nominatim resolves
  all of them — and the chosen point becomes the search anchor, which in turn
  pulls that area's shops in from OpenStreetMap.
*/
export function AreaPicker({
  current,
  onChoose,
  onOpenChange,
  initialOpen = false,
}: {
  current: string | null;
  onChoose: (area: Area) => void;
  /** Lets the page move things out of the way while this is open. */
  onOpenChange?: (open: boolean) => void;
  /**
   * Opens the popover as soon as it mounts, rather than waiting for its own
   * trigger to be clicked — for a caller that mounts this component *as*
   * the response to something else (e.g. the globe opening it after
   * geolocation is refused, so declining isn't a dead end). Read once, on
   * first render only, like any other `useState` initializer; a caller that
   * needs to reopen it later should remount rather than toggle this prop.
   */
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Announced rather than inferred, so the page never has to guess.
  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);
  const popRef = useRef<HTMLDivElement>(null);
  /* The trigger's box — what the portalled popover anchors to. */
  const triggerRef = useRef<HTMLButtonElement>(null);
  /* The popover itself, once portalled: no longer inside popRef. */
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      /*
        The panel is portalled to document.body now, so it is not inside
        popRef. Without checking it too, typing an address counts as clicking
        outside and closes the popover mid-keystroke — which is exactly what
        "the address stays stuck in the box" was.
      */
      if (popRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;

    setLoading(true);
    setError(null);
    setResults([]);

    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
    const body = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) return setError(body?.error?.message ?? "Could not look that up.");
    if (!Array.isArray(body) || body.length === 0)
      return setError("No place matched. Try adding a state or country.");

    setResults(body);
  }

  function choose(a: Area) {
    onChoose(a);
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  return (
    <div ref={popRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        ref={triggerRef}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-2 min-h-11 px-4 rounded-control bg-white/[0.06] hover:bg-fill text-subhead font-medium transition-colors duration-150 max-w-full"
      >
        <span aria-hidden="true">◎</span>
        <span className="truncate">{current ?? "Select area"}</span>
      </button>

      <AnchoredMenu anchorRef={triggerRef} open={open}>
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Choose an area"
          className={`w-[min(22rem,calc(100vw-2rem))] rounded-glass p-4 ${popoverSurface}`}
        >
          <form onSubmit={submit} className="space-y-3">
            <label className="block">
              <span className="block text-subhead font-semibold mb-1">Search anywhere</span>
              <span className="block text-footnote text-secondary mb-2">
                A city, postcode, state, or country all work — for example
                &ldquo;78701&rdquo;, &ldquo;Austin, Texas&rdquo;, or &ldquo;Munich, Germany&rdquo;.
              </span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="City, postcode, state, or country"
                autoComplete="off"
                className="w-full min-h-11 rounded-control bg-elevated border border-separator px-3.5 text-body"
              />
            </label>

            <button
              type="submit"
              disabled={loading || query.trim().length < 2}
              className={`${buttonStyles.primary} w-full disabled:opacity-50 text-subhead`}
            >
              {loading ? "Looking up…" : "Find this area"}
            </button>
          </form>

          {error && (
            <p role="alert" className="mt-3 text-footnote text-destructive">
              {error}
            </p>
          )}

          {results.length > 0 && (
            <ul className="mt-3 max-h-64 overflow-y-auto -mx-1">
              {results.map((r) => (
                <li key={`${r.lat},${r.lng}`}>
                  <button
                    type="button"
                    onClick={() => choose(r)}
                    className="w-full text-left px-3 py-2.5 rounded-control hover:bg-fill"
                  >
                    <span className="block text-subhead">{r.label}</span>
                    <span className="block text-footnote text-secondary">
                      Searches about {r.suggestedRadiusMiles} miles around here
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </AnchoredMenu>
    </div>
  );
}
