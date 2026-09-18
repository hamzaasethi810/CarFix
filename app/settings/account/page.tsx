import Link from "next/link";
import { redirect } from "next/navigation";
import { SheetHeader } from "@/components/ui";
import { currentUser } from "@/lib/auth/guards";
import { getOwnProfile } from "@/lib/services/account";
import { SettingsNav } from "../settings-nav";
import { DisplayNameForm, UsernameForm } from "./profile-forms";

/*
  Account settings: the two public names.

  Password, two-factor and deleting the account live on the Security tab, which
  is one click away — kept apart because those are credential changes, not
  profile edits, and because the security screen already exists and is where a
  person looks for them.
*/
export default async function AccountSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const profile = await getOwnProfile(user.id);
  const params = await searchParams;
  // Set on the first sign-in with Google, where the name was filled in from the
  // Google profile rather than chosen (see /welcome).
  const welcome = params.welcome === "1";

  return (
    <div className="max-w-xl mx-auto">
      <SheetHeader title="Account" meta="Your public name and handle." />

      <div className="mt-6">
        <SettingsNav active="account" />
      </div>

      {welcome && (
        <p
          role="status"
          className="mt-6 border-l-2 border-accent bg-grouped px-3 py-2.5 text-subhead text-label"
        >
          Welcome to WrenchRates. We filled these in from your Google account —
          keep them or make them yours.
        </p>
      )}

      <div className="mt-8 space-y-10">
        <DisplayNameForm current={profile.displayName} />
        <UsernameForm current={profile.username} />

        <p className="text-subhead text-secondary">
          Looking for your password, two-factor or deleting your account?{" "}
          <Link href="/settings/security" className="text-accent font-medium">
            Security settings
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
