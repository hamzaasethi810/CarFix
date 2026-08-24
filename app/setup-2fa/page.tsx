import { redirect } from "next/navigation";
import { Card, PageTitle } from "@/components/ui";
import { currentUser, isPrivileged } from "@/lib/auth/guards";
import { getMfaStatus } from "@/lib/services/mfa";
import { MfaPanel } from "../settings/security/mfa-panel";

/*
  Where a newly promoted reviewer or administrator lands.

  Their role was granted directly in the database, which signed them out; on
  signing back in they arrive here and cannot go anywhere else until a second
  factor is enrolled. Nothing about the tools is visible before that, because
  the tools reveal other people's receipts and identity documents.
*/
export default async function SetupTwoFactorPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  // Nobody who does not need this should ever see it.
  if (!isPrivileged(user.role)) redirect("/");
  if (user.mfaEnabled) redirect("/review");

  const status = await getMfaStatus(user.id);

  return (
    <div className="max-w-xl">
      <PageTitle
        title="Set up your authenticator"
        subtitle="Your account has been granted review access. One more step."
      />

      <Card className="mb-4">
        <p className="text-subhead">
          Review tools show other people&rsquo;s receipts and business documents,
          so a password on its own is not enough to open them. Scan the code
          below with <strong>Duo Mobile</strong> — choose Add account, then Use
          QR code — or any other authenticator app.
        </p>
      </Card>

      <MfaPanel initial={status} />
    </div>
  );
}
