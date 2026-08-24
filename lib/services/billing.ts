import "server-only";
import type Stripe from "stripe";
import { AppError, forbidden, notFound } from "../errors";
import { env } from "../env";
import { billingConfigured, stripe } from "../providers/stripe";
import {
  claimStripeEvent,
  findShopBilling,
  releaseStripeEvent,
  setStripeCustomer,
  setSubscriptionState,
} from "../repositories/shop";
import { writeAuditLog } from "../repositories/moderation";

/*
  Subscription billing.

  The security posture, in short:

    - Card data never reaches this application. Stripe Checkout collects it on
      a page Stripe hosts and serves; we only ever store their customer and
      subscription ids.
    - Entitlement is read from our own database, written only by verified
      webhooks. A client saying "I subscribed" changes nothing.
    - Webhooks are signature-checked before any field is read, and each event
      id is claimed once so Stripe's retries cannot double-apply.
*/

/** Starts Checkout for a shop the caller actually owns. */
export async function createCheckoutSession(mechanicId: string, userId: string) {
  if (!billingConfigured() || !env.STRIPE_PRICE_ID) {
    throw new AppError("INTERNAL", "Subscriptions are not available right now.");
  }

  const shop = await findShopBilling(mechanicId);
  if (!shop) throw notFound();
  // Ownership is re-checked here, not trusted from the page that linked here.
  if (shop.claimedById !== userId) throw forbidden();

  let customerId = shop.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe().customers.create({
      name: shop.name,
      // Enough to reconcile a payment to a shop, and nothing more.
      metadata: { mechanicId: shop.id },
    });
    customerId = customer.id;
    await setStripeCustomer(shop.id, customerId);
  }

  const origin = env.APP_URL ?? "http://localhost:3000";
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
    // Carried back on the webhook so the event maps to a shop without trusting
    // anything in the return URL.
    subscription_data: { metadata: { mechanicId: shop.id } },
    success_url: `${origin}/shops/${shop.id}?subscribed=1`,
    cancel_url: `${origin}/shops/${shop.id}`,
    allow_promotion_codes: true,
  });

  if (!session.url) throw new AppError("INTERNAL", "Could not start checkout.");
  return { url: session.url };
}

/** Stripe's own billing portal, so cancellation and card updates stay on their side. */
export async function createPortalSession(mechanicId: string, userId: string) {
  if (!billingConfigured()) {
    throw new AppError("INTERNAL", "Subscriptions are not available right now.");
  }

  const shop = await findShopBilling(mechanicId);
  if (!shop) throw notFound();
  if (shop.claimedById !== userId) throw forbidden();
  if (!shop.stripeCustomerId) throw notFound();

  const origin = env.APP_URL ?? "http://localhost:3000";
  const session = await stripe().billingPortal.sessions.create({
    customer: shop.stripeCustomerId,
    return_url: `${origin}/shops/${shop.id}`,
  });

  return { url: session.url };
}

/** Stripe's statuses collapsed to the three that change what a shop can do. */
function mapStatus(status: Stripe.Subscription.Status) {
  switch (status) {
    case "active":
    case "trialing":
      return "ACTIVE" as const;
    case "past_due":
    case "unpaid":
      return "PAST_DUE" as const;
    default:
      return "CANCELED" as const;
  }
}

/**
 * Applies a verified event. Returns false when the event was already handled,
 * which is the normal case for a Stripe retry and is not an error.
 */
export async function applyWebhookEvent(event: Stripe.Event): Promise<boolean> {
  const fresh = await claimStripeEvent(event.id, event.type);
  if (!fresh) return false;

  try {
    await handleEvent(event);
  } catch (error) {
    /*
      The claim is released so Stripe's retry is treated as new work. Without
      this a transient database blip would be recorded as "handled" and the
      subscription state would stay wrong permanently.
    */
    await releaseStripeEvent(event.id);
    throw error;
  }

  return true;
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const endsAt = sub.cancel_at ?? sub.canceled_at ?? null;

      await setSubscriptionState({
        stripeCustomerId: customerId,
        status: event.type === "customer.subscription.deleted" ? "CANCELED" : mapStatus(sub.status),
        stripeSubscriptionId: sub.id,
        endsAt: endsAt ? new Date(endsAt * 1000) : null,
      });

      /*
        Audit entries need a real user as the actor, and a webhook has none —
        so the shop's owner stands in. If the shop is unclaimed there is
        nobody to attribute it to and the entry is skipped rather than
        writing a broken foreign key.
      */
      const mechanicId = sub.metadata?.mechanicId;
      if (mechanicId) {
        const shop = await findShopBilling(mechanicId);
        if (shop?.claimedById) {
          await writeAuditLog({
            actorId: shop.claimedById,
            action: `subscription.${event.type.split(".").pop()}`,
            targetType: "Mechanic",
            targetId: mechanicId,
            metadata: { status: sub.status, viaWebhook: true },
          });
        }
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (customerId) {
        await setSubscriptionState({ stripeCustomerId: customerId, status: "PAST_DUE" });
      }
      break;
    }

    default:
      // Everything else is acknowledged and ignored on purpose.
      break;
  }
}
