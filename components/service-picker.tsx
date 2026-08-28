"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnchoredMenu } from "@/components/anchored-menu";

export type ServiceOption = { id: string; name: string; category: string };

/*
  Search-as-you-type service picker.

  With 62 services across eight categories a dropdown is a wall of text, and
  scanning it is slower than typing "wrap". The full list is fetched once and
  filtered in memory afterwards — it is small and static, so a request per
  keystroke would be pure waste.

  Matching is prefix-first: typing "br" surfaces "Brake pads" above
  "Fuel system upgrade", because a word starting with what you typed is almost
  always what you meant.
*/
export function ServicePicker({
  value,
  onChange,
  onOpenChange,
  label = "Service",
  anyLabel = "Any service",
}: {
  value: string;
  onChange: (id: string) => void;
  /** Lets the page move things out of the way while this is open. */
  onOpenChange?: (open: boolean) => void;
  label?: string;
  anyLabel?: string;
}) {
  const id = useId();
  const listId = `${id}-list`;

  const [all, setAll] = useState<ServiceOption[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  /* The input's own box — what the portalled menu anchors itself to. */
  const fieldRef = useRef<HTMLDivElement>(null);

  // One request for the whole list; filtering afterwards is instant.
  useEffect(() => {
    let live = true;
    fetch("/api/services/search")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: ServiceOption[]) => live && setAll(d))
      .catch(() => live && setAll([]));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      /*
        The menu now lives in a portal on document.body, so it is NOT inside
        boxRef any more. Without the second check, clicking an option counts as
        an outside click and closes the menu before the choice lands — the
        picker would look like it simply refused to accept anything.
      */
      const inField = boxRef.current?.contains(target);
      const inMenu = (target as HTMLElement)?.closest?.(`#${CSS.escape(listId)}`);
      if (!inField && !inMenu) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
    // listId is used inside, so it belongs here even though useId keeps it stable.
  }, [listId]);

  const selected = useMemo(() => all.find((s) => s.id === value) ?? null, [all, value]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") return all.slice(0, 40);

    const scored = all
      .map((s) => {
        const name = s.name.toLowerCase();
        const words = name.split(/[\s/+()-]+/);
        // 0 = the name starts with it, 1 = some word does, 2 = appears anywhere.
        const rank = name.startsWith(q)
          ? 0
          : words.some((w) => w.startsWith(q))
            ? 1
            : name.includes(q) || s.category.toLowerCase().includes(q)
              ? 2
              : 3;
        return { s, rank };
      })
      .filter((x) => x.rank < 3)
      .sort((a, b) => a.rank - b.rank || a.s.name.localeCompare(b.s.name));

    return scored.slice(0, 40).map((x) => x.s);
  }, [all, query]);

  function pick(option: ServiceOption | null) {
    onChange(option?.id ?? "");
    setQuery("");
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % Math.max(matches.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + matches.length) % Math.max(matches.length, 1));
    } else if (e.key === "Enter" && active >= 0 && matches[active]) {
      e.preventDefault();
      pick(matches[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <label htmlFor={id} className="block text-footnote font-medium mb-1">
        {label}
      </label>

      <div className="relative" ref={fieldRef}>
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          value={open ? query : (selected?.name ?? "")}
          placeholder={selected ? selected.name : anyLabel}
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={onKeyDown}
          className="w-full min-h-11 rounded-control bg-elevated/90 border border-separator px-3 pr-11 text-subhead"
        />

        {selected && !open && (
          <button
            type="button"
            onClick={() => pick(null)}
            aria-label="Clear service"
            className="absolute right-0 top-1/2 -translate-y-1/2 size-11 grid place-items-center text-secondary"
          >
            ×
          </button>
        )}
      </div>

      <AnchoredMenu anchorRef={fieldRef} open={open}>
        <ul
          id={listId}
          role="listbox"
          className="max-h-72 overflow-y-auto rounded-control bg-elevated shadow-raised border border-separator py-1"
        >
          <li
            role="option"
            aria-selected={value === ""}
            onMouseDown={(e) => {
              e.preventDefault();
              pick(null);
            }}
            className="px-3 py-2 cursor-pointer text-subhead text-secondary hover:bg-fill"
          >
            {anyLabel}
          </li>

          {matches.map((s, i) => (
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
              className={`px-3 py-2 cursor-pointer ${i === active ? "bg-fill" : ""}`}
            >
              <span className="block text-subhead">{s.name}</span>
              <span className="block text-caption text-secondary">{s.category}</span>
            </li>
          ))}

          {matches.length === 0 && (
            <li className="px-3 py-3 text-subhead text-secondary">No service matched.</li>
          )}
        </ul>
      </AnchoredMenu>
    </div>
  );
}
