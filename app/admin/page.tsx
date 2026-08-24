import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, PageTitle } from "@/components/ui";
import { currentUser } from "@/lib/auth/guards";
import { getVerificationQueue } from "@/lib/services/experiences";
import { getReports } from "@/lib/services/moderation";

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");

  const [pending, reports] = await Promise.all([
    getVerificationQueue(50, 0),
    getReports("OPEN", 50, 0),
  ]);

  return (
    <>
      <PageTitle title="Admin" subtitle="Verification and moderation queues." />

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/admin/verifications" className="block group">
          <Card className="group-hover:bg-tertiary transition-colors duration-150">
            <p className="text-footnote text-secondary uppercase tracking-wide">
              Verification queue
            </p>
            <p className="text-large-title font-bold mt-1 tabular-nums">{pending.length}</p>
            <p className="text-subhead text-secondary mt-1">
              {pending.length === 1 ? "receipt awaiting" : "receipts awaiting"} review
            </p>
          </Card>
        </Link>

        <Card>
          <p className="text-footnote text-secondary uppercase tracking-wide">Open reports</p>
          <p className="text-large-title font-bold mt-1 tabular-nums">{reports.length}</p>
          <p className="text-subhead text-secondary mt-1">
            {reports.length === 1 ? "report" : "reports"} needing attention
          </p>
        </Card>
      </div>
    </>
  );
}
