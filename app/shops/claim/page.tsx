import { redirect } from "next/navigation";
import { PageTitle } from "@/components/ui";
import { currentUser } from "@/lib/auth/guards";
import { ClaimForm } from "./claim-form";

export default async function ClaimShopPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-xl mx-auto">
      <PageTitle
        title="Claim your shop"
        subtitle="Find your listing, then show us you trade under that name."
      />
      <ClaimForm />
    </div>
  );
}
