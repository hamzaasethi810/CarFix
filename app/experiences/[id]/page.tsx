import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Columns,
  OperationLine,
  RangeScale,
  Sheet,
  SheetHeader,
  Stamp,
  Stars,
  Tag,
  buttonStyles,
  miles,
  money,
  formatDate,
} from "@/components/ui";
import { currentUser } from "@/lib/auth/guards";
import { getExperience, getPricing } from "@/lib/services/experiences";
import { AppError } from "@/lib/errors";
import { OwnerActions } from "./owner-actions";
import { Engagement } from "./engagement";
import { canReplyAsShop, getHelpful, getReply, getWorkPhotos } from "@/lib/services/engagement";

/*
  The four things a reviewer is asked to judge, and the same four they see back.

  Price left with the rating form: the amount paid is the headline figure on
  this record, so rating it as well asked the same question twice. Overall is
  not listed because it is the mean of these four rather than an answer of its
  own; it is shown once, above, as stars.
*/
const RATING_LABELS = [
  ["quality", "Work quality"],
  ["communication", "Professionalism"],
  ["knowledge", "Knowledge"],
  ["turnaround", "Time spent"],
] as const;

export default async function ExperiencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();

  const e = await getExperience(id, user?.id).catch((err) => {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  });

  const [helpful, reply, photos, canReply, pricing] = await Promise.all([
    getHelpful(e.id, user?.id),
    getReply(e.id),
    getWorkPhotos(e.id),
    canReplyAsShop(e.id, user?.id),
    getPricing({ generationId: e.vehicle.generationId, serviceId: e.service.id }),
  ]);

  return (
    <div className="max-w-2xl mx-auto">
      <SheetHeader
        title={e.service.name}
        code={e.vehicle.generation}
        meta={`${e.mechanic.name} · ${formatDate(e.serviceDate)}`}
        actions={
          <Link href={`/mechanics/${e.mechanic.id}`} className={buttonStyles.secondaryAccent}>
            View shop
          </Link>
        }
      />

      <p className="text-subhead text-secondary mt-2 text-pretty">
        {e.vehicle.year} {e.vehicle.make} {e.vehicle.model} · {miles(e.mileageAtService)}
      </p>

      <Columns first="Operation" heads={["Amount"]} label="Charges" className="mt-8">
        {e.partsCost !== null && <OperationLine label="Parts" figures={[money(e.partsCost)]} />}
        {e.laborCost !== null && <OperationLine label="Labor" figures={[money(e.laborCost)]} />}
        <OperationLine label="Total" figures={[money(e.totalPrice)]} />
      </Columns>

      {pricing.count > 0 && (
        <div className="mt-8">
          <RangeScale
            low={pricing.min ?? e.totalPrice}
            high={pricing.max ?? e.totalPrice}
            value={e.totalPrice}
            caption={pricing.label}
          />
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <Stars value={e.ratings.overall} />
        {e.verified ? <Stamp>Verified</Stamp> : <Tag tone="neutral">Unverified</Tag>}
      </div>

      {e.reviewText && <p className="text-body text-pretty mt-6">{e.reviewText}</p>}

      <dl className="grid sm:grid-cols-2 gap-x-8 border-t border-separator pt-4 mt-8">
        {RATING_LABELS.map(([key, label]) => (
          <div
            key={key}
            className="flex justify-between items-center py-2 border-b border-separator last:border-0 sm:last:border-b"
          >
            <dt className="text-subhead text-secondary">{label}</dt>
            <dd><Stars value={e.ratings[key]} /></dd>
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
        <p className="text-footnote text-secondary mt-4">
          Reported by{" "}
          <Link href={`/profile/${e.author.username}`} className="text-accent font-medium">
            {e.author.displayName}
          </Link>
        </p>
      )}

      <Engagement
        experienceId={e.id}
        helpful={helpful}
        reply={reply}
        canReply={canReply}
        isOwn={e.isOwn}
        photos={photos}
      />

      {e.isOwn && (
        <OwnerActions
          experienceId={e.id}
          editableForMs={e.editableForMs}
          initial={{
            totalPrice: e.totalPrice,
            partsCost: e.partsCost,
            laborCost: e.laborCost,
            reviewText: e.reviewText,
          }}
        />
      )}

      {e.verificationStatus === "PENDING" && (
        <Sheet className="p-5 mt-4">
          <p className="text-subhead text-secondary">
            A receipt has been submitted and is awaiting review.
          </p>
        </Sheet>
      )}
    </div>
  );
}
