"use client";

import { useEffect, useId, useRef, useState } from "react";

type Suggestion = { id: string; name: string; place: string };

/*
  Search-as-you-type shop picker. There can be hundreds of thousands of shops
  once OpenStreetMap ingestion has run, so a <select> is not an option —
  matching happens in Postgres and only a handful of rows ever reach the
  browser.

  Built as an ARIA combobox so it is usable from the keyboard: arrows move
  through suggestions, Enter picks, Escape closes.
*/
export function MechanicPicker({
  name,
  required,
  onSelect,
}: {
  name: string;
  required?: boolean;
  onSelect?: (id: string | null) => void;
}) {
  const id = useId();
  const listId = `${id}-list`;

  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [chosen, setChosen] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced so typing does not fire a request per keystroke.
  useEffect(() => {
    let live = true;

    if (chosen || query.trim().length < 2) {
      // Deferred so the effect body does not set state synchronously.
      queueMicrotask(() => live && setItems([]));
      return () => {
        live = false;
      };
    }

    queueMicrotask(() => live && setLoading(true));
    const timer = setTimeout(() => {
      fetch(`/api/mechanics/suggest?q=${encodeURIComponent(query.trim())}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((d: Suggestion[]) => {
          if (!live) return;
          setItems(d);
          setOpen(d.length > 0);
          setActive(-1);
        })
        .catch(() => live && setItems([]))
        .finally(() => live && setLoading(false));
    }, 220);

    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query, chosen]);

  // Clicking away closes the list.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(s: Suggestion) {
    setChosen(s);
    setQuery(`${s.name}${s.place ? ` — ${s.place}` : ""}`);
    setOpen(false);
    setActive(-1);
    onSelect?.(s.id);
  }

  function clear() {
    setChosen(null);
    setQuery("");
    setItems([]);
    onSelect?.(null);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pick(items[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      {/* The form submits the id, never the typed text. */}
      <input type="hidden" name={name} value={chosen?.id ?? ""} />

      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          required={required && !chosen}
          value={query}
          placeholder="Start typing a shop or town…"
          onChange={(e) => {
            setQuery(e.target.value);
            if (chosen) {
              setChosen(null);
              onSelect?.(null);
            }
          }}
          onFocus={() => items.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full min-h-11 rounded-control bg-elevated text-label text-body px-3.5 py-2.5 pr-10 border border-separator placeholder:text-tertiary-label"
        />

        {chosen && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear selected shop"
            className="absolute right-1 top-1/2 -translate-y-1/2 size-9 grid place-items-center text-secondary"
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-control bg-elevated shadow-raised border border-separator py-1"
        >
          {items.map((s, i) => (
            <li
              key={s.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s);
              }}
              className={`px-3 py-2.5 cursor-pointer ${i === active ? "bg-fill" : ""}`}
            >
              <span className="block text-subhead font-medium">{s.name}</span>
              {s.place && <span className="block text-footnote text-secondary">{s.place}</span>}
            </li>
          ))}
        </ul>
      )}

      {loading && query.trim().length >= 2 && !chosen && (
        <p className="mt-1 text-footnote text-secondary">Searching…</p>
      )}
      {!loading && !chosen && query.trim().length >= 2 && items.length === 0 && (
        <p className="mt-1 text-footnote text-secondary">
          No shops matched. Search the map first to pull shops into your area.
        </p>
      )}
    </div>
  );
}
