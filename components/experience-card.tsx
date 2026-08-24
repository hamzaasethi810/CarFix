import Link from "next/link";
import { Card, Stars, VerifiedBadge, miles, money } from "@/components/ui";

export type ExperienceView = {
  id: string;
  totalPrice: number;
  partsCost: number | null;
  laborCost: number | null;
  serviceDate: string;
  mileageAtService: number;
  ratings: { overall: number };
  wouldReturn: boolean;
  reviewText: string | null;
  verified: boolean;
  service: { name: string };
  mechanic: { id: string; name: string };
  vehicle: { year: number; make: string; model: string; generation: string; trim: string | null };
  author: { username: string; displayName: string } | null;
};

export function ExperienceCard({
  e,
  showMechanic = false,
}: {
  e: ExperienceView;
  showMechanic?: boolean;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <h3 className="text-headline font-semibold">
          {e.vehicle.year} {e.vehicle.make} {e.vehicle.model}{" "}
          <span className="text-secondary font-normal">{e.vehicle.generation}</span>
          {e.vehicle.trim && <span className="text-secondary font-normal"> · {e.vehicle.trim}</span>}
        </h3>
        <VerifiedBadge verified={e.verified} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-subhead font-medium rounded-full bg-fill px-2.5 py-1">
          {e.service.name}
        </span>
        <span className="text-title3 font-semibold tabular-nums">{money(e.totalPrice)}</span>
        <Stars value={e.ratings.overall} />
      </div>

      {(e.partsCost !== null || e.laborCost !== null) && (
        <p className="mt-2 text-footnote text-secondary tabular-nums">
          {e.partsCost !== null && `Parts ${money(e.partsCost)}`}
          {e.partsCost !== null && e.laborCost !== null && " · "}
          {e.laborCost !== null && `Labor ${money(e.laborCost)}`}
        </p>
      )}

      {showMechanic && (
        <p className="text-subhead text-secondary mt-2">
          at{" "}
          <Link href={`/mechanics/${e.mechanic.id}`} className="text-accent font-medium">
            {e.mechanic.name}
          </Link>
        </p>
      )}

      {e.reviewText && <p className="mt-3 text-body text-pretty">{e.reviewText}</p>}

      <p className="mt-4 pt-3 border-t border-separator text-footnote text-secondary">
        <time dateTime={e.serviceDate}>
          {new Date(e.serviceDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
          })}
        </time>{" "}
        · {miles(e.mileageAtService)}
        {e.author && ` · ${e.author.displayName}`}
        {e.wouldReturn && " · would return"}
      </p>
    </Card>
  );
}
