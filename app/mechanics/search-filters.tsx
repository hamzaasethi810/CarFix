"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Field, Select, TextInput } from "@/components/form";
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
      <form action={onSubmit} className="grid gap-4 sm:grid-cols-4 items-end">
        <Field label="Service">
          <Select name="serviceId" defaultValue={params.get("serviceId") ?? ""}>
            <option value="">Any service</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Minimum rating">
          <Select name="minRating" defaultValue={params.get("minRating") ?? ""}>
            <option value="">Any rating</option>
            {[5, 4, 3].map((r) => (
              <option key={r} value={r}>
                {r}+ stars
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Max median price">
          <TextInput
            name="maxPrice"
            type="number"
            min={0}
            step={50}
            defaultValue={params.get("maxPrice") ?? ""}
            placeholder="Any"
          />
        </Field>

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="verifiedOnly"
              value="true"
              defaultChecked={params.get("verifiedOnly") === "true"}
            />
            Verified only
          </label>
          <button
            type="submit"
            className="w-full rounded-md bg-accent text-accent-fg px-4 py-2 text-sm font-medium"
          >
            Search
          </button>
        </div>
      </form>
    </Card>
  );
}
