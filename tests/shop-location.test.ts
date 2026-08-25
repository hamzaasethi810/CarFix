import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../lib/db";
import { makeUser, resetData } from "./helpers";

// Geocoding is a shared community service; never called from a test.
vi.mock("../lib/providers/nominatim", () => ({
  geocode: vi.fn(async (q: string) =>
    q.includes("nowhere")
      ? []
      : [{ lat: 51.5, lng: -0.12, label: "1 Real Street, London" }],
  ),
}));

const { updateShopDetails } = await import("../lib/services/shops");

const DETAILS = {
  name: "Corrected Motors",
  address: "1 Real Street",
  city: "London",
  state: "England",
};

async function makeShop(ownerId?: string) {
  return prisma.mechanic.create({
    data: {
      name: "Old Name", address: "9 Wrong Road", city: "London", state: "England",
      zip: "", lat: 0, lng: 0, source: "USER",
      ...(ownerId ? { claimedById: ownerId } : {}),
    },
    select: { id: true },
  });
}

beforeEach(resetData);

describe("an owner correcting their listing", () => {
  it("moves the pin to the geocoded address", async () => {
    const owner = await makeUser();
    const shop = await makeShop(owner.id);

    await updateShopDetails(shop.id, owner.id, DETAILS);

    const after = await prisma.mechanic.findUniqueOrThrow({ where: { id: shop.id } });
    expect(after.name).toBe("Corrected Motors");
    expect(after.lat).toBe(51.5);
    expect(after.lng).toBe(-0.12);
  });

  it("refuses someone who does not own it", async () => {
    const owner = await makeUser();
    const stranger = await makeUser();
    const shop = await makeShop(owner.id);

    // Ownership is read from the database, never from the request.
    await expect(updateShopDetails(shop.id, stranger.id, DETAILS)).rejects.toThrow();

    const after = await prisma.mechanic.findUniqueOrThrow({ where: { id: shop.id } });
    expect(after.name).toBe("Old Name");
  });

  it("refuses an unclaimed listing", async () => {
    const user = await makeUser();
    const shop = await makeShop();
    await expect(updateShopDetails(shop.id, user.id, DETAILS)).rejects.toThrow();
  });

  it("refuses an address that does not exist", async () => {
    const owner = await makeUser();
    const shop = await makeShop(owner.id);

    await expect(
      updateShopDetails(shop.id, owner.id, { ...DETAILS, address: "nowhere at all" }),
    ).rejects.toThrow(/could not find/i);

    // A failed geocode must not half-apply the rest of the details.
    const after = await prisma.mechanic.findUniqueOrThrow({ where: { id: shop.id } });
    expect(after.name).toBe("Old Name");
  });

  it("ignores coordinates the caller supplies", async () => {
    const owner = await makeUser();
    const shop = await makeShop(owner.id);

    // A claimed listing must not be draggable anywhere on the map.
    await updateShopDetails(shop.id, owner.id, {
      ...DETAILS,
      ...({ lat: 1.234, lng: 5.678 } as Record<string, never>),
    });

    const after = await prisma.mechanic.findUniqueOrThrow({ where: { id: shop.id } });
    expect(after.lat).toBe(51.5);
    expect(after.lng).toBe(-0.12);
  });
});
