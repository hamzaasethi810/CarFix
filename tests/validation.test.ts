import { describe, expect, it } from "vitest";
import {
  createExperienceSchema,
  createVehicleSchema,
  registerSchema,
  mechanicSearchSchema,
} from "../lib/validation/schemas";
import { inspectImage, inspectReceipt } from "../lib/storage/files";
import { fakeFile, PNG_BYTES } from "./helpers";

const base = {
  vehicleId: "v1",
  mechanicId: "m1",
  serviceId: "s1",
  totalPrice: 1050,
  serviceDate: "2026-05-01",
  mileageAtService: 8000,
  overallRating: 5,
  qualityRating: 5,
  priceRating: 5,
  communicationRating: 5,
  turnaroundRating: 5,
  knowledgeRating: 5,
  wouldRecommend: true,
  wouldReturn: true,
};

describe("input validation", () => {
  it("rejects a client-supplied verification status", () => {
    const result = createExperienceSchema.safeParse({ ...base, verificationStatus: "VERIFIED" });
    expect(result.success).toBe(false);
  });

  it("rejects a client-supplied user id", () => {
    expect(createExperienceSchema.safeParse({ ...base, userId: "someone-else" }).success).toBe(
      false,
    );
  });

  it("rejects a client-supplied role at registration", () => {
    const result = registerSchema.safeParse({
      email: "a@example.com",
      password: "correcthorsebattery",
      username: "someone",
      displayName: "Someone",
      role: "ADMIN",
    });
    expect(result.success).toBe(false);
  });

  it.each([0, 6, -1, 2.5])("rejects an out-of-range rating: %s", (rating) => {
    expect(createExperienceSchema.safeParse({ ...base, overallRating: rating }).success).toBe(false);
  });

  it("rejects a negative price", () => {
    expect(createExperienceSchema.safeParse({ ...base, totalPrice: -5 }).success).toBe(false);
  });

  it("rejects parts plus labor exceeding the total", () => {
    expect(
      createExperienceSchema.safeParse({ ...base, totalPrice: 100, partsCost: 90, laborCost: 90 })
        .success,
    ).toBe(false);
  });

  it("rejects a future service date", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    expect(
      createExperienceSchema.safeParse({ ...base, serviceDate: future.toISOString() }).success,
    ).toBe(false);
  });

  it("accepts a well-formed experience", () => {
    expect(createExperienceSchema.safeParse(base).success).toBe(true);
  });

  it("requires a short, safe password floor at registration", () => {
    expect(
      registerSchema.safeParse({
        email: "a@example.com",
        password: "short",
        username: "someone",
        displayName: "Someone",
      }).success,
    ).toBe(false);
  });

  it("rejects a username with unsafe characters", () => {
    expect(
      registerSchema.safeParse({
        email: "a@example.com",
        password: "correcthorsebattery",
        username: "<script>",
        displayName: "Someone",
      }).success,
    ).toBe(false);
  });

  it("rejects a generation supplied directly by the client", () => {
    expect(
      createVehicleSchema.safeParse({
        makeId: "m",
        modelId: "mo",
        year: 2025,
        generationId: "forced",
      }).success,
    ).toBe(false);
  });

  it("caps the page size a caller can request", () => {
    const parsed = mechanicSearchSchema.safeParse({ limit: "5000" });
    expect(parsed.success).toBe(false);
  });

  it("requires latitude and longitude together", () => {
    expect(mechanicSearchSchema.safeParse({ lat: "38.8" }).success).toBe(false);
    expect(mechanicSearchSchema.safeParse({ lat: "38.8", lng: "-77.3" }).success).toBe(true);
  });
});

describe("upload inspection", () => {
  it("accepts a real PNG", async () => {
    await expect(inspectImage(fakeFile(PNG_BYTES))).resolves.toMatchObject({ mime: "image/png" });
  });

  it("rejects a script disguised with an image name and MIME type", async () => {
    const script = [...Buffer.from("#!/bin/sh\nrm -rf /")];
    await expect(inspectImage(fakeFile(script, "photo.png", "image/png"))).rejects.toThrow();
  });

  it("rejects an empty file", async () => {
    await expect(inspectImage(fakeFile([]))).rejects.toThrow();
  });

  it("does not accept a PDF as a vehicle photo", async () => {
    const pdf = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31];
    await expect(inspectImage(fakeFile(pdf, "x.pdf", "application/pdf"))).rejects.toThrow();
  });

  it("does accept a PDF as a receipt", async () => {
    const pdf = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31];
    await expect(inspectReceipt(fakeFile(pdf, "x.pdf", "application/pdf"))).resolves.toMatchObject({
      mime: "application/pdf",
    });
  });
});
