"use client";

import { useState } from "react";
import { Card, ErrorText, formatDate } from "@/components/ui";

type Status = "NONE" | "ACTIVE" | "PAST_DUE" | "CANCELED";

/*
  Subscribe and cancel are deliberately the same weight: one click each, both
  on screen at the same time, neither hidden behind a menu or a confirmation
  maze. Making cancellation harder than signing up is a dark pattern, and in
  several jurisdictions it is also unlawful.

  Cancelling opens Stripe's own billing portal, which is where the card lives —
  we never handle it, so we are not in a position to hold it hostage either.
*/
export function SubscriptionPanel({
  mechanicId,
  status,
  endsAt,
  billingAvailable,
}: {
  mechanicId: string;
  status: Status;
  endsAt: string | null;
  billingAvailable: boolean;
}) {
  const [pending, setPending] = useState<"subscribe" | "manage" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(kind: "subscribe" | "manage") {
    setPending(kind);
    setError(null);

    const res = await fetch(kind === "subscribe" ? "/api/billing/checkout" : "/api/billing/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mechanicId }),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.url) {
      setPending(null);
      return setError(body?.error?.message ?? "Could not open the billing page.");
    }

    // Straight to Stripe: the card is entered on their page, never ours.
    window.location.href = body.url;
  }

  const active = status === "ACTIVE";

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-headline font-semibold">Shop subscription</h2>
          <p className="text-subhead text-secondary mt-1">
            {active
              ? "Your listing carries the gold mark and appears above unsubscribed shops."
              : status === "PAST_DUE"
                ? "The last payment did not go through. Update your card to keep the gold mark."
                : "Claim the gold mark, publish your prices, and appear above unsubscribed shops."}
          </p>
        </div>

        {active && (
          <span className="inline-flex items-center gap-1.5 text-footnote font-semibold rounded-control px-3 py-1.5 bg-[color-mix(in_srgb,#b8860b_15%,transparent)] text-[#8a6508]">
            <GoldCar className="size-4" /> Subscribed
          </span>
        )}
      </div>

      {endsAt && (
        <p className="text-footnote text-secondary">
          {active ? "Renews" : "Access ends"} {formatDate(endsAt)}.
        </p>
      )}

      {!billingAvailable ? (
        <p className="text-footnote text-secondary">
          Subscriptions are not configured on this deployment yet.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {active || status === "PAST_DUE" ? (
            <>
              {/*
                Cancel is a plain button with red text — no fill, no border, no
                extra step. It sits first so it is never the harder option.
              */}
              <button
                type="button"
                onClick={() => go("manage")}
                disabled={pending !== null}
                className="inline-flex items-center justify-center min-h-11 px-4 rounded-control bg-transparent text-destructive text-headline font-semibold hover:bg-[color-mix(in_srgb,var(--destructive)_8%,transparent)] transition-colors duration-150 disabled:opacity-50"
              >
                {pending === "manage" ? "Opening…" : "Cancel subscription"}
              </button>
              <span className="text-footnote text-secondary">
                Cancels immediately in Stripe. No email, no phone call.
              </span>
            </>
          ) : (
            <button
              type="button"
              onClick={() => go("subscribe")}
              disabled={pending !== null}
              className="inline-flex items-center justify-center min-h-11 px-6 rounded-control bg-accent-fill text-on-accent text-headline font-semibold hover:bg-accent-hover transition-colors duration-150 disabled:opacity-50"
            >
              {pending === "subscribe" ? "Opening…" : "Subscribe"}
            </button>
          )}
        </div>
      )}

      {error && <ErrorText>{error}</ErrorText>}

      <p className="text-footnote text-secondary border-t border-separator pt-3">
        Payment is handled entirely by Stripe. Card details are entered on their
        page and never reach this site.
      </p>
    </Card>
  );
}

/** The gold mark that identifies a subscribing shop. */
export function GoldCar({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label="Subscribed shop">
      <defs>
        <linearGradient id="goldcar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f3d27a" />
          <stop offset="55%" stopColor="#d4a017" />
          <stop offset="100%" stopColor="#9a6f06" />
        </linearGradient>
      </defs>
      <path
        fill="url(#goldcar)"
        d="M5 15.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Zm11 0a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0ZM3.3 13l1.2-4.1A2.5 2.5 0 0 1 6.9 7h10.2a2.5 2.5 0 0 1 2.4 1.9L20.7 13a1.6 1.6 0 0 1 .3.9v2.6a.9.9 0 0 1-.9.9h-1.2a2.9 2.9 0 0 0-5.8 0h-2.2a2.9 2.9 0 0 0-5.8 0H3.9a.9.9 0 0 1-.9-.9v-2.6c0-.32.1-.63.3-.9Zm2.4-.7h12.6l-.9-3a.7.7 0 0 0-.7-.5H7.3a.7.7 0 0 0-.7.5Z"
      />
    </svg>
  );
}
