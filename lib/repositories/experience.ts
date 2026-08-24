import "server-only";
import { prisma } from "../db";
import type { VerificationStatus } from "../generated/prisma/enums";

const experienceDetail = {
  id: true,
  totalPrice: true,
  partsCost: true,
  laborCost: true,
  serviceDate: true,
  mileageAtService: true,
  overallRating: true,
  qualityRating: true,
  priceRating: true,
  communicationRating: true,
  turnaroundRating: true,
  knowledgeRating: true,
  wouldRecommend: true,
  wouldReturn: true,
  reviewText: true,
  verificationStatus: true,
  verificationMethod: true,
  verifiedAt: true,
  createdAt: true,
  userId: true,
  service: { select: { id: true, name: true } },
  mechanic: { select: { id: true, name: true, city: true, state: true } },
  vehicle: {
    select: {
      id: true,
      year: true,
      make: { select: { name: true } },
      model: { select: { name: true } },
      generation: { select: { id: true, code: true } },
      trim: { select: { name: true } },
    },
  },
  user: { select: { profile: { select: { username: true, displayName: true } } } },
} as const;

export const findExperienceById = (id: string) =>
  prisma.mechanicExperience.findFirst({ where: { id, deletedAt: null }, select: experienceDetail });

export type ExperienceListFilters = {
  mechanicId?: string;
  vehicleId?: string;
  generationId?: string;
  serviceId?: string;
  userId?: string;
  verifiedOnly?: boolean;
  limit: number;
  offset: number;
};

export const listExperiences = (f: ExperienceListFilters) =>
  prisma.mechanicExperience.findMany({
    where: {
      deletedAt: null,
      mechanicId: f.mechanicId,
      vehicleId: f.vehicleId,
      serviceId: f.serviceId,
      userId: f.userId,
      ...(f.generationId ? { vehicle: { generationId: f.generationId } } : {}),
      ...(f.verifiedOnly ? { verificationStatus: "VERIFIED" as const } : {}),
    },
    select: experienceDetail,
    orderBy: { serviceDate: "desc" },
    take: f.limit,
    skip: f.offset,
  });

export const countExperiences = (f: Omit<ExperienceListFilters, "limit" | "offset">) =>
  prisma.mechanicExperience.count({
    where: {
      deletedAt: null,
      mechanicId: f.mechanicId,
      vehicleId: f.vehicleId,
      serviceId: f.serviceId,
      userId: f.userId,
      ...(f.generationId ? { vehicle: { generationId: f.generationId } } : {}),
      ...(f.verifiedOnly ? { verificationStatus: "VERIFIED" as const } : {}),
    },
  });

// Verification fields are deliberately absent from the input type: a new
// experience is always UNVERIFIED/NONE until an admin decides otherwise.
export const createExperience = (data: {
  userId: string;
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
}) => prisma.mechanicExperience.create({ data, select: experienceDetail });

export const updateExperienceOwnedBy = async (
  id: string,
  userId: string,
  data: {
    totalPrice?: number;
    partsCost?: number | null;
    laborCost?: number | null;
    serviceDate?: Date;
    mileageAtService?: number;
    overallRating?: number;
    qualityRating?: number;
    priceRating?: number;
    communicationRating?: number;
    turnaroundRating?: number;
    knowledgeRating?: number;
    wouldRecommend?: boolean;
    wouldReturn?: boolean;
    reviewText?: string | null;
  },
) => {
  const { count } = await prisma.mechanicExperience.updateMany({
    where: { id, userId, deletedAt: null },
    data,
  });
  if (count === 0) return null;
  return findExperienceById(id);
};

export const softDeleteExperience = async (id: string, opts: { userId?: string }) => {
  const { count } = await prisma.mechanicExperience.updateMany({
    where: { id, deletedAt: null, ...(opts.userId ? { userId: opts.userId } : {}) },
    data: { deletedAt: new Date() },
  });
  return count > 0;
};

export const experienceBelongsTo = async (id: string, userId: string) =>
  Boolean(
    await prisma.mechanicExperience.findFirst({
      where: { id, userId, deletedAt: null },
      select: { id: true },
    }),
  );

// ---------- Verification ----------

export const attachReceipt = (experienceId: string, userId: string, storageKey: string) =>
  prisma.$transaction(async (tx) => {
    const owned = await tx.mechanicExperience.findFirst({
      where: { id: experienceId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!owned) return null;

    const receipt = await tx.receipt.upsert({
      where: { experienceId },
      create: { experienceId, storageKey },
      update: { storageKey, uploadedAt: new Date(), deletedAt: null },
      select: { id: true },
    });

    await tx.mechanicExperience.update({
      where: { id: experienceId },
      data: { verificationStatus: "PENDING", verificationMethod: "RECEIPT" },
    });

    return receipt;
  });

export const listPendingVerifications = (limit: number, offset: number) =>
  prisma.mechanicExperience.findMany({
    where: { deletedAt: null, verificationStatus: "PENDING" },
    select: {
      ...experienceDetail,
      receipt: { select: { id: true, storageKey: true, uploadedAt: true } },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    skip: offset,
  });

export const findReceiptForExperience = (experienceId: string) =>
  prisma.receipt.findUnique({
    where: { experienceId },
    select: { id: true, storageKey: true, deletedAt: true },
  });

// The receipt's storage key is cleared in the same transaction that records the
// decision, so the audit trail can never point at a file that still exists.
export const decideVerification = (params: {
  experienceId: string;
  adminId: string;
  status: Extract<VerificationStatus, "VERIFIED" | "REJECTED">;
}) =>
  prisma.$transaction(async (tx) => {
    const experience = await tx.mechanicExperience.findFirst({
      where: { id: params.experienceId, deletedAt: null },
      select: { id: true, verificationStatus: true },
    });
    if (!experience) return null;

    const updated = await tx.mechanicExperience.update({
      where: { id: params.experienceId },
      data: {
        verificationStatus: params.status,
        verificationMethod: "RECEIPT",
        verifiedAt: new Date(),
        verifiedById: params.adminId,
      },
      select: { id: true, verificationStatus: true, verifiedAt: true },
    });

    await tx.receipt.updateMany({
      where: { experienceId: params.experienceId },
      data: { storageKey: null, deletedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        actorId: params.adminId,
        action: `verification.${params.status.toLowerCase()}`,
        targetType: "MechanicExperience",
        targetId: params.experienceId,
        metadata: { previousStatus: experience.verificationStatus },
      },
    });

    return updated;
  });

/** How many of this user's experiences are already awaiting review. */
export const countPendingVerificationsForUser = (userId: string) =>
  prisma.mechanicExperience.count({
    where: { userId, deletedAt: null, verificationStatus: "PENDING" },
  });
