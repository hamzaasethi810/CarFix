"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Select, SubmitButton, TextInput } from "@/components/form";
import { ErrorText } from "@/components/ui";

type Option = { id: string; name: string };

export function AddVehicleForm({ makes }: { makes: Option[] }) {
  const router = useRouter();
  const [makeId, setMakeId] = useState("");
  const [models, setModels] = useState<Option[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;

    if (!makeId) {
      queueMicrotask(() => active && setModels([]));
      return () => {
        active = false;
      };
    }

    fetch(`/api/taxonomy?resource=models&makeId=${encodeURIComponent(makeId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => active && setModels(data))
      .catch(() => active && setModels([]));

    return () => {
      active = false;
    };
  }, [makeId]);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    const payload: Record<string, unknown> = {
      makeId: formData.get("makeId"),
      modelId: formData.get("modelId"),
      year: Number(formData.get("year")),
    };
    const mileage = formData.get("mileage");
    if (mileage) payload.mileage = Number(mileage);
    const nickname = formData.get("nickname");
    if (nickname) payload.nickname = String(nickname);

    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setPending(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return setError(body?.error?.message ?? "We could not add that car.");
    }

    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <Field label="Make">
        <Select name="makeId" required value={makeId} onChange={(e) => setMakeId(e.target.value)}>
          <option value="">Select a make</option>
          {makes.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Model">
        <Select name="modelId" required disabled={models.length === 0}>
          <option value="">{makeId ? "Select a model" : "Pick a make first"}</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Year" hint="We work out the generation from the model year.">
        <TextInput name="year" type="number" required min={1900} max={new Date().getFullYear() + 2} />
      </Field>

      <Field label="Mileage">
        <TextInput name="mileage" type="number" min={0} placeholder="Optional" />
      </Field>

      <Field label="Nickname">
        <TextInput name="nickname" maxLength={60} placeholder="Optional" />
      </Field>

      {error && <ErrorText>{error}</ErrorText>}
      <SubmitButton pending={pending}>Add car</SubmitButton>
    </form>
  );
}
