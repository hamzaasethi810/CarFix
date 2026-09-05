import { notFound, redirect } from "next/navigation";
import { BlankForm, SheetHeader } from "@/components/ui";
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
      <SheetHeader
        title="Verification queue"
        meta="Approving or rejecting deletes the receipt immediately. Only the outcome is kept."
      />

      <div className="mt-8">
        {queue.length === 0 ? (
          <BlankForm heads={["Reported"]} title="Nothing awaiting review" hint="The queue is clear." />
        ) : (
          <ul className="space-y-3">
            {queue.map((item) => (
              <li key={item.id}>
                <VerificationRow item={item} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
