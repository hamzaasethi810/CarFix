import { notFound, redirect } from "next/navigation";
import { Card, EmptyState, PageTitle, SectionTitle } from "@/components/ui";
import { currentUser, isPrivileged } from "@/lib/auth/guards";
import { getVerificationQueue } from "@/lib/services/experiences";
import { getClaimQueue } from "@/lib/services/shops";
import { VerificationRow } from "../admin/verifications/verification-row";
import { ClaimRow } from "../admin/claims/claim-row";

/*
  The review desk. Not linked for anyone without the role, and it answers 404
  rather than 403 to a reader who lacks it — a 403 would confirm the page
  exists, which is a small thing to give away for no benefit.

  Both queues live here so a reviewer has one place to work rather than
  hunting between sections.
*/
export default async function ReviewPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!isPrivileged(user.role)) notFound();
  // The layout already redirects here, but a direct hit must not slip through.
  if (!user.mfaEnabled) redirect("/setup-2fa");

  const [receipts, claims] = await Promise.all([
    getVerificationQueue(50, 0),
    getClaimQueue(50, 0),
  ]);

  const nothingWaiting = receipts.length === 0 && claims.length === 0;

  return (
    <>
      <PageTitle
        title="Review desk"
        subtitle="Approve or reject. Either way the document is deleted immediately."
      />

      {nothingWaiting && <EmptyState title="Nothing waiting" hint="The queues are clear." />}

      {receipts.length > 0 && (
        <>
          <SectionTitle hint="Owner-reported prices awaiting proof.">
            Receipts ({receipts.length})
          </SectionTitle>
          <ul className="space-y-3">
            {receipts.map((r) => (
              <li key={r.id}>
                <VerificationRow item={r} />
              </li>
            ))}
          </ul>
        </>
      )}

      {claims.length > 0 && (
        <>
          <SectionTitle hint="Businesses asking to manage their listing.">
            Shop claims ({claims.length})
          </SectionTitle>
          <ul className="space-y-3">
            {claims.map((c) => (
              <li key={c.id}>
                <ClaimRow item={c} />
              </li>
            ))}
          </ul>
        </>
      )}

      <Card className="mt-8">
        <p className="text-footnote text-secondary">
          Opening a document mints a link that lasts 120 seconds and is recorded
          against your account. The file itself is destroyed the moment you
          decide, whichever way you decide.
        </p>
      </Card>
    </>
  );
}
