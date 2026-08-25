import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, PageTitle, buttonStyles } from "@/components/ui";
import { currentUser, isPrivileged } from "@/lib/auth/guards";
import { getMfaStatus } from "@/lib/services/mfa";
import { MfaPanel } from "../settings/security/mfa-panel";

/*
  Where a newly promoted reviewer or administrator lands.

  Their role was granted directly in the database, which signed them out; on
  signing back in they arrive here and cannot go anywhere else until a second
  factor is enrolled. Nothing about the tools is visible before that, because
  the tools reveal other people's receipts and identity documents.

  This page deliberately does NOT redirect away once enrolment succeeds, even
  though it knows it has. Middleware decides who gets sent here, and it decides
  from the session cookie, which can be a few moments behind the database. A
  redirect from here would bounce against that stale answer — page sends you to
  /review, middleware sends you back — and the browser would spin until it gave
  up. That is the frozen screen. One side navigates, the other decides; they
  are never both allowed to do both.
*/
export default async function SetupTwoFactorPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  // Nobody who does not need this should ever see it.
  if (!isPrivileged(user.role)) redirect("/");

  const status = await getMfaStatus(user.id);

  if (status.enabled) {
    return (
      <div className="max-w-xl mx-auto">
        <PageTitle
          title="You're all set"
          subtitle="Two-factor authentication is on for this account."
        />
        <Card className="space-y-4">
          <p className="text-subhead">
            From now on, signing in asks for a code from your authenticator
            after your password. Keep your backup codes somewhere safe — they
            are the way back in if you lose your phone.
          </p>
          <Link href="/review" className={buttonStyles.primary}>
            Open the review queue
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
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
