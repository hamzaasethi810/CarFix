import "server-only";
import { validation } from "../errors";
import { createReport, listReports, resolveReport } from "../repositories/moderation";
import type { ReportStatus, ReportTargetType } from "../generated/prisma/enums";

export async function fileReport(
  reporterId: string,
  input: { targetType: ReportTargetType; experienceId?: string; reason: string },
) {
  if (input.targetType === "EXPERIENCE" && !input.experienceId)
    throw validation("An experience must be identified when reporting one.");

  const report = await createReport({
    reporterId,
    targetType: input.targetType,
    experienceId: input.experienceId ?? null,
    reason: input.reason,
  });
  return { id: report.id, status: report.status };
}

export async function getReports(status: ReportStatus, limit: number, offset: number) {
  const rows = await listReports(status, limit, offset);
  return rows.map((r) => ({
    id: r.id,
    targetType: r.targetType,
    experienceId: r.experienceId,
    reason: r.reason,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    reporter: r.reporter.profile?.username ?? null,
  }));
}

export async function decideReport(params: {
  reportId: string;
  adminId: string;
  status: "ACTIONED" | "DISMISSED";
}) {
  const report = await resolveReport(params);
  return { id: report.id, status: report.status };
}
