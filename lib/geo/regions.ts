/*
  Countries, and the subdivisions that matter for an address.

  Only the United States gets a subdivision list here. That is not a shortcut:
  "state" is a required part of a US postal address and people expect to pick
  one, whereas most countries either have no such level or do not use it when
  writing an address, and offering an empty or wrong-shaped dropdown is worse
  than not asking. Other countries can be added the same way when there is a
  reason to.

  Plain data with no import of anything else, so it is usable from a client
  component and from the server without dragging either into the other.
*/

export const DEFAULT_COUNTRY = "US";

/** ISO 3166-1 alpha-2, with the names people actually type. */
export const COUNTRIES: { code: string; name: string }[] = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "IE", name: "Ireland" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "PT", name: "Portugal" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czechia" },
  { code: "MX", name: "Mexico" },
  { code: "BR", name: "Brazil" },
  { code: "AR", name: "Argentina" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "SG", name: "Singapore" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "ZA", name: "South Africa" },
  { code: "IN", name: "India" },
];

/** The states, districts and territories that appear in a US postal address. */
export const US_STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" }, { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" }, { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" }, { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" }, { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" }, { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" }, { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "PR", name: "Puerto Rico" }, { code: "VI", name: "U.S. Virgin Islands" },
  { code: "GU", name: "Guam" }, { code: "AS", name: "American Samoa" },
  { code: "MP", name: "Northern Mariana Islands" },
];

const COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code));
const STATE_CODES = new Set(US_STATES.map((s) => s.code));

export const isKnownCountry = (code: string) => COUNTRY_CODES.has(code);

/** Whether this country asks for a state as part of its address. */
export const usesStates = (country: string) => country === "US";

export const isKnownUsState = (code: string) => STATE_CODES.has(code);

export const countryName = (code: string) =>
  COUNTRIES.find((c) => c.code === code)?.name ?? code;

/** What the geocoder should be given, in the order it expects. */
export function addressQuery(parts: {
  address: string;
  city: string;
  state?: string | null;
  zip?: string | null;
  country: string;
}) {
  return [
    parts.address,
    parts.city,
    usesStates(parts.country) ? parts.state : null,
    parts.zip,
    countryName(parts.country),
  ]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(", ");
}
