import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, PageTitle, num } from "@/components/ui";
import { currentUser, isPrivileged } from "@/lib/auth/guards";
import { getVerificationQueue } from "@/lib/services/experiences";
import { getReports } from "@/lib/services/moderation";
import { getClaimQueue } from "@/lib/services/shops";

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!isPrivileged(user.role)) redirect("/");

  const isAdmin = user.role === "ADMIN";

  const [pending, claims, reports] = await Promise.all([
    getVerificationQueue(50, 0),
    getClaimQueue(50, 0),
    // Moderation is administrator-only, so a reviewer never even loads it.
    isAdmin ? getReports("OPEN", 50, 0) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageTitle
        title={isAdmin ? "Admin" : "Review"}
        subtitle={
          isAdmin
            ? "Verification, claims, and moderation."
            : "Receipts and shop documents awaiting review."
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/admin/verifications" className="block group">
          <Card className="group-hover:bg-tertiary transition-colors duration-150">
            <p className="text-footnote text-secondary uppercase tracking-wide">
              Verification queue
            </p>
            <p className="text-large-title font-bold mt-1 tabular-nums">{num(pending.length)}</p>
            <p className="text-subhead text-secondary mt-1">
              {pending.length === 1 ? "receipt awaiting" : "receipts awaiting"} review
            </p>
          </Card>
        </Link>

        <Link href="/admin/claims" className="block group">
          <Card className="group-hover:bg-tertiary transition-colors duration-150">
            <p className="text-footnote text-secondary uppercase tracking-wide">Shop claims</p>
            <p className="text-large-title font-bold mt-1 tabular-nums">{num(claims.length)}</p>
            <p className="text-subhead text-secondary mt-1">
              {claims.length === 1 ? "claim" : "claims"} awaiting review
            </p>
          </Card>
        </Link>

        {isAdmin && (
          <Card>
            <p className="text-footnote text-secondary uppercase tracking-wide">Open reports</p>
            <p className="text-large-title font-bold mt-1 tabular-nums">{num(reports.length)}</p>
            <p className="text-subhead text-secondary mt-1">
              {reports.length === 1 ? "report" : "reports"} needing attention
            </p>
          </Card>
        )}
      </div>
    </>
  );
}
