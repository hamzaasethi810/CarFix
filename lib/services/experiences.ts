import "server-only";
import { forbidden, notFound, validation } from "../errors";
import {
  attachReceipt,
  countExperiences,
  createExperience,
  decideVerification,
  experienceBelongsTo,
  findExperienceById,
  findReceiptForExperience,
  listExperiences,
  listPendingVerifications,
  softDeleteExperience,
  updateExperienceOwnedBy,
} from "../repositories/experience";
import { mechanicExists, pricingStats } from "../repositories/mechanic";
import { writeAuditLog } from "../repositories/moderation";
import { serviceExists } from "../repositories/taxonomy";
import { vehicleBelongsTo } from "../repositories/vehicle";
import { deleteObject, putObject, signedReadUrl } from "../storage/objects";
import { inspectReceipt, randomKey } from "../storage/files";
import { toExperienceView } from "./dto";

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

  const created = await createExperience({ ...input, userId });
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
  const updated = await updateExperienceOwnedBy(id, userId, input);
  if (!updated) throw forbidden();
  return toExperienceView(updated, userId);
}

export async function removeExperience(id: string, actor: { id: string; role: "USER" | "ADMIN" }) {
  const ok = await softDeleteExperience(id, actor.role === "ADMIN" ? {} : { userId: actor.id });
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

  return { status: "PENDING" as const };
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
export async function getReceiptViewUrl(experienceId: string, adminId: string) {
  const receipt = await findReceiptForExperience(experienceId);
  if (!receipt?.storageKey) throw notFound();

  const url = await signedReadUrl("receipts", receipt.storageKey, 120);
  await writeAuditLog({
    actorId: adminId,
    action: "receipt.viewed",
    targetType: "MechanicExperience",
    targetId: experienceId,
  });

  return { url, expiresInSeconds: 120 };
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
