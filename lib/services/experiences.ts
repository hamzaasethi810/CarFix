import "server-only";
import { AppError, conflict, forbidden, notFound, validation } from "../errors";
import {
  attachReceipt,
  countExperiences,
  countPendingVerificationsForUser,
  createExperience,
  distinctShopsSince,
  decideVerification,
  approveVerificationAutomatically,
  experienceBelongsTo,
  findExperienceById,
  findReceiptForExperience,
  findRecentDuplicate,
  listExperiences,
  listPendingVerifications,
  softDeleteExperience,
  updateExperienceOwnedBy,
} from "../repositories/experience";
import { mechanicExists, pricingStats } from "../repositories/mechanic";
import { writeAuditLog } from "../repositories/moderation";
import { serviceExists } from "../repositories/taxonomy";
import { vehicleBelongsTo } from "../repositories/vehicle";
import {deleteObject, getObjectBytes, putObject } from "../storage/objects";
import { inspectReceipt, randomKey } from "../storage/files";
import { toExperienceView } from "./dto";
import { reconsiderListing } from "./shop-submissions";
import { readText } from "../providers/ocr";
import { evaluateReceipt } from "./receipt-check";

/** Ceiling on how much of the review queue one account can occupy. */
const MAX_PENDING_PER_USER = 5;

/** Window in which an identical repeat submission is treated as the same one. */
const DUPLICATE_WINDOW_MS = 60_000;

/*
  The posting cap: how many DIFFERENT shops one account can write about in a
  rolling window. Reviews of shops already written about in that window are
  never blocked.
*/
const SHOP_SPREAD_MAX = 10;
const SHOP_SPREAD_WINDOW_MS = 12 * 60 * 60_000;

/*
  How long an author may edit their own report. Reports are the evidence other
  owners rely on, so they settle quickly — long enough to fix a typo or a
  mistyped figure, short enough that the record cannot be quietly rewritten
  after people have acted on it. Deleting stays available indefinitely: it is
  the author's own account of their own money.
*/
const EDIT_WINDOW_MS = 10 * 60_000;

export const editWindowRemainingMs = (createdAt: Date) =>
  Math.max(0, EDIT_WINDOW_MS - (Date.now() - createdAt.getTime()));

export async function submitExperience(
  userId: string,
  input: {
    vehicleId: string;
    mechanicId: string;
    serviceId: string;
    totalPrice: number;
    partsCost?: number | null;
    laborCost?: number | null;
    serviceDate: Date;
    mileageAtService: number;
    overallRating: number;
    qualityRating: number;
    priceRating: number;
    communicationRating: number;
    turnaroundRating: number;
    knowledgeRating: number;
    wouldRecommend: boolean;
    wouldReturn: boolean;
    reviewText?: string | null;
  },
) {
  // Each referenced entity is re-checked server-side; a client-supplied id is
  // never assumed to exist or to belong to the caller.
  const [ownsVehicle, mechanicOk, serviceOk] = await Promise.all([
    vehicleBelongsTo(input.vehicleId, userId),
    mechanicExists(input.mechanicId),
    serviceExists(input.serviceId),
  ]);

  if (!ownsVehicle) throw forbidden();
  if (!mechanicOk) throw validation("That mechanic could not be found.");
  if (!serviceOk) throw validation("That service could not be found.");

  /*
    Idempotency. If the same submission arrives twice in quick succession,
    return the row that already exists rather than creating a second one —
    the caller gets the same answer either way and the pricing data stays
    honest.
  */
  const duplicate = await findRecentDuplicate({
    userId,
    vehicleId: input.vehicleId,
    mechanicId: input.mechanicId,
    serviceId: input.serviceId,
    serviceDate: input.serviceDate,
    totalPrice: input.totalPrice,
    withinMs: DUPLICATE_WINDOW_MS,
  });
  if (duplicate) return toExperienceView(duplicate, userId);

  /*
    How many different shops this account can write about in a window.

    A plain submission rate limit does not stop the thing that actually harms
    the data: an account walking down a list of shops leaving one review each.
    Each post looks reasonable on its own and every one passes moderation,
    because none of them is individually abusive.

    Capping BREADTH instead leaves normal behaviour alone — a second job at a
    garage you have already reviewed never counts against you, however many
    times you go back — while making a spray across the map expensive. Twelve
    hours rather than a day so a genuine enthusiast posting a weekend's work
    is not locked out until tomorrow.
  */
  const since = new Date(Date.now() - SHOP_SPREAD_WINDOW_MS);
  const recentShops = await distinctShopsSince(userId, since);
  const alreadyReviewed = recentShops.some((r) => r.mechanicId === input.mechanicId);
  if (!alreadyReviewed && recentShops.length >= SHOP_SPREAD_MAX) {
    throw new AppError(
      "RATE_LIMITED",
      `You can post about ${SHOP_SPREAD_MAX} different shops every 12 hours. ` +
        `You can still add more about shops you have already written about.`,
    );
  }

  const created = await createExperience({ ...input, userId });

  /*
    A report is also a vote that the place exists. If enough different people
    have now reported work here, a publicly submitted listing stops being
    provisional.
  */
  await reconsiderListing(input.mechanicId);

  return toExperienceView(created, userId);
}

