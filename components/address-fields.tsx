"use client";

import { COUNTRIES, DEFAULT_COUNTRY, US_STATES, usesStates } from "@/lib/geo/regions";

/*
  Town, country, and — only where the concept exists — a state.

  The state field is not merely optional outside the United States, it is
  absent. Showing a disabled or empty "State" box to somebody in Germany
  invites them to put something in it, and whatever they put ends up in the
  geocoder query and makes the address harder to find, not easier.
*/

export type AddressValue = {
  city: string;
  state: string;
  country: string;
  zip: string;
};

export const emptyAddress = (): AddressValue => ({
  city: "",
  state: "",
  country: DEFAULT_COUNTRY,
  zip: "",
});

export function AddressFields({
  value,
  onChange,
  className = "",
  inputClassName,
}: {
  value: AddressValue;
  onChange: (next: AddressValue) => void;
  className?: string;
  inputClassName?: string;
}) {
  const field =
    inputClassName ??
    "w-full min-h-11 rounded-control bg-elevated text-label text-body px-3.5 py-2.5 " +
      "border border-separator placeholder:text-tertiary-label";

  const set = (patch: Partial<AddressValue>) => onChange({ ...value, ...patch });
  const showState = usesStates(value.country);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="grid grid-cols-2 gap-2">
        <input
          value={value.city}
          onChange={(e) => set({ city: e.target.value })}
          maxLength={100}
          aria-label="Town or city"
          placeholder="Town or city"
          className={field}
        />
        <select
          value={value.country}
          /*
            Changing country clears the state. Keeping "TX" while the country
            says Germany would send a nonsense line to the geocoder, and the
            person has no field on screen to correct it with.
          */
          onChange={(e) =>
            set({
              country: e.target.value,
              state: usesStates(e.target.value) ? value.state : "",
            })
          }
          aria-label="Country"
          className={field}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {showState && (
          <select
            value={value.state}
            onChange={(e) => set({ state: e.target.value })}
            aria-label="State"
            className={field}
          >
            <option value="">Choose a state</option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        <input
          value={value.zip}
          onChange={(e) => set({ zip: e.target.value })}
          maxLength={20}
          aria-label={showState ? "ZIP code" : "Postcode"}
          placeholder={showState ? "ZIP code" : "Postcode"}
          className={`${field} ${showState ? "" : "col-span-2"}`}
        />
      </div>
    </div>
  );
}
