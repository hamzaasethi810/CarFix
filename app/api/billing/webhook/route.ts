import { NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/providers/stripe";
import { applyWebhookEvent } from "@/lib/services/billing";
import { AppError } from "@/lib/errors";

/*
  Stripe posts here. Two rules govern this route:

  1. The signature is verified against the RAW body before any field is read.
     Without that, anyone could POST "subscription active" and hand themselves
     a paid listing.
  2. Anything other than a 2xx makes Stripe retry, so a genuine failure must
     return 500 — but an event we have already handled returns 200, because
     the work is done and retrying would achieve nothing.

  There is no authentication here by design; the signature IS the authentication.
*/
export async function POST(req: Request) {
  // Must be the exact bytes Stripe signed — parsing first would break it.
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event;
  try {
    event = verifyWebhook(rawBody, signature);
  } catch (error) {
    const status = error instanceof AppError ? error.status : 400;
    // Not retryable: a bad signature will never become a good one.
    return NextResponse.json({ received: false }, { status });
  }

  try {
    const applied = await applyWebhookEvent(event);
    return NextResponse.json({ received: true, applied });
  } catch (error) {
    console.error("[stripe] failed to apply event", { id: event.id, type: event.type, error });
    // 500 so Stripe retries; the event id was claimed, so see the note below.
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
