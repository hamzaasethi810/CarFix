import { notFound, redirect } from "next/navigation";
import { EmptyState, PageTitle } from "@/components/ui";
import { currentUser, isPrivileged } from "@/lib/auth/guards";
import { getVerificationQueue } from "@/lib/services/experiences";
import { VerificationRow } from "./verification-row";

export default async function VerificationsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  // 404 rather than 403: a 403 would confirm the page exists.
  if (!isPrivileged(user.role)) notFound();

  const queue = await getVerificationQueue(50, 0);

  return (
    <>
      <PageTitle
        title="Verification queue"
        subtitle="Approving or rejecting deletes the receipt immediately. Only the outcome is kept."
      />

      {queue.length === 0 ? (
        <EmptyState title="Nothing awaiting review" />
      ) : (
        <ul className="space-y-3">
          {queue.map((item) => (
            <li key={item.id}>
              <VerificationRow item={item} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
