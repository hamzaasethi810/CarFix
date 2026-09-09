import { describe, expect, it, vi } from "vitest";

/*
  clientIp reads env.TRUSTED_PROXY_HOPS, so the module is imported fresh under a
  mocked env per case rather than once at the top.
*/
async function clientIpWith(hops: number, headers: Record<string, string>) {
  vi.resetModules();
  vi.doMock("../lib/env", () => ({ env: { TRUSTED_PROXY_HOPS: hops }, isProd: false }));
  const { clientIp } = await import("../lib/rate-limit");
  return clientIp(new Request("https://x.test", { headers }));
}

describe("clientIp never trusts a client-supplied address", () => {
  /*
    The attack this guards against: an attacker rotates X-Forwarded-For to get
    a fresh rate-limit bucket per request. With one trusted proxy, whatever the
    attacker prepends, the platform appends the real address last — so the
    rightmost entry is the one that matters and the spoofed prefix is ignored.
  */
  it("ignores a spoofed prefix and takes the proxy-recorded address (1 hop)", async () => {
    expect(await clientIpWith(1, { "x-forwarded-for": "203.0.113.9, 10.0.0.1" })).toBe("10.0.0.1");
    // However many entries the attacker injects, the real (appended) one wins.
    expect(
      await clientIpWith(1, { "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3, 10.0.0.1" }),
    ).toBe("10.0.0.1");
  });

  it("returns a STABLE address across rotated spoofs, so the bucket cannot be escaped", async () => {
    const a = await clientIpWith(1, { "x-forwarded-for": "203.0.113.1, 10.0.0.1" });
    const b = await clientIpWith(1, { "x-forwarded-for": "198.51.100.7, 10.0.0.1" });
    const c = await clientIpWith(1, { "x-forwarded-for": "10.0.0.1" });
    expect(a).toBe("10.0.0.1");
    expect(b).toBe("10.0.0.1");
    expect(c).toBe("10.0.0.1");
  });

  it("counts hops from the right for multi-proxy setups", async () => {
    // Two trusted proxies: client, edge, app-lb. Real client is 2 from the right.
    expect(
      await clientIpWith(2, { "x-forwarded-for": "spoof, 9.9.9.9, 10.0.0.1" }),
    ).toBe("9.9.9.9");
  });

  it("refuses a chain shorter than the trusted hop count", async () => {
    // Claims two proxies but only one entry present — untrustworthy, so unknown.
    expect(await clientIpWith(2, { "x-forwarded-for": "203.0.113.5" })).toBeNull();
  });

  it("ignores X-Forwarded-For entirely when no proxy is trusted", async () => {
    expect(await clientIpWith(0, { "x-forwarded-for": "203.0.113.5" })).toBeNull();
  });

  it("uses x-real-ip only when a proxy is trusted and no forwarded chain exists", async () => {
    expect(await clientIpWith(1, { "x-real-ip": "10.0.0.2" })).toBe("10.0.0.2");
    expect(await clientIpWith(0, { "x-real-ip": "10.0.0.2" })).toBeNull();
  });
});
