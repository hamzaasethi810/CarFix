import "server-only";
import Stripe from "stripe";
import { AppError } from "../errors";
import { env } from "../env";

/*
  Stripe, used in the configuration that keeps card data entirely out of this
  application.

  Everything goes through Stripe Checkout: the shop is redirected to a page
  Stripe hosts, enters their card there, and comes back. No card number, CVC,
  or expiry ever reaches our servers, our logs, or our database — we only ever
  hold Stripe's customer and subscription identifiers. That is what puts the
  deployment in PCI SAQ-A, the lightest scope there is, and it is why a
  breach here cannot expose anyone's card.

  The secret key is server-only. There is no publishable key in the client
  because the client never talks to Stripe directly.
*/

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new AppError("INTERNAL", "Subscriptions are not available right now.");
  }
  if (!client) {
    client = new Stripe(env.STRIPE_SECRET_KEY, {
      // Pinned so a Stripe-side version change cannot silently alter behaviour.
      apiVersion: "2026-07-29.dahlia",
      typescript: true,
      maxNetworkRetries: 2,
    });
  }
  return client;
}

export const billingConfigured = () =>
  Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.STRIPE_PRICE_ID);

/**
 * Verifies a webhook came from Stripe.
 *
 * Without this any anonymous caller could POST "subscription active" and grant
 * themselves a paid listing, so the raw body is checked against the signature
 * header before a single field is read.
 */
export function verifyWebhook(rawBody: string, signature: string | null): Stripe.Event {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new AppError("INTERNAL", "Webhooks are not configured.");
  }
  if (!signature) {
    throw new AppError("FORBIDDEN", "Missing signature.");
  }

  try {
    return stripe().webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    // Deliberately vague: a caller probing the endpoint learns nothing.
    throw new AppError("FORBIDDEN", "Invalid signature.");
  }
}
