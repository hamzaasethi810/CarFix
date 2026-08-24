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
        <div className="flex items-center justify-between">
          <Stars value={e.ratings.overall} />
          <VerifiedBadge verified={e.verified} />
        </div>

        <div className="text-sm text-muted">
          at{" "}
          <Link href={`/mechanics/${e.mechanic.id}`} className="underline text-foreground">
            {e.mechanic.name}
          </Link>{" "}
          · {new Date(e.serviceDate).toLocaleDateString()} ·{" "}
          {e.mileageAtService.toLocaleString()} mi
        </div>

        {(e.partsCost !== null || e.laborCost !== null) && (
          <div className="text-sm">
            {e.partsCost !== null && <>Parts {money(e.partsCost)} </>}
            {e.laborCost !== null && <>· Labor {money(e.laborCost)}</>}
          </div>
        )}

        {e.reviewText && <p className="text-sm">{e.reviewText}</p>}

        <dl className="grid grid-cols-2 gap-2 text-sm border-t border-border pt-4">
          {RATING_LABELS.map(([key, label]) => (
            <div key={key} className="flex justify-between">
              <dt className="text-muted">{label}</dt>
              <dd>{e.ratings[key]} / 5</dd>
            </div>
          ))}
          <div className="flex justify-between">
            <dt className="text-muted">Would return</dt>
            <dd>{e.wouldReturn ? "Yes" : "No"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Would recommend</dt>
            <dd>{e.wouldRecommend ? "Yes" : "No"}</dd>
          </div>
        </dl>

        {e.author && (
          <p className="text-xs text-muted">
            Reported by{" "}
            <Link href={`/profile/${e.author.username}`} className="underline">
              {e.author.displayName}
            </Link>
          </p>
        )}
      </Card>

      {!e.verified && e.verificationStatus === "PENDING" && (
        <p className="text-sm text-muted mt-4">
          A receipt has been submitted and is awaiting review.
        </p>
      )}
    </div>
  );
}
