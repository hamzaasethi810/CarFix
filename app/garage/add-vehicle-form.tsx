"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Select, SubmitButton, TextInput } from "@/components/form";
import { isWellFormedVin, normalizeVin } from "@/lib/vin";
import { ErrorText } from "@/components/ui";

type Option = { id: string; name: string };

type VinSummary = {
  make: string;
  model: string;
  year: number;
  generation: string;
  trim: string | null;
  engine: string | null;
  drivetrain: string | null;
};

type VinLookup = {
  prefill: {
    makeId: string;
    modelId: string;
    year: number;
    trimId: string | null;
    engineId: string | null;
    drivetrainId: string | null;
  };
  summary: VinSummary;
  warnings: string[];
};

export function AddVehicleForm({ makes }: { makes: Option[] }) {
  const router = useRouter();
  const [makeId, setMakeId] = useState("");
  const [models, setModels] = useState<Option[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [vin, setVin] = useState("");
  const [vinPending, setVinPending] = useState(false);
  const [vinError, setVinError] = useState<string | null>(null);
  const [decoded, setDecoded] = useState<VinLookup | null>(null);

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

  async function decodeVin() {
    const candidate = normalizeVin(vin);
    setVinError(null);
    setDecoded(null);

    if (!isWellFormedVin(candidate)) {
      return setVinError("A VIN is 17 characters and cannot contain I, O, or Q.");
    }

    setVinPending(true);
    const res = await fetch(`/api/vin/${encodeURIComponent(candidate)}`);
    const body = await res.json().catch(() => null);
    setVinPending(false);

    if (!res.ok) {
      return setVinError(body?.error?.message ?? "We could not decode that VIN.");
    }

    setDecoded(body);
    // Populating make also triggers the model fetch, so the manual selects stay
    // in step with what the VIN resolved to.
    setMakeId(body.prefill.makeId);
  }

  async function saveDecoded() {
    if (!decoded) return;
    setPending(true);
    setError(null);

    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        makeId: decoded.prefill.makeId,
        modelId: decoded.prefill.modelId,
        year: decoded.prefill.year,
        trimId: decoded.prefill.trimId,
        engineId: decoded.prefill.engineId,
        drivetrainId: decoded.prefill.drivetrainId,
      }),
    });

    setPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return setError(body?.error?.message ?? "We could not add that car.");
    }

    setDecoded(null);
    setVin("");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* VIN is the fast path; the manual pickers below stay available. */}
      <div className="space-y-3">
        <Field
          label="Add by VIN"
          hint="17 characters, usually on the dashboard or driver's door jamb."
        >
          {({ id, describedBy }) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              placeholder="e.g. JF1VA2M67G9829723"
              maxLength={24}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
            />
          )}
        </Field>

        <button
          type="button"
          onClick={decodeVin}
          disabled={vinPending || vin.trim().length === 0}
          className="w-full min-h-11 rounded-control bg-fill text-accent text-subhead font-semibold disabled:opacity-50"
        >
          {vinPending ? "Looking up…" : "Look up VIN"}
        </button>

        {vinError && <ErrorText>{vinError}</ErrorText>}

        {decoded && (
          <div className="rounded-control border border-separator p-3 space-y-2">
            <p className="text-subhead font-semibold">
              {decoded.summary.year} {decoded.summary.make} {decoded.summary.model}
              <span className="text-secondary font-normal"> {decoded.summary.generation}</span>
            </p>
            <p className="text-footnote text-secondary">
              {[decoded.summary.trim, decoded.summary.engine, decoded.summary.drivetrain]
                .filter(Boolean)
                .join(" · ") || "No further detail returned"}
            </p>
            {decoded.warnings.map((w) => (
              <p key={w} className="text-footnote text-warning">
                {w}
              </p>
            ))}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={saveDecoded}
                disabled={pending}
                className="flex-1 min-h-11 rounded-control bg-accent-fill text-on-accent text-subhead font-semibold disabled:opacity-50"
              >
                {pending ? "Adding…" : "Add this car"}
              </button>
              <button
                type="button"
                onClick={() => setDecoded(null)}
                className="min-h-11 px-4 rounded-control bg-fill text-accent text-subhead font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-separator" />
        <span className="text-footnote text-secondary">or enter it manually</span>
        <span className="h-px flex-1 bg-separator" />
      </div>

      <form action={onSubmit} className="space-y-4">
        <Field label="Make">
        {({ id }) => (
          <Select
            id={id}
            name="makeId"
            required
            value={makeId}
            onChange={(e) => setMakeId(e.target.value)}
          >
            <option value="">Select a make</option>
            {makes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field label="Model">
        {({ id }) => (
          <Select id={id} name="modelId" required disabled={models.length === 0}>
            <option value="">{makeId ? "Select a model" : "Pick a make first"}</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field label="Year" hint="We work out the generation from the model year.">
        {({ id, describedBy }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            name="year"
            type="number"
            inputMode="numeric"
            required
            min={1900}
            max={new Date().getFullYear() + 2}
          />
        )}
      </Field>

      <Field label="Mileage">
        {({ id, describedBy }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            name="mileage"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Optional"
          />
        )}
      </Field>

      <Field label="Nickname">
        {({ id, describedBy }) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            name="nickname"
            maxLength={60}
            placeholder="Optional"
          />
        )}
      </Field>

        {error && <ErrorText>{error}</ErrorText>}
        <SubmitButton pending={pending}>Add car</SubmitButton>
      </form>
    </div>
  );
}
