import { redirect } from "next/navigation";
import { SheetHeader } from "@/components/ui";
import { currentUser } from "@/lib/auth/guards";
import { ClaimForm } from "./claim-form";

export default async function ClaimShopPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-xl mx-auto">
      <SheetHeader
        title="Claim your shop"
        meta="Find your listing, then show us you trade under that name."
      />
      <div className="mt-8">
        <ClaimForm />
      </div>
    </div>
  );
}
