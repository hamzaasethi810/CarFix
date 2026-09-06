"use client";

import { useState } from "react";
import { ErrorText, Sheet, Tag, formatDate } from "@/components/ui";
import { buttonStyles } from "@/components/ui";

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
    <Sheet className="p-5 space-y-4">
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

        {active && <Tag tone="gold">Subscribed</Tag>}
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
              className={`${buttonStyles.primary} justify-center px-6 disabled:opacity-50 text-subhead`}
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
    </Sheet>
  );
}

