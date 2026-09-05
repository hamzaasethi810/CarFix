import { notFound, redirect } from "next/navigation";
import { BlankForm, SheetHeader } from "@/components/ui";
import { currentUser, isPrivileged } from "@/lib/auth/guards";
import { getClaimQueue } from "@/lib/services/shops";
import { ClaimRow } from "./claim-row";

export default async function ClaimsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  // 404 rather than 403: a 403 would confirm the page exists.
  if (!isPrivileged(user.role)) notFound();

  const queue = await getClaimQueue(50, 0);

  return (
    <>
      <SheetHeader
        title="Shop claims"
        meta="Approving hands the listing to the claimant. The document is deleted either way."
      />
      <div className="mt-8">
        {queue.length === 0 ? (
          <BlankForm
            heads={["Claimant"]}
            title="No claims awaiting review"
            hint="The queue is clear."
          />
        ) : (
          <ul className="space-y-3">
            {queue.map((c) => (
              <li key={c.id}>
                <ClaimRow item={c} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
