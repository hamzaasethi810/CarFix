"use client";

import { popoverSurface } from "@/components/ui";
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
}: {
  current: string | null;
  onChoose: (area: Area) => void;
  /** Lets the page move things out of the way while this is open. */
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Announced rather than inferred, so the page never has to guess.
  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);
  const popRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
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
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-2 min-h-11 px-4 rounded-control bg-black/[0.06] hover:bg-black/10 text-subhead font-medium transition-colors duration-150 max-w-full"
      >
        <span aria-hidden="true">◎</span>
        <span className="truncate">{current ?? "Select area"}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose an area"
          className={`absolute z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-glass p-4 ${popoverSurface}`}
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
              className="w-full min-h-11 rounded-control bg-accent-fill text-on-accent text-subhead font-semibold disabled:opacity-50"
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
                    className="w-full text-left px-3 py-2.5 rounded-control hover:bg-black/5"
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
      )}
    </div>
  );
}
