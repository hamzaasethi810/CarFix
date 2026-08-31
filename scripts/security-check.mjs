/*
  Exercises the running site's security surface and exits non-zero on a
  finding.

  Deliberately black-box: it makes real requests to a real server rather than
  asserting over source. A guard that exists in the code but is not reached by
  the route is exactly the failure this is meant to catch, and reading the
  source cannot see it.

    npm run dev
    node scripts/security-check.mjs
    BASE_URL=https://gaari-app.vercel.app node scripts/security-check.mjs
*/

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const findings = [];
const passes = [];
const skips = [];

const record = (ok, name, detail) =>
  ok ? passes.push(name) : findings.push(`${name} — ${detail}`);

/*
  A check that could not run is not a check that failed.

  The rate limiter is shared across runs of this script, so a second run
  inside the window meets 429 on probes that have nothing to do with rate
  limiting. Reporting that as a finding trains people to ignore the output,
  which is worse than not running the check.
*/
const skip = (name, why) => skips.push(`${name} — ${why}`);

async function req(path, init) {
  try {
    return await fetch(BASE + path, { redirect: "manual", ...init });
  } catch (e) {
    return { status: 0, headers: new Headers(), error: String(e) };
  }
}

const json = (body) => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

/* 1 — every mutating route rejects an anonymous caller. */
const MUST_REJECT_ANON = [
  ["/api/experiences", json({ mechanicId: "x" })],
  ["/api/vehicles", json({ makeId: "x" })],
  ["/api/saved-searches", json({ name: "x" })],
  ["/api/reports", json({ targetType: "EXPERIENCE", targetId: "x", reason: "x" })],
  ["/api/shops/submit", json({ name: "x" })],
  ["/api/shops/claims", json({ mechanicId: "x" })],
  ["/api/mfa/enroll", { method: "POST" }],
  ["/api/billing/checkout", { method: "POST" }],
  ["/api/admin/reports", { method: "GET" }],
  ["/api/admin/verifications", { method: "GET" }],
  ["/api/admin/listings", { method: "GET" }],
];
for (const [path, init] of MUST_REJECT_ANON) {
  const r = await req(path, init);
  record(
    r.status === 401 || r.status === 403,
    `anon ${init.method ?? "GET"} ${path}`,
    `expected 401/403, got ${r.status}`,
  );
}

/* 2 — the Stripe webhook refuses an unsigned body. */
{
  const r = await req("/api/billing/webhook", json({ type: "checkout.session.completed" }));
  record(r.status >= 400, "unsigned stripe webhook", `expected 4xx, got ${r.status}`);
}

/* 3 — strict schemas reject unknown keys, so nothing can be mass-assigned. */
{
  const r = await req("/api/register", json({
    email: "a@example.com", password: "Str0ng!Passw0rd", username: "abc",
    displayName: "A", role: "ADMIN",
  }));
  if (r.status === 429) {
    skip("register rejects an injected role field", "rate limited from an earlier run");
  } else {
    record(r.status === 400 || r.status === 403, "register rejects an injected role field",
      `expected 400/403, got ${r.status}`);
  }
}

/* 4 — security headers. */
{
  const r = await req("/");
  const h = (n) => r.headers.get(n);
  record(Boolean(h("content-security-policy")), "CSP header", "missing");
  record(h("x-frame-options") === "DENY" || /frame-ancestors/.test(h("content-security-policy") ?? ""),
    "clickjacking protection", "no frame-ancestors or X-Frame-Options");
  record(h("x-content-type-options") === "nosniff", "nosniff", `got ${h("x-content-type-options")}`);
  record(!h("x-powered-by"), "no X-Powered-By", `leaks ${h("x-powered-by")}`);
  if (BASE.startsWith("https")) {
    record(Boolean(h("strict-transport-security")), "HSTS", "missing on an https origin");
  }
}

/* 5 — no server secret reaches the browser bundle. */
{
  const html = await (await req("/")).text?.() ?? "";
  const scripts = [...html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1]);
  let leaked = null;
  const PATTERNS = [
    [/\bsk_live_[A-Za-z0-9]/, "stripe secret key"],
    [/\bre_[A-Za-z0-9]{20,}/, "resend api key"],
    [/AUTH_SECRET["':\s]+["'][^"']{10,}/, "auth secret"],
    [/postgres(ql)?:\/\/[^"'\s]+/, "database url"],
  ];
  for (const src of scripts.slice(0, 25)) {
    const body = await (await req(src)).text?.() ?? "";
    for (const [re, label] of PATTERNS) if (re.test(body)) leaked = `${label} in ${src}`;
  }
  record(!leaked, "no server secret in the client bundle", leaked ?? "");
}

/* 6 — registration is rate limited. */
{
  /*
    Probes with a body that cannot possibly create an account.

    The route enforces the rate limit BEFORE parsing, so an empty object still
    consumes the bucket and still reaches 429 — while a well-formed payload
    would leave up to five real users behind every time this ran. A security
    check that dirties the database it is checking is not one you can point at
    production.
  */
  let limited = false;
  let created = false;
  for (let i = 0; i < 12 && !limited; i++) {
    const r = await req("/api/register", json({}));
    if (r.status === 429) limited = true;
    if (r.status === 201) created = true;
  }
  record(limited, "register is rate limited", "12 attempts and never a 429");
  record(!created, "the rate-limit probe creates nothing", "an empty body produced a 201");
}

const width = Math.max(...[...passes, ...findings].map((s) => s.split(" — ")[0].length));
for (const p of passes) console.log(`  ok    ${p}`);
for (const s of skips) console.log(`  skip  ${s}`);
for (const f of findings) console.log(`  FAIL  ${f}`);
console.log(
  `\n${passes.length} passed, ${findings.length} failed, ${skips.length} skipped  (${BASE})`,
);
void width;
if (findings.length) process.exit(1);
