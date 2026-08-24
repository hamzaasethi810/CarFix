import Link from "next/link";
import { Card, Stars, VerifiedBadge, money } from "@/components/ui";

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

export function ExperienceCard({ e, showMechanic = false }: { e: ExperienceView; showMechanic?: boolean }) {
  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-medium">
          {e.vehicle.year} {e.vehicle.make} {e.vehicle.model}{" "}
          <span className="text-muted font-normal">{e.vehicle.generation}</span>
          {e.vehicle.trim && <span className="text-muted font-normal"> · {e.vehicle.trim}</span>}
        </h3>
        <VerifiedBadge verified={e.verified} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="font-medium">{e.service.name}</span>
        <span className="font-medium">{money(e.totalPrice)}</span>
        {(e.partsCost !== null || e.laborCost !== null) && (
          <span className="text-muted">
            {e.partsCost !== null && `parts ${money(e.partsCost)}`}
            {e.partsCost !== null && e.laborCost !== null && " · "}
            {e.laborCost !== null && `labor ${money(e.laborCost)}`}
          </span>
        )}
        <Stars value={e.ratings.overall} />
      </div>

      {showMechanic && (
        <p className="text-sm text-muted mt-1">
          at{" "}
          <Link href={`/mechanics/${e.mechanic.id}`} className="underline text-foreground">
            {e.mechanic.name}
          </Link>
        </p>
      )}

      {e.reviewText && <p className="mt-3 text-sm">{e.reviewText}</p>}

      <p className="mt-3 text-xs text-muted">
        {new Date(e.serviceDate).toLocaleDateString("en-US", { year: "numeric", month: "short" })} ·{" "}
        {e.mileageAtService.toLocaleString()} mi
        {e.author && ` · ${e.author.displayName}`}
        {e.wouldReturn && " · would return"}
      </p>
    </Card>
  );
}