export async function getExperience(id: string, viewerId?: string) {
  const experience = await findExperienceById(id);
  if (!experience) throw notFound();
  return toExperienceView(experience, viewerId);
}

export async function browseExperiences(
  filters: {
    mechanicId?: string;
    vehicleId?: string;
    generationId?: string;
    serviceId?: string;
    verifiedOnly?: boolean;
    limit: number;
    offset: number;
  },
  viewerId?: string,
) {
  const [rows, total] = await Promise.all([
    listExperiences(filters),
    countExperiences(filters),
  ]);

  return {
    items: rows.map((r) => toExperienceView(r, viewerId)),
    total,
    limit: filters.limit,
    offset: filters.offset,
  };
}

export async function editExperience(
  id: string,
  userId: string,
  input: Parameters<typeof updateExperienceOwnedBy>[2],
) {
  const existing = await findExperienceById(id);
  if (!existing) throw notFound();
  if (existing.userId !== userId) throw forbidden();

  /*
    The window is enforced here, not in the browser. A client that keeps the
    edit form on screen, or one crafted by hand, still cannot rewrite a report
    once the window has closed.
  */
  if (editWindowRemainingMs(existing.createdAt) === 0)
    throw conflict(
      "The 10 minute window for editing this report has passed. You can still delete it.",
    );

  const updated = await updateExperienceOwnedBy(id, userId, input);
  if (!updated) throw forbidden();
  return toExperienceView(updated, userId);
}

export async function removeExperience(
  id: string,
  actor: { id: string; role: "USER" | "REVIEWER" | "ADMIN" },
) {
  /*
    Only an administrator can remove someone else's report. A reviewer works
    the document queues; taking down other people's writing is moderation, and
    deliberately not part of that role.
  */
  const scope = actor.role === "ADMIN" ? {} : { userId: actor.id };
  const ok = await softDeleteExperience(id, scope);
  if (!ok) throw notFound();
}

export async function getPricing(filters: {
  mechanicId?: string;
  serviceId?: string;
  generationId?: string;
  vehicleId?: string;
  verifiedOnly?: boolean;
}) {
  const stats = await pricingStats(filters);
  return {
    ...stats,
    // The UI leads with the median and the sample size; it never presents this
    // as an authoritative quote.
    label:
      stats.count === 0
        ? "No reported experiences yet"
        : stats.count === 1
          ? "1 reported experience"
          : `Based on ${stats.count} reported experiences`,
  };
}

// ---------- Receipts ----------

export async function uploadReceipt(experienceId: string, userId: string, file: File) {
  // Ownership is checked before anything is written, so a caller who does not
  // own the experience never causes an object to land in the bucket at all.
  if (!(await experienceBelongsTo(experienceId, userId))) throw forbidden();

  /*
    Rate limiting caps how fast one person can upload; this caps how much of
    the review queue they can occupy at once. Without it a single account could
    fill the admin queue and stall verification for everyone.
  */
  const pending = await countPendingVerificationsForUser(userId);
  if (pending >= MAX_PENDING_PER_USER)
    throw conflict(
      `You already have ${pending} receipts awaiting review. Wait for those before submitting more.`,
    );

  const { bytes, mime, ext } = await inspectReceipt(file);
  const key = randomKey(`receipts/${experienceId}`, ext);
  await putObject("receipts", key, bytes, mime);

  const previous = await findReceiptForExperience(experienceId);
  const attached = await attachReceipt(experienceId, userId, key);
  if (!attached) {
    await deleteObject("receipts", key);
    throw forbidden();
  }

  if (previous?.storageKey && previous.storageKey !== key)
    await deleteObject("receipts", previous.storageKey);

  // The bytes go back to the caller so the automated check can run after the
  // response, without fetching the object again.
  return { status: "PENDING" as const, bytes, mime };
}

