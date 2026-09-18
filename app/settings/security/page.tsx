import { redirect } from "next/navigation";
import { SheetHeader } from "@/components/ui";
import { currentUser } from "@/lib/auth/guards";
import { getMfaStatus } from "@/lib/services/mfa";
import { SettingsNav } from "../settings-nav";
import { MfaPanel } from "./mfa-panel";
import { ChangePassword } from "./change-password";
import { DeleteAccount } from "./delete-account";

export default async function SecurityPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const status = await getMfaStatus(user.id);

  return (
    <div className="max-w-xl mx-auto">
      <SheetHeader title="Security" meta="Protect your account with a second factor." />
      <div className="mt-6">
        <SettingsNav active="security" />
      </div>
      <div className="mt-8">
        <MfaPanel initial={status} />
        <ChangePassword />
        <DeleteAccount />
      </div>
    </div>
  );
}
