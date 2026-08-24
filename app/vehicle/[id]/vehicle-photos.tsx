"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, ErrorText } from "@/components/ui";

const SLOTS = [
  { key: "FRONT", label: "Front" },
  { key: "BACK", label: "Back" },
  { key: "INTERIOR", label: "Interior" },
] as const;

export function VehiclePhotos({
  vehicleId,
  slots,
  editable,
}: {
  vehicleId: string;
  slots: string[];
  editable: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function upload(slot: string, file: File) {
    setBusy(slot);
    setError(null);

    const form = new FormData();
    form.set("slot", slot);
    form.set("file", file);

    const res = await fetch(`/api/vehicles/${vehicleId}/photos`, { method: "PUT", body: form });
    setBusy(null);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return setError(body?.error?.message ?? "That photo could not be uploaded.");
    }
    router.refresh();
  }

  return (
    <section>
      <h2 className="text-lg font-medium mb-3">Photos</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {SLOTS.map(({ key, label }) => {
          const has = slots.includes(key);
          return (
            <Card key={key}>
              <p className="text-sm font-medium mb-2">{label}</p>
              {has ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/media/vehicle/${vehicleId}/${key.toLowerCase()}`}
                  alt={`${label} view`}
                  className="w-full aspect-4/3 object-cover rounded-md"
                />
              ) : (
                <div className="w-full aspect-4/3 rounded-md border border-dashed border-border grid place-items-center text-muted text-sm">
                  No photo
                </div>
              )}

              {editable && (
                <label className="mt-3 block text-sm text-muted">
                  {busy === key ? "Uploading…" : has ? "Replace" : "Upload"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="mt-1 block w-full text-xs"
                    disabled={busy !== null}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void upload(key, file);
                    }}
                  />
                </label>
              )}
            </Card>
          );
        })}
      </div>
      {error && (
        <div className="mt-2">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
    </section>
  );
}
