import "server-only";
import { prisma } from "../db";
import type { Prisma } from "../generated/prisma/client";
import type { ReportStatus, ReportTargetType } from "../generated/prisma/enums";

export const createReport = (data: {
  reporterId: string;
  targetType: ReportTargetType;
  experienceId?: string | null;
  reason: string;
}) => prisma.report.create({ data, select: { id: true, status: true } });

export const listReports = (status: ReportStatus, limit: number, offset: number) =>
  prisma.report.findMany({
    where: { status },
    select: {
      id: true,
      targetType: true,
      reason: true,
      status: true,
      createdAt: true,
      experienceId: true,
      reporter: { select: { profile: { select: { username: true } } } },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    skip: offset,
  });

export const resolveReport = (params: {
  reportId: string;
  adminId: string;
  status: Extract<ReportStatus, "ACTIONED" | "DISMISSED">;
}) =>
  prisma.$transaction(async (tx) => {
    const report = await tx.report.update({
      where: { id: params.reportId },
      data: { status: params.status },
      select: { id: true, status: true },
    });

    await tx.auditLog.create({
      data: {
        actorId: params.adminId,
        action: `report.${params.status.toLowerCase()}`,
        targetType: "Report",
        targetId: params.reportId,
      },
    });

    return report;
  });

export const writeAuditLog = (data: {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Prisma.InputJsonValue;
}) => prisma.auditLog.create({ data, select: { id: true } });
