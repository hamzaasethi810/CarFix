"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, ErrorText, buttonStyles } from "@/components/ui";
import { Field, TextInput } from "@/components/form";

type Status = { enabled: boolean; required: boolean; backupCodesRemaining: number };

/*
  Two-factor setup.

  The secret is staged first and only activated once a code from it verifies,
  so a mis-scanned QR can never lock someone out of their own account. Backup
  codes are shown exactly once — they are stored hashed, so we genuinely
  cannot show them again.
*/
export function MfaPanel({ initial }: { initial: Status }) {
  const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [setup, setSetup] = useState<{ secret: string; qrDataUri: string } | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function begin() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/mfa/enroll", { method: "POST" });
    const body = await res.json().catch(() => null);
    setPending(false);
    if (!res.ok) return setError(body?.error?.message ?? "Could not start setup.");
    setSetup(body);
  }

  async function confirm(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await fetch("/api/mfa/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: String(formData.get("code") ?? "") }),
    });
    const body = await res.json().catch(() => null);
    setPending(false);
    if (!res.ok) return setError(body?.error?.message ?? "That code was not correct.");
    setCodes(body.backupCodes);
    setSetup(null);
    setStatus((s) => ({ ...s, enabled: true, backupCodesRemaining: body.backupCodes.length }));
    // The confirm response re-minted the session cookie; pick up the new one
    // so the surrounding page stops treating this account as un-enrolled.
    router.refresh();
  }

  async function turnOff(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await fetch("/api/mfa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: String(formData.get("code") ?? "") }),
    });
    const body = await res.json().catch(() => null);
    setPending(false);
    if (!res.ok) return setError(body?.error?.message ?? "Could not turn it off.");
    setStatus((s) => ({ ...s, enabled: false, backupCodesRemaining: 0 }));
    router.refresh();
  }

  if (codes) {
    return (
      <Card className="space-y-4">
        <div>
          <h2 className="text-headline font-semibold">Save your backup codes</h2>
          <p className="text-subhead text-secondary mt-1">
            Each one works once, if you lose your phone. This is the only time
            they are shown — they are stored hashed, so we cannot show them again.
          </p>
        </div>

        <ul className="grid grid-cols-2 gap-2 font-mono text-subhead bg-fill rounded-control p-4">
          {codes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(codes.join("\n"))}
          className={buttonStyles.secondary}
        >
          Copy all
        </button>

        <button type="button" onClick={() => setCodes(null)} className={buttonStyles.primary}>
          I have saved them
        </button>
      </Card>
    );
  }

  if (setup) {
    return (
      <Card className="space-y-4">
        <div>
          <h2 className="text-headline font-semibold">Scan this in your authenticator</h2>
          <p className="text-subhead text-secondary mt-1">
            Duo Mobile, Google Authenticator, Authy, 1Password — any authenticator
            app. In Duo Mobile choose &ldquo;Add account&rdquo;, then
            &ldquo;Use QR code&rdquo;.
          </p>
        </div>

        {/*
          Generated on our server as a data URI. No third party ever sees the
          secret, and no external request is needed to display it.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={setup.qrDataUri} alt="" className="size-48 rounded-control bg-white p-2" />

        <div>
          <p className="text-footnote text-secondary">Or enter this key by hand:</p>
          <p className="font-mono text-subhead break-all mt-1">{setup.secret}</p>
        </div>

        <form action={confirm} className="space-y-3">
          <Field label="Enter the six-digit code it shows">
            {({ id }) => (
              <TextInput id={id} name="code" required inputMode="numeric" autoComplete="one-time-code" placeholder="123456" />
            )}
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          <button type="submit" disabled={pending} className={buttonStyles.primary}>
            {pending ? "Checking…" : "Turn on two-factor"}
          </button>
        </form>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-headline font-semibold">Two-factor authentication</h2>
          <p className="text-subhead text-secondary mt-1">
            {status.enabled
              ? `On. ${status.backupCodesRemaining} backup codes left.`
              : "A code from your phone, on top of your password."}
          </p>
        </div>
        {status.enabled && (
          <span className="text-footnote font-medium rounded-full px-2.5 py-1 bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-success">
            ✓ On
          </span>
        )}
      </div>

      {status.required && !status.enabled && (
        <p className="text-footnote text-warning">
          Required for your role. Until this is on, the review queues are closed
          to you — they reveal other people&rsquo;s receipts and identity documents.
        </p>
      )}

      {error && <ErrorText>{error}</ErrorText>}

      {status.enabled ? (
        status.required ? (
          <p className="text-subhead text-secondary">
            This cannot be turned off while your account is an administrator.
          </p>
        ) : (
          <form action={turnOff} className="space-y-3">
            <Field label="Enter a code to turn it off">
              {({ id }) => (
                <TextInput id={id} name="code" required inputMode="numeric" placeholder="123456 or a backup code" />
              )}
            </Field>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center min-h-11 px-4 rounded-full bg-transparent text-destructive text-headline font-semibold hover:bg-[color-mix(in_srgb,var(--destructive)_8%,transparent)]"
            >
              {pending ? "Working…" : "Turn off two-factor"}
            </button>
          </form>
        )
      ) : (
        <button type="button" onClick={begin} disabled={pending} className={buttonStyles.primary}>
          {pending ? "Preparing…" : "Set up two-factor"}
        </button>
      )}
    </Card>
  );
}
