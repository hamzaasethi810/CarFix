import { notFound, redirect } from "next/navigation";
import { Columns, OperationLine, SheetHeader, num } from "@/components/ui";
import { currentUser, isPrivileged } from "@/lib/auth/guards";
import { getVerificationQueue } from "@/lib/services/experiences";
import { getReports } from "@/lib/services/moderation";
import { getClaimQueue } from "@/lib/services/shops";

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  // 404 rather than 403: a 403 would confirm the page exists.
  if (!isPrivileged(user.role)) notFound();

  const isAdmin = user.role === "ADMIN";

  const [pending, claims, reports] = await Promise.all([
    getVerificationQueue(50, 0),
    getClaimQueue(50, 0),
    // Moderation is administrator-only, so a reviewer never even loads it.
    isAdmin ? getReports("OPEN", 50, 0) : Promise.resolve([]),
  ]);

  return (
    <>
      <SheetHeader
        title={isAdmin ? "Admin" : "Review"}
        meta={
          isAdmin
            ? "Verification, claims, and moderation."
            : "Receipts and shop documents awaiting review."
        }
      />

      <Columns first="Queue" heads={["Waiting"]} label="Queues" className="mt-8">
        <OperationLine
          label="Verification queue"
          note={pending.length === 1 ? "Receipt awaiting review" : "Receipts awaiting review"}
          figures={[num(pending.length)]}
          href="/admin/verifications"
        />
        <OperationLine
          label="Shop claims"
          note={claims.length === 1 ? "Claim awaiting review" : "Claims awaiting review"}
          figures={[num(claims.length)]}
          href="/admin/claims"
        />
        {isAdmin && (
          <OperationLine
            label="Open reports"
            note={reports.length === 1 ? "Report needing attention" : "Reports needing attention"}
            figures={[num(reports.length)]}
          />
        )}
      </Columns>
    </>
  );
}
