import { redirect } from "next/navigation";
import { Card, PageTitle } from "@/components/ui";
import { currentUser } from "@/lib/auth/guards";
import { AddShopForm } from "./add-shop-form";

export default async function AddShopPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-xl mx-auto">
      <PageTitle
        title="Add a shop"
        subtitle="For places the map does not know about yet."
      />

      <Card className="mb-5">
        <h2 className="text-headline font-semibold mb-2">What happens next</h2>
        <p className="text-subhead text-secondary text-pretty">
          It appears on the map immediately, marked <strong>unconfirmed</strong>.
          It stays that way until a few different people report work there, or
          the shop claims its own listing. Unconfirmed listings cannot hold a
          subscription or carry the gold mark, so there is nothing to be gained
          by inventing one.
        </p>
      </Card>

      <AddShopForm />
    </div>
  );
}
