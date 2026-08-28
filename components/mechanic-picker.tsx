"use client";

import { useEffect, useId, useRef, useState } from "react";
import { buttonStyles, popoverSurface } from "@/components/ui";
import { AddressFields, emptyAddress, type AddressValue } from "@/components/address-fields";
import { usesStates } from "@/lib/geo/regions";

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
  /*
    Somewhere to put a shop that is not listed yet.

    Without this the search was a dead end: a mechanic claiming a business the
    map had never heard of, or an owner reporting work at a new place, simply
    could not proceed. Adding it here creates the listing, drops its pin, and
    selects it — so the form they were already filling in carries on.
  */
  const [adding, setAdding] = useState(false);

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
          className="w-full min-h-11 rounded-control bg-elevated text-label text-body px-3.5 py-2.5 pr-11 border border-separator placeholder:text-tertiary-label"
        />

        {chosen && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear selected shop"
            className="absolute right-0 top-1/2 -translate-y-1/2 size-11 grid place-items-center text-secondary"
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className={`absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-control py-1 ${popoverSurface}`}
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
      {!loading && !chosen && query.trim().length >= 2 && items.length === 0 && !adding && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <p className="text-footnote text-secondary">Not listed yet?</p>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-footnote font-medium text-accent underline underline-offset-2"
          >
            Add &ldquo;{query.trim()}&rdquo; to the map
          </button>
        </div>
      )}

      {adding && (
        <AddShopInline
          initialName={query.trim()}
          onCancel={() => setAdding(false)}
          onAdded={(s) => {
            setAdding(false);
            pick(s);
          }}
        />
      )}
    </div>
  );
}

/*
  A shop being created from inside another form.

  Deliberately not a <form> element. This is rendered inside the caller's form
  — the shop claim form and the new-report form both embed the picker — and a
  form cannot contain another form. React refuses it outright, and a browser
  parsing that markup drops the inner one, which leaves its fields belonging to
  the outer form and Enter submitting a half-filled report.

  So it is a group of fields with its own submit path: Enter is caught here and
  never reaches the surrounding form, every button is type="button", and the
  required checks are done in code because there is no form element to run
  native validation for us.

  It writes through the same endpoint as the full "Add a shop" page, so the
  listing it produces is identical: geocoded from the address, pinned at the
  geocoded point rather than anything the browser supplied, and marked
  unconfirmed until people corroborate it or its owner claims it.
*/
function AddShopInline({
  initialName,
  onAdded,
  onCancel,
}: {
  initialName: string;
  onAdded: (s: Suggestion) => void;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState({ name: initialName, address: "" });
  const [where, setWhere] = useState<AddressValue>(emptyAddress());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<{ id: string; name: string } | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);

  const set = (k: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  async function send(body: Record<string, unknown>) {
    setPending(true);
    setError(null);

    const res = await fetch("/api/shops/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    setPending(false);

    if (res.ok) {
      onAdded({
        id: data.id,
        name: data.name,
        place: String(data.resolvedTo ?? "").split(",").slice(0, 2).join(",").trim(),
      });
      return;
    }

    const found = data?.error?.details?.duplicate;
    if (found && data?.error?.details?.canOverride) {
      setDuplicate(found);
      setPayload(body);
      return;
    }
    setError(data?.error?.message ?? "That shop could not be added.");
  }

  function submit() {
    // No form element, so the required checks happen here.
    if (fields.name.trim() === "" || fields.address.trim() === "" || where.city.trim() === "") {
      setError("Fill in the name, street address, and town.");
      return;
    }
    if (usesStates(where.country) && where.state === "") {
      setError("Choose a state.");
      return;
    }

    void send({
      name: fields.name.trim(),
      address: fields.address.trim(),
      city: where.city.trim(),
      state: where.state,
      country: where.country,
      zip: where.zip.trim() || null,
    });
  }

  /*
    Enter has to be caught. Without a form of its own these inputs belong to
    the surrounding one, so an unhandled Enter would submit the report the
    person is still filling in.
  */
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    e.stopPropagation();
    if (!pending) submit();
  }

  const field =
    "w-full min-h-11 rounded-control bg-elevated text-label text-body px-3.5 py-2.5 " +
    "border border-separator placeholder:text-tertiary-label";

  return (
    <div
      className="mt-2 rounded-control border border-separator bg-fill p-3 space-y-3"
      onKeyDown={onKeyDown}
    >
      <div>
        <h3 className="text-subhead font-semibold">Add this shop</h3>
        <p className="text-footnote text-secondary mt-0.5">
          We look the address up to place its pin, so it needs to be the real one.
        </p>
      </div>

      <div className="space-y-2">
        <input value={fields.name} onChange={set("name")} maxLength={200}
          aria-label="Shop name" placeholder="Shop name" className={field} />
        <input value={fields.address} onChange={set("address")} maxLength={200}
          aria-label="Street address" placeholder="Street address" className={field} />
        <AddressFields value={where} onChange={setWhere} inputClassName={field} />
      </div>

      {duplicate && (
        <div className="rounded-control bg-elevated p-3 space-y-2">
          <p className="text-footnote text-pretty">
            <strong>{duplicate.name}</strong> is already listed at that address.
            If that is the same business, pick it instead of adding it twice.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending}
              onClick={() => onAdded({ id: duplicate.id, name: duplicate.name, place: "" })}
              className="text-footnote font-medium text-accent underline underline-offset-2">
              Use {duplicate.name}
            </button>
            <button type="button" disabled={pending}
              onClick={() => payload && send({ ...payload, confirmDistinct: true })}
              className="text-footnote font-medium text-accent underline underline-offset-2">
              It is a different shop — add it
            </button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-footnote text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={submit} disabled={pending}
          className={`${buttonStyles.primary} px-4 disabled:opacity-50 text-subhead`}>
          {pending ? "Adding…" : "Add and select"}
        </button>
        <button type="button" onClick={onCancel} disabled={pending}
          className="inline-flex items-center min-h-11 px-4 rounded-control bg-elevated text-accent text-subhead font-semibold">
          Cancel
        </button>
      </div>
    </div>
  );
}
