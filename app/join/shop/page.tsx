import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, PageTitle } from "@/components/ui";
import { currentUser } from "@/lib/auth/guards";
import { ShopSignupForm } from "./shop-signup-form";

/*
  Shops get their own route rather than sharing the owner sign-up screen. The
  two audiences want different things on arrival, and mixing them made both
  harder to read.
*/
export default async function JoinShopPage() {
  const user = await currentUser();
  // Already signed in? Go straight to the part that actually needs doing.
  if (user) redirect("/shops/claim");

  return (
    <div className="max-w-md mx-auto">
      <PageTitle
        title="List your shop"
        subtitle="Create your account, then verify you run the business."
      />

      <Card className="mb-5">
        <h2 className="text-headline font-semibold mb-2">How it works</h2>
        <ol className="space-y-2 text-subhead text-secondary">
          <li>1. Create your account below.</li>
          <li>2. Find your shop and upload something showing you trade under that name.</li>
          <li>3. Once approved, publish your prices and reply to reviews.</li>
          <li>4. Subscribe for the gold mark if you want it. Cancel any time, one click.</li>
        </ol>
      </Card>

      <ShopSignupForm />

      <p className="text-subhead text-secondary text-center mt-6">
        Looking to log work on your own car?{" "}
        <Link href="/register" className="text-accent font-medium">
          Join as an owner
        </Link>
      </p>
    </div>
  );
}
