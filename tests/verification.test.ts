import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../lib/db";
import { deleteObject } from "../lib/storage/objects";
import { AppError } from "../lib/errors";
import {
  decideReceiptVerification,
  readReceiptForReview,
  submitExperience,
  uploadReceipt,
} from "../lib/services/experiences";
import { addVehicle } from "../lib/services/vehicles";
import { fixtures, makeUser, resetData, validExperience, fakeFile, PNG_BYTES } from "./helpers";

async function scenario() {
  const fx = await fixtures();
  const owner = await makeUser();
  const admin = await makeUser("ADMIN");

  const vehicle = await addVehicle(owner.id, {
    makeId: fx.make.id,
    modelId: fx.model.id,
    year: 2025,
  });

  const experience = await submitExperience(owner.id, {
    ...validExperience(),
    vehicleId: vehicle.id,
    mechanicId: fx.mechanic.id,
    serviceId: fx.service.id,
  } as Parameters<typeof submitExperience>[1]);

  return { fx, owner, admin, experience };
}

describe("receipt verification", () => {
  beforeEach(async () => {
    await resetData();
    vi.clearAllMocks();
  });

  it("a new experience is never verified on creation", async () => {
    const { experience } = await scenario();
    expect(experience.verified).toBe(false);
    expect(experience.verificationStatus).toBe("UNVERIFIED");
  });

  it("uploading a receipt moves the experience to PENDING, not VERIFIED", async () => {
    const { owner, experience } = await scenario();
    const result = await uploadReceipt(experience.id, owner.id, fakeFile(PNG_BYTES));
    expect(result.status).toBe("PENDING");

    const row = await prisma.mechanicExperience.findUniqueOrThrow({
      where: { id: experience.id },
      select: { verificationStatus: true },
    });
    expect(row.verificationStatus).toBe("PENDING");
  });

  it("an approval deletes the stored receipt and keeps only the outcome", async () => {
    const { owner, admin, experience } = await scenario();
    await uploadReceipt(experience.id, owner.id, fakeFile(PNG_BYTES));

    const result = await decideReceiptVerification({
      experienceId: experience.id,
      adminId: admin.id,
      decision: "VERIFIED",
    });
    expect(result.verificationStatus).toBe("VERIFIED");

    // The object is destroyed and the key is cleared, so nothing can point at it.
    expect(deleteObject).toHaveBeenCalledWith("receipts", expect.stringContaining("receipts/"));
    const receipt = await prisma.receipt.findUniqueOrThrow({
      where: { experienceId: experience.id },
      select: { storageKey: true, deletedAt: true },
    });
    expect(receipt.storageKey).toBeNull();
    expect(receipt.deletedAt).not.toBeNull();
  });

  it("a rejection also destroys the receipt", async () => {
    const { owner, admin, experience } = await scenario();
    await uploadReceipt(experience.id, owner.id, fakeFile(PNG_BYTES));

    await decideReceiptVerification({
      experienceId: experience.id,
      adminId: admin.id,
      decision: "REJECTED",
    });

    const receipt = await prisma.receipt.findUniqueOrThrow({
      where: { experienceId: experience.id },
      select: { storageKey: true },
    });
    expect(receipt.storageKey).toBeNull();
    expect(deleteObject).toHaveBeenCalled();
  });

  it("every decision writes an audit entry naming the admin", async () => {
    const { owner, admin, experience } = await scenario();
    await uploadReceipt(experience.id, owner.id, fakeFile(PNG_BYTES));
    await decideReceiptVerification({
      experienceId: experience.id,
      adminId: admin.id,
      decision: "VERIFIED",
    });

    const logs = await prisma.auditLog.findMany({
      where: { targetId: experience.id },
      select: { action: true, actorId: true },
    });
    expect(logs).toContainEqual({ action: "verification.verified", actorId: admin.id });
  });

  it("a receipt cannot be fetched once the decision has destroyed it", async () => {
    const { owner, admin, experience } = await scenario();
    await uploadReceipt(experience.id, owner.id, fakeFile(PNG_BYTES));
    await decideReceiptVerification({
      experienceId: experience.id,
      adminId: admin.id,
      decision: "VERIFIED",
    });

    await expect(readReceiptForReview(experience.id, admin.id)).rejects.toSatisfy(
      (e: unknown) => e instanceof AppError && e.code === "NOT_FOUND",
    );
  });

  it("viewing a receipt is itself audited", async () => {
    const { owner, admin, experience } = await scenario();
    await uploadReceipt(experience.id, owner.id, fakeFile(PNG_BYTES));
    await readReceiptForReview(experience.id, admin.id);

    const logs = await prisma.auditLog.findMany({
      where: { targetId: experience.id, action: "receipt.viewed" },
    });
    expect(logs).toHaveLength(1);
  });
});
