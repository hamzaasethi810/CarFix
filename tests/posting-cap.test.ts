import { describe, expect, it } from "vitest";

/*
  The posting cap, as a pure decision.

  The rule the service implements: an account may write about SHOP_SPREAD_MAX
  distinct shops in a rolling window, and a shop it has already written about
  in that window never counts against it.
*/
const SHOP_SPREAD_MAX = 10;

function allowed(recentShopIds: string[], target: string) {
  const distinct = [...new Set(recentShopIds)];
  if (distinct.includes(target)) return true;
  return distinct.length < SHOP_SPREAD_MAX;
}

const shops = (n: number) => Array.from({ length: n }, (_, i) => `shop-${i}`);

describe("the posting cap", () => {
  it("allows a fresh account", () => {
    expect(allowed([], "shop-a")).toBe(true);
  });

  it("allows up to ten different shops", () => {
    expect(allowed(shops(9), "shop-new")).toBe(true);
  });

  it("blocks an eleventh different shop", () => {
    expect(allowed(shops(10), "shop-new")).toBe(false);
  });

  it("never blocks a shop already written about in the window", () => {
    /*
      The case the cap must not break: somebody who genuinely goes back to the
      same garage. Twenty visits to one place is a customer; one visit to
      twenty places in an afternoon is not.
    */
    expect(allowed(shops(10), "shop-3")).toBe(true);
    expect(allowed(shops(40), "shop-3")).toBe(true);
  });

  it("counts shops, not posts", () => {
    // Fifty reviews spread over three shops is still three shops.
    const many = Array.from({ length: 50 }, (_, i) => `shop-${i % 3}`);
    expect(allowed(many, "shop-new")).toBe(true);
  });
});