/*
  Runs the automated check and, only on a confident match of both the shop name
  and the total, approves without a human. Anything else is left in the queue.

  Deliberately never rejects: a bad scan is not evidence of fraud, and an
  automatic rejection would be a false accusation the owner cannot appeal.
*/
export async function autoCheckReceipt(experienceId: string, bytes: Buffer) {
  const experience = await findExperienceById(experienceId);
  if (!experience || experience.verificationStatus !== "PENDING") return;

  let ocr;
  try {
    ocr = await readText(bytes);
  } catch (error) {
    console.error("[receipt] OCR failed", { experienceId, error });
    return; // Falls through to human review.
  }

  const check = evaluateReceipt({
    claimedShopName: experience.mechanic.name,
    claimedTotal: experience.totalPrice,
    receiptText: ocr.text,
    ocrConfidence: ocr.confidence,
  });

  // The outcome is recorded either way, so a reviewer can see what the check
  // concluded and why before deciding themselves.
  await writeAuditLog({
    actorId: experience.userId,
    action: `receipt.autocheck.${check.decision.toLowerCase()}`,
    targetType: "MechanicExperience",
    targetId: experienceId,
    metadata: {
      reason: check.reason,
      nameMatched: check.name.matched,
      priceMatched: check.price.matched,
      ocrConfidence: Math.round(check.ocrConfidence),
    },
  });

  if (check.decision !== "AUTO_APPROVE") return;

  const receipt = await findReceiptForExperience(experienceId);
  await approveVerificationAutomatically(experienceId);
  // The file is destroyed on decision, exactly as it is for a human approval.
  if (receipt?.storageKey) await deleteObject("receipts", receipt.storageKey);
}

export async function getVerificationQueue(limit: number, offset: number) {
  const rows = await listPendingVerifications(limit, offset);
  return rows.map((r) => ({
    ...toExperienceView(r),
    hasReceipt: Boolean(r.receipt?.storageKey),
    receiptUploadedAt: r.receipt?.uploadedAt.toISOString() ?? null,
  }));
}

// Admin-only: mints a short-lived URL for one receipt. The key itself is never
// returned to any client, and the privileged read is audited.
/**
 * The receipt itself, for display inside the review desk.
 *
 * Returns bytes rather than a link on purpose: a link is a download, and a
 * download survives both the 120-second expiry and the destruction of the
 * record. The reviewer sees the document without a copy of it landing in their
 * Downloads folder.
 */
export async function readReceiptForReview(experienceId: string, reviewerId: string) {
  const receipt = await findReceiptForExperience(experienceId);
  if (!receipt?.storageKey || receipt.deletedAt) throw notFound();

  const { bytes, contentType } = await getObjectBytes("receipts", receipt.storageKey);

  // Logged on the same terms as before: looking is an action, recorded against
  // the account that took it.
  await writeAuditLog({
    actorId: reviewerId,
    action: "receipt.viewed",
    targetType: "MechanicExperience",
    targetId: experienceId,
  });

  return { bytes, contentType };
}

export async function decideReceiptVerification(params: {
  experienceId: string;
  adminId: string;
  decision: "VERIFIED" | "REJECTED";
}) {
  const receipt = await findReceiptForExperience(params.experienceId);

  const updated = await decideVerification({
    experienceId: params.experienceId,
    adminId: params.adminId,
    status: params.decision,
  });
  if (!updated) throw notFound();

  // The stored file is destroyed once a decision exists; only the outcome and
  // its audit entry survive.
  if (receipt?.storageKey) await deleteObject("receipts", receipt.storageKey);

  return { id: updated.id, verificationStatus: updated.verificationStatus };
}
