import { redirect } from "next/navigation";
import { EmptyState, PageTitle } from "@/components/ui";
import { currentUser } from "@/lib/auth/guards";
import { getClaimQueue } from "@/lib/services/shops";
import { ClaimRow } from "./claim-row";

export default async function ClaimsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");

  const queue = await getClaimQueue(50, 0);

  return (
    <>
      <PageTitle
        title="Shop claims"
        subtitle="Approving hands the listing to the claimant. The document is deleted either way."
      />
      {queue.length === 0 ? (
        <EmptyState title="No claims awaiting review" />
      ) : (
        <ul className="space-y-3">
          {queue.map((c) => (
            <li key={c.id}>
              <ClaimRow item={c} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
