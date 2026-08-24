import { redirect } from "next/navigation";
import { EmptyState, PageTitle } from "@/components/ui";
import { currentUser } from "@/lib/auth/guards";
import { getVerificationQueue } from "@/lib/services/experiences";
import { VerificationRow } from "./verification-row";

export default async function VerificationsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");

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
