import Link from "next/link";
import { redirect } from "next/navigation";
import { SheetHeader, SectionTitle, buttonStyles } from "@/components/ui";
import { currentUser } from "@/lib/auth/guards";
import { getMyClaims, getMyShops } from "@/lib/services/shops";
import { SettingsNav } from "../settings-nav";

/* When the claim was filed, in a form that does not need a client component. */
function filedOn(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/*
  Where a signed-in owner reaches the shop side of the product.

  The claim flow already existed at /shops/claim, but the only link to it was
  on the register screen's footer — which a signed-in person never sees, so
  there was no way in once you had an account. This lists the shops you already
  manage and gives you the way to list or claim another; each shop links to its
  own console (prices, location, subscription).
*/
export default async function ShopSettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const [shops, claims] = await Promise.all([getMyShops(user.id), getMyClaims(user.id)]);
  const nothingYet = shops.length === 0 && claims.length === 0;

  return (
    <div className="max-w-xl mx-auto">
      <SheetHeader title="Shops" meta="List and manage a business you run." />

      <div className="mt-6">
        <SettingsNav active="shops" />
      </div>

      <div className="mt-8 space-y-8">
        {shops.length > 0 && (
          <section>
            <SectionTitle>Shops you manage</SectionTitle>
            <ul className="mt-3 border-t border-separator">
              {shops.map((shop) => (
                <li key={shop.id}>
                  <Link
                    href={`/shops/${shop.id}`}
                    className="flex items-baseline justify-between gap-4 border-b border-separator py-4 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-fill transition-[background-color] duration-150 -mx-2 px-2 rounded-control"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium truncate">{shop.name}</span>
                      {shop.place && (
                        <span className="block text-footnote text-secondary truncate">{shop.place}</span>
                      )}
                    </span>
                    {shop.subscriptionStatus === "ACTIVE" && (
                      <span className="shrink-0 text-footnote font-medium text-gold">Gold</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {claims.length > 0 && (
          <section>
            <SectionTitle>Claims</SectionTitle>
            <ul className="mt-3 border-t border-separator">
              {claims.map((claim) => (
                <li
                  key={claim.id}
                  className="flex items-start justify-between gap-4 border-b border-separator py-4"
                >
                  <span className="min-w-0">
                    <span className="block font-medium truncate">{claim.shop.name}</span>
                    <span className="block text-footnote text-secondary truncate">
                      {claim.status === "PENDING"
                        ? `Submitted ${filedOn(claim.submittedAt)}`
                        : `Reviewed ${filedOn(claim.decidedAt ?? claim.submittedAt)}`}
                    </span>
                  </span>
                  {claim.status === "PENDING" ? (
                    <span className="shrink-0 inline-flex items-center rounded-full bg-fill px-2.5 py-1 text-caption1 font-medium text-secondary">
                      In review
                    </span>
                  ) : (
                    <span className="shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-caption1 font-medium text-destructive bg-[color-mix(in_srgb,var(--destructive)_12%,transparent)]">
                      Not approved
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {claims.some((c) => c.status === "REJECTED") && (
              <p className="mt-3 text-footnote text-secondary text-pretty">
                A claim we couldn&rsquo;t verify can be submitted again with clearer
                proof that you trade under the name.
              </p>
            )}
          </section>
        )}

        {nothingYet && (
          <p className="text-subhead text-secondary text-pretty">
            You don&rsquo;t manage any shops yet. If you run a garage, wrap shop or
            tuner, list it — once we&rsquo;ve verified you trade under the name, you
            can publish prices and reply to reviews.
          </p>
        )}

        <Link href="/shops/claim" className={`${buttonStyles.primary} px-6`}>
          {shops.length > 0 || claims.length > 0 ? "List another shop" : "List your shop"}
        </Link>
      </div>
    </div>
  );
}
