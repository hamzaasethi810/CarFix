"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CheckboxRow, Field, Select, TextInput } from "@/components/form";
import { Card } from "@/components/ui";

export function SearchFilters({ services }: { services: { id: string; name: string }[] }) {
  const router = useRouter();
  const params = useSearchParams();

  function onSubmit(formData: FormData) {
    const next = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      const v = String(value).trim();
      if (v) next.set(key, v);
    }
    router.push(`/mechanics?${next.toString()}`);
  }

  return (
    <Card>
      <form action={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <Field label="Service">
          {({ id }) => (
            <Select id={id} name="serviceId" defaultValue={params.get("serviceId") ?? ""}>
              <option value="">Any service</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Minimum rating">
          {({ id }) => (
            <Select id={id} name="minRating" defaultValue={params.get("minRating") ?? ""}>
              <option value="">Any rating</option>
              {[5, 4, 3].map((r) => (
                <option key={r} value={r}>
                  {r} stars and up
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Max median price">
          {({ id, describedBy }) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              name="maxPrice"
              type="number"
              min={0}
              step={50}
              inputMode="numeric"
              defaultValue={params.get("maxPrice") ?? ""}
              placeholder="Any"
            />
          )}
        </Field>

        <div className="flex flex-col gap-2">
          <CheckboxRow
            name="verifiedOnly"
            label="Verified only"
            value="true"
            defaultChecked={params.get("verifiedOnly") === "true"}
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center min-h-11 px-4 rounded-control bg-accent text-on-accent text-headline font-semibold hover:bg-accent-hover transition-colors duration-150"
          >
            Search
          </button>
        </div>
      </form>
    </Card>
  );
}
