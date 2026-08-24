import { beforeAll, describe, expect, it } from "vitest";
import { AppError } from "../lib/errors";
import { addVehicle, editVehicle, removeVehicle, setVehiclePhoto } from "../lib/services/vehicles";
import {
  editExperience,
  removeExperience,
  submitExperience,
  uploadReceipt,
} from "../lib/services/experiences";
import { fixtures, makeUser, resetData, validExperience, fakeFile, PNG_BYTES } from "./helpers";

const codeOf = async (fn: () => Promise<unknown>) => {
  try {
    await fn();
    return "NO_ERROR";
  } catch (e) {
    return e instanceof AppError ? e.code : "UNEXPECTED";
  }
};

describe("cross-user authorization", () => {
  let alice: Awaited<ReturnType<typeof makeUser>>;
  let bob: Awaited<ReturnType<typeof makeUser>>;
  let fx: Awaited<ReturnType<typeof fixtures>>;
  let vehicleId: string;
  let experienceId: string;

  beforeAll(async () => {
    await resetData();
    fx = await fixtures();
    alice = await makeUser();
    bob = await makeUser();

    const vehicle = await addVehicle(alice.id, {
      makeId: fx.make.id,
      modelId: fx.model.id,
      year: 2025,
    });
    vehicleId = vehicle.id;

    const experience = await submitExperience(alice.id, {
      ...validExperience(),
      vehicleId,
      mechanicId: fx.mechanic.id,
      serviceId: fx.service.id,
    } as Parameters<typeof submitExperience>[1]);
    experienceId = experience.id;
  });

  it("User A cannot edit User B's vehicle", async () => {
    expect(await codeOf(() => editVehicle(vehicleId, bob.id, { nickname: "pwned" }))).toBe(
      "FORBIDDEN",
    );
  });

  it("User A cannot delete User B's vehicle", async () => {
    expect(await codeOf(() => removeVehicle(vehicleId, bob.id))).toBe("NOT_FOUND");
  });

  it("User A cannot upload a photo to User B's vehicle", async () => {
    expect(
      await codeOf(() => setVehiclePhoto(vehicleId, bob.id, "FRONT", fakeFile(PNG_BYTES))),
    ).toBe("FORBIDDEN");
  });

  it("User A cannot submit an experience against User B's vehicle", async () => {
    expect(
      await codeOf(() =>
        submitExperience(bob.id, {
          ...validExperience(),
          vehicleId,
          mechanicId: fx.mechanic.id,
          serviceId: fx.service.id,
        } as Parameters<typeof submitExperience>[1]),
      ),
    ).toBe("FORBIDDEN");
  });

  it("User A cannot edit User B's experience", async () => {
    expect(await codeOf(() => editExperience(experienceId, bob.id, { totalPrice: 1 }))).toBe(
      "FORBIDDEN",
    );
  });

  it("User A cannot delete User B's experience", async () => {
    expect(
      await codeOf(() => removeExperience(experienceId, { id: bob.id, role: "USER" })),
    ).toBe("NOT_FOUND");
  });

  it("User A cannot attach a receipt to User B's experience", async () => {
    expect(await codeOf(() => uploadReceipt(experienceId, bob.id, fakeFile(PNG_BYTES)))).toBe(
      "FORBIDDEN",
    );
  });

  it("an admin may delete any experience", async () => {
    const admin = await makeUser("ADMIN");
    await expect(
      removeExperience(experienceId, { id: admin.id, role: "ADMIN" }),
    ).resolves.toBeUndefined();
  });
});
