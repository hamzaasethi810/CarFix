import { describe, expect, it, vi, beforeEach } from "vitest";

// The check is about the arithmetic and the messaging, so the statistics it
// reads are stubbed rather than seeded.
const pricingStats = vi.fn();
vi.mock("../lib/repositories/mechanic", () => ({ pricingStats }));

const { checkPrice } = await import("../lib/services/price-sanity");

const stats = (over: Partial<{ count: number; median: number | null }> = {}) => ({
  count: 20,
  verifiedCount: 5,
  min: 100,
  max: 400,
  avg: 210,
  median: 200,
  ...over,
});

beforeEach(() => pricingStats.mockReset());

describe("price sanity check", () => {
  it("says nothing about an ordinary price", async () => {
    pricingStats.mockResolvedValue(stats());
    const r = await checkPrice({ serviceId: "s", totalPrice: 220 });
    expect(r.unusual).toBe(false);
    expect(r.message).toBeNull();
  });

  it("flags a figure many times the median", async () => {
    pricingStats.mockResolvedValue(stats());
    const r = await checkPrice({ serviceId: "s", totalPrice: 4000 });
    expect(r.unusual).toBe(true);
    expect(r.message).toContain("20×");
  });

  it("flags a figure far below the median", async () => {
    pricingStats.mockResolvedValue(stats());
    const r = await checkPrice({ serviceId: "s", totalPrice: 20 });
    expect(r.unusual).toBe(true);
    expect(r.message).toContain("below");
  });

  it("stays quiet when there is too little data to have an opinion", async () => {
    pricingStats.mockResolvedValue(stats({ count: 3 }));
    const r = await checkPrice({ serviceId: "s", totalPrice: 9999 });
    expect(r.unusual).toBe(false);
  });

  it("stays quiet when there is no median at all", async () => {
    pricingStats.mockResolvedValue(stats({ count: 10, median: null }));
    const r = await checkPrice({ serviceId: "s", totalPrice: 9999 });
    expect(r.unusual).toBe(false);
  });

  it("does not flag prices just outside the ordinary range", async () => {
    pricingStats.mockResolvedValue(stats());
    // 4x and 0.25x are unusual but plausible; only the extremes are queried.
    expect((await checkPrice({ serviceId: "s", totalPrice: 800 })).unusual).toBe(false);
    expect((await checkPrice({ serviceId: "s", totalPrice: 50 })).unusual).toBe(false);
  });

  /*
    The important property: this is advisory. Whatever it concludes, it returns
    a shape the caller can ignore — there is no rejection path at all.
  */
  it("never blocks, whatever the figure", async () => {
    pricingStats.mockResolvedValue(stats());
    for (const price of [0.01, 1, 500, 100_000, 999_999]) {
      const r = await checkPrice({ serviceId: "s", totalPrice: price });
      expect(r).toHaveProperty("unusual");
      expect(typeof r.unusual).toBe("boolean");
    }
  });

  it("compares against the same generation when one is given", async () => {
    pricingStats.mockResolvedValue(stats());
    await checkPrice({ serviceId: "s", generationId: "g80", totalPrice: 200 });
    expect(pricingStats).toHaveBeenCalledWith({ serviceId: "s", generationId: "g80" });
  });
});
