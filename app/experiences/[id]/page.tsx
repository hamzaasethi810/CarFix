import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, PageTitle, Stars, VerifiedBadge, money } from "@/components/ui";
import { currentUser } from "@/lib/auth/guards";
import { getExperience } from "@/lib/services/experiences";
import { AppError } from "@/lib/errors";

const RATING_LABELS = [
  ["quality", "Work quality"],
  ["price", "Price"],
  ["communication", "Communication"],
  ["turnaround", "Turnaround"],
  ["knowledge", "Enthusiast knowledge"],
] as const;

export default async function ExperiencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();

  const e = await getExperience(id, user?.id).catch((err) => {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  });

  return (
    <div className="max-w-2xl">
      <PageTitle
        title={`${e.service.name} — ${money(e.totalPrice)}`}
        subtitle={`${e.vehicle.year} ${e.vehicle.make} ${e.vehicle.model} ${e.vehicle.generation}`}
      />

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Stars value={e.ratings.overall} />
          <VerifiedBadge verified={e.verified} />
        </div>

        <p className="text-subhead text-secondary">
          at{" "}
          <Link href={`/mechanics/${e.mechanic.id}`} className="text-accent font-medium">
            {e.mechanic.name}
          </Link>{" "}
          ·{" "}
          <time dateTime={e.serviceDate}>{new Date(e.serviceDate).toLocaleDateString()}</time> ·{" "}
          {e.mileageAtService.toLocaleString()} mi
        </p>

        {(e.partsCost !== null || e.laborCost !== null) && (
          <p className="text-subhead tabular-nums">
            {e.partsCost !== null && <>Parts {money(e.partsCost)} </>}
            {e.laborCost !== null && <>· Labor {money(e.laborCost)}</>}
          </p>
        )}

        {e.reviewText && <p className="text-body text-pretty">{e.reviewText}</p>}

        <dl className="grid sm:grid-cols-2 gap-x-8 border-t border-separator pt-4">
          {RATING_LABELS.map(([key, label]) => (
            <div
              key={key}
              className="flex justify-between items-center py-2 border-b border-separator last:border-0 sm:last:border-b"
            >
              <dt className="text-subhead text-secondary">{label}</dt>
              <dd className="text-subhead font-medium tabular-nums">{e.ratings[key]} / 5</dd>
            </div>
          ))}
          <div className="flex justify-between items-center py-2 border-b border-separator sm:border-0">
            <dt className="text-subhead text-secondary">Would return</dt>
            <dd className="text-subhead font-medium">{e.wouldReturn ? "Yes" : "No"}</dd>
          </div>
          <div className="flex justify-between items-center py-2">
            <dt className="text-subhead text-secondary">Would recommend</dt>
            <dd className="text-subhead font-medium">{e.wouldRecommend ? "Yes" : "No"}</dd>
          </div>
        </dl>

        {e.author && (
          <p className="text-footnote text-secondary">
            Reported by{" "}
            <Link href={`/profile/${e.author.username}`} className="text-accent font-medium">
              {e.author.displayName}
            </Link>
          </p>
        )}
      </Card>

      {e.verificationStatus === "PENDING" && (
        <Card className="mt-4">
          <p className="text-subhead text-secondary">
            A receipt has been submitted and is awaiting review.
          </p>
        </Card>
      )}
    </div>
  );
}
