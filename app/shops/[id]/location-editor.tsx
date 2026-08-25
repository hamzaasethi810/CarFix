"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, ErrorText, SectionTitle, buttonStyles } from "@/components/ui";
import { Field, TextInput } from "@/components/form";
import { AddressFields, type AddressValue } from "@/components/address-fields";
import { usesStates } from "@/lib/geo/regions";

type Shop = {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string | null;
  country: string;
  phone: string | null;
  website: string | null;
};

/*
  Where the owner corrects their own listing.

  Listings come from OpenStreetMap or from whoever added them first, and both
  get addresses wrong — an old unit, the wrong side of the road, a name
  somebody guessed. The pin follows the address we geocode, so fixing the
  address here is what moves the marker on the map.
*/
export function LocationEditor({ mechanicId, shop }: { mechanicId: string; shop: Shop }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<string | null>(null);
  const [where, setWhere] = useState<AddressValue>({
    city: shop.city,
    state: shop.state,
    country: shop.country,
    zip: shop.zip ?? "",
  });

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    const text = (k: string) => {
      const v = String(formData.get(k) ?? "").trim();
      return v === "" ? null : v;
    };

    if (usesStates(where.country) && where.state === "") {
      setPending(false);
      return setError("Choose a state.");
    }

    const res = await fetch(`/api/shops/${mechanicId}/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        address: String(formData.get("address") ?? ""),
        city: where.city,
        state: where.state,
        country: where.country,
        zip: where.zip.trim() || null,
        phone: text("phone"),
        website: text("website"),
      }),
    });

    const body = await res.json().catch(() => null);
    setPending(false);

    if (!res.ok) return setError(body?.error?.message ?? "That could not be saved.");
    setResolved(body.resolvedTo ?? null);
    setEditing(false);
    router.refresh();
  }

  const place = [shop.address, shop.city, shop.state, shop.zip].filter(Boolean).join(", ");

  if (!editing) {
    return (
      <>
        <SectionTitle hint="What people see on the map.">Name and location</SectionTitle>
        <Card className="space-y-3">
          <div>
            <p className="text-headline font-semibold">{shop.name}</p>
            <p className="text-subhead text-secondary">{place}</p>
            {shop.phone && <p className="text-footnote text-secondary">{shop.phone}</p>}
          </div>
          {resolved && (
            <p className="text-footnote text-success">Pin moved to {resolved}.</p>
          )}
          <button type="button" onClick={() => setEditing(true)} className={buttonStyles.secondary}>
            Correct these details
          </button>
        </Card>
      </>
    );
  }

  return (
    <>
      <SectionTitle hint="The pin follows the address, so fixing it moves the marker.">
        Name and location
      </SectionTitle>
      <form action={onSubmit}>
        <Card className="space-y-4">
          <Field label="Shop name">
            {({ id }) => <TextInput id={id} name="name" defaultValue={shop.name} required maxLength={200} />}
          </Field>
          <Field label="Street address" hint="We look this up to place the pin.">
            {({ id, describedBy }) => (
              <TextInput id={id} aria-describedby={describedBy} name="address"
                defaultValue={shop.address} required maxLength={200} />
            )}
          </Field>
          <div>
            <span className="block text-subhead font-medium text-label mb-1.5">Where it is</span>
            <AddressFields value={where} onChange={setWhere} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone">
              {({ id }) => <TextInput id={id} name="phone" type="tel" defaultValue={shop.phone ?? ""} maxLength={40} />}
            </Field>
            <Field label="Website">
              {({ id }) => <TextInput id={id} name="website" type="url" defaultValue={shop.website ?? ""} maxLength={500} />}
            </Field>
          </div>

          {error && <ErrorText>{error}</ErrorText>}

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className={buttonStyles.primary}>
              {pending ? "Saving…" : "Save and move the pin"}
            </button>
            <button type="button" onClick={() => setEditing(false)} disabled={pending}
              className={buttonStyles.secondary}>
              Cancel
            </button>
          </div>
        </Card>
      </form>
    </>
  );
}
