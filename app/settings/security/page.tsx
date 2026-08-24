import { redirect } from "next/navigation";
import { PageTitle } from "@/components/ui";
import { currentUser } from "@/lib/auth/guards";
import { getMfaStatus } from "@/lib/services/mfa";
import { MfaPanel } from "./mfa-panel";

export default async function SecurityPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const status = await getMfaStatus(user.id);

  return (
    <div className="max-w-xl">
      <PageTitle title="Security" subtitle="Protect your account with a second factor." />
      <MfaPanel initial={status} />
    </div>
  );
}
