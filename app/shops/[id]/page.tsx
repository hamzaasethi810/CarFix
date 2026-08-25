import { notFound, redirect } from "next/navigation";
import { PageTitle } from "@/components/ui";
import { currentUser } from "@/lib/auth/guards";
import { getMechanic } from "@/lib/services/mechanics";
import { getMyShops, getShopPrices } from "@/lib/services/shops";
import { billingConfigured } from "@/lib/providers/stripe";
import { AppError } from "@/lib/errors";
import { SubscriptionPanel } from "./subscription-panel";
import { PriceEditor } from "./price-editor";
import { LocationEditor } from "./location-editor";
import { getServices } from "@/lib/services/taxonomy";

// The owner's console for a shop they have had approved.
export default async function ShopAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/login");

  const mine = await getMyShops(user.id);
  const owned = mine.find((s) => s.id === id);
  // Not an error page: someone who does not own this shop simply sees its
  // public listing instead.
  if (!owned) redirect(`/mechanics/${id}`);

  const [shop, prices, services] = await Promise.all([
    getMechanic(id).catch((e) => {
      if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
      throw e;
    }),
    getShopPrices(id),
    getServices(),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <PageTitle title={shop.name} subtitle={owned.place || "Your shop"} />

      <SubscriptionPanel
        mechanicId={id}
        status={owned.subscriptionStatus}
        endsAt={owned.subscriptionEndsAt}
        billingAvailable={billingConfigured()}
      />

      {/*
        Placed above pricing because a listing at the wrong address is the
        thing an owner most often arrives here to fix — listings come from
        OpenStreetMap or from whoever added them, and both get it wrong.
      */}
      <LocationEditor
        mechanicId={id}
        shop={{
          name: shop.name,
          address: shop.address,
          city: shop.city,
          state: shop.state,
          zip: shop.zip,
          country: shop.country,
          phone: shop.phone,
          website: shop.website,
        }}
      />

      <PriceEditor mechanicId={id} initial={prices} services={services} />
    </div>
  );
}
