import "dotenv/config";
import Stripe from "stripe";

/*
  Creates the subscription product in Stripe and prints the price id to put in
  the environment.

  This has to run against your own Stripe account, so it needs STRIPE_SECRET_KEY
  set first. It is idempotent: run it twice and it finds the existing product
  rather than creating a second one.

  Usage:
    STRIPE_SECRET_KEY=sk_test_... npm run stripe:setup
*/

const PRODUCT_NAME = "Golden Shop";
const MONTHLY_CENTS = 799; // $7.99
const CURRENCY = "usd";

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error(
      "STRIPE_SECRET_KEY is not set.\n\n" +
        "Get it from https://dashboard.stripe.com/apikeys — use the test key\n" +
        "(sk_test_...) until you are ready to take real money.",
    );
    process.exit(1);
  }

  const stripe = new Stripe(key, { apiVersion: "2026-07-29.dahlia" });

  // Look for it first so re-running does not litter the account.
  const existing = await stripe.products.search({
    query: `name:"${PRODUCT_NAME}" AND active:"true"`,
  });

  const product =
    existing.data[0] ??
    (await stripe.products.create({
      name: PRODUCT_NAME,
      description:
        "Gold mark on your listing, priority placement in search, published prices, and replies to reviews.",
    }));

  console.log(`Product: ${product.name} (${product.id})`);

  const prices = await stripe.prices.list({ product: product.id, active: true });
  const match = prices.data.find(
    (p) =>
      p.unit_amount === MONTHLY_CENTS &&
      p.currency === CURRENCY &&
      p.recurring?.interval === "month",
  );

  const price =
    match ??
    (await stripe.prices.create({
      product: product.id,
      unit_amount: MONTHLY_CENTS,
      currency: CURRENCY,
      // Renews on its own until cancelled, which the billing portal handles.
      recurring: { interval: "month" },
    }));

  console.log(
    `Price:   $${(MONTHLY_CENTS / 100).toFixed(2)}/month, renews automatically (${price.id})`,
  );
  console.log(`\nAdd this to your environment:\n\n  STRIPE_PRICE_ID="${price.id}"\n`);

  console.log(
    "Then create the webhook endpoint:\n\n" +
      "  Local:      stripe listen --forward-to localhost:3000/api/billing/webhook\n" +
      "  Production: https://dashboard.stripe.com/webhooks → Add endpoint\n" +
      "              URL:    https://YOUR-DOMAIN/api/billing/webhook\n" +
      "              Events: customer.subscription.created\n" +
      "                      customer.subscription.updated\n" +
      "                      customer.subscription.deleted\n" +
      "                      invoice.payment_failed\n\n" +
      "  Copy the signing secret (whsec_...) into STRIPE_WEBHOOK_SECRET.\n" +
      "  Without it the webhook refuses every request, so no subscription is\n" +
      "  ever recorded — the signature is the only thing that authorises it.",
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
