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
      <PageTitle title="Admin" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/verifications">
          <Card className="hover:border-accent transition-colors">
            <p className="text-muted text-sm">Verification queue</p>
            <p className="text-2xl font-semibold">{pending.length}</p>
            <p className="text-muted text-xs mt-1">receipts awaiting review</p>
          </Card>
        </Link>
        <Card>
          <p className="text-muted text-sm">Open reports</p>
          <p className="text-2xl font-semibold">{reports.length}</p>
        </Card>
      </div>
    </>
  );
}
