# Sign-in, Session and Garage Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild sign-in around Google OAuth on a split-panel layout, add a 20-minute idle session with an explicit stay-or-leave prompt, animate the landing stat counters, turn the garage into a dashboard, and put a Find shops link in the header for signed-in users.

**Architecture:** Google is added as a second NextAuth provider alongside the existing credentials flow, which requires making `passwordHash` nullable and wiring the Prisma adapter that is installed but unused. Session strategy stays JWT; `maxAge` drops to 20 minutes and a client component warns before expiry. The landing counters and garage dashboard are presentation-only changes over existing services.

**Tech Stack:** Next.js 16 App Router, React 19, NextAuth v5 beta, Prisma 7, Tailwind v4, Vitest.

**Spec:** None written — implements the brief given in conversation on 2026-09-01.

---

## Component integration findings

The supplied `sign-in-page.tsx` cannot be pasted in as given. Six findings, each with the resolution this plan takes.

**1. This is not a shadcn project, and should not become one.**
There is no `components.json`. The repo has its own design system in `components/ui.tsx` (`Card`, `PageTitle`, `Stat`, `EmptyState`, `buttonStyles`, `popoverSurface`) built on Tailwind v4 tokens in `app/globals.css`. Running `npx shadcn@latest init` would install `clsx`, `tailwind-merge` and `class-variance-authority`, write a `cn()` helper, and introduce a *second* parallel system with its own colour vocabulary. Two design systems in one app is worse than either alone. **No shadcn init.**

If you ever do want it: `npx shadcn@latest init` then `npx shadcn@latest add button input label`. Not part of this plan.

**2. `/components/ui` cannot be a folder here — `components/ui.tsx` is a file.**
Creating `components/ui/` makes the specifier `@/components/ui` ambiguous: TypeScript and bundler resolution prefer `ui.tsx` over `ui/index.ts`, so a folder would either be silently ignored or shadow the file depending on resolver order, and the ~40 existing imports of `@/components/ui` would resolve unpredictably.

The convention that matters — colocated, importable presentational primitives — is already satisfied by `components/ui.tsx`. **New components go in `components/auth/` and `components/landing/`, matching the existing `components/landing/` grouping.**

**3. `react-router-dom` must not be installed.**
This is a Next.js App Router app. `useNavigate` and `BrowserRouter` have no meaning here and would break server rendering. Replace `navigate('/signup')` with `next/link`, and any imperative navigation with `useRouter` from `next/navigation`. **`demo.tsx` is discarded entirely.**

**4. Both images are blocked by this app's CSP.**
`next.config.ts` sets `img-src 'self' blob: data:`. The component's `https://i.ibb.co/...` asset — and the suggested Unsplash replacements — are cross-origin and will not render. Rather than widen the CSP for decoration, the left panel uses a **local** asset: `public/img/car-green.webp`, the studio render committed in the landing plan (~75KB).

**Superseded:** an earlier revision of this plan filled the panel with the procedural particle car. That car is being deleted for reading as generated, so the login page must not adopt it either — it would be the same look on the one screen every user sees first.

**5. The colour scheme is from a different product.**
The component is slate/blue/white with `text-gray-900`, `bg-blue-600`, `rounded-xl`. This app is warm paper: `--bg: #EFEAE0`, `--label: #1E211D`, `--accent: #186237`, with `rounded-control`. The **layout** is adopted (split panel, stacked fields, reveal toggle, divider, social button); the **skin** is replaced with tokens.

**6. "Remember me" remembers the email, not the session.**
It first read as a contradiction with the 20-minute idle timeout; it is not. The ask is that a returning user finds their email already filled and can type a password and press Enter. That is form convenience, not session lifetime, so both ship.

Store the **email address only**, in `localStorage`, and prefill it with the password field autofocused so Enter submits. Never store the password, and never store a token or session id: that would be the one change in this plan that actually creates a vulnerability.

**GitHub sign-in is also dropped** — only Google was asked for, and each provider is a real support and security surface.

## Global Constraints

- **Google must not become an MFA bypass.** Credentials sign-in enforces TOTP. An `ADMIN` or `REVIEWER` who signs in with Google must still be challenged, or the earlier requirement that privileged roles carry MFA is void.
- **A Google account's email is verified.** Set `emailVerified` on link so those users are not blocked by `requireVerifiedUser()`.
- `passwordHash` becomes nullable. Every read of it must handle `null` — a Google-only account has no password, and credentials sign-in must reject rather than throw for such an account.
- Session stays `strategy: "jwt"`. There is no server-side session row to revoke; the existing `sessionVersion` bump remains the revocation mechanism.
- **Motion rules** (`emil-design-eng`): only `transform` and `opacity`; easing `cubic-bezier(0.23, 1, 0.32, 1)`; never `ease-in`; UI transitions ≤ 300ms; pressable elements get `active:scale-[0.97]` at 160ms; hover effects gated behind `@media (hover: hover) and (pointer: fine)`; `prefers-reduced-motion: reduce` keeps opacity and drops movement — counters jump straight to their final value.
- No new secret is committed. `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are read through `lib/env.ts` like every other credential.

## Interpretation to confirm

> "Add session cookies so it signs out after 20 minutes and it should make them accept or deny."

Read as: **an idle-timeout prompt** — at 18 minutes a dialog asks "Stay signed in?" and the user accepts (session extends) or denies (signs out now); silence signs them out at 20. Task 4 builds that.

If you meant a **cookie-consent banner** instead, say so — it is a different component and does not belong to the session lifecycle.

## File Structure

| File | Responsibility |
| --- | --- |
| `prisma/schema.prisma` | **Modify.** `passwordHash String?`. |
| `lib/env.ts` | **Modify.** Google client id/secret, optional. |
| `lib/auth/index.ts` | **Modify.** Prisma adapter, Google provider, MFA gate, 20-min session. |
| `components/auth/sign-in-panel.tsx` | **Create.** The form: email, password with reveal, Google button. |
| `components/auth/car-panel.tsx` | **Create.** Left panel; local studio photograph. |
| `app/login/page.tsx` | **Rewrite.** Split layout. |
| `components/session-guard.tsx` | **Create.** Idle countdown + stay/leave dialog. |
| `app/layout.tsx` | **Modify.** Mount `SessionGuard` when signed in. |
| `components/landing/count-up.tsx` | **Create.** Scroll-triggered animated number. |
| `app/api/stats/route.ts` | **Create.** Small JSON endpoint for live refresh. |
| `app/garage/page.tsx` | **Rewrite.** Dashboard layout. |
| `app/garage/add-vehicle-sheet.tsx` | **Create.** Wraps the existing form in a dialog. |
| `components/site-header.tsx` | **Modify.** Find shops link when signed in. |
| `tests/oauth-mfa.test.ts` | **Create.** Google must not bypass MFA. |
| `tests/session-timeout.test.ts` | **Create.** Session maxAge is 20 minutes. |

---

### Task 1: Dependencies and placement

**Files:** `package.json`

- [ ] **Step 1: Install the one dependency that is actually needed**

```bash
npm install lucide-react
```

`lucide-react` supplies `Eye`, `EyeOff`, `ArrowLeft`. Do **not** install `react-router-dom`.

- [ ] **Step 2: Confirm nothing else was pulled in**

```bash
node -e "const d=require('./package.json').dependencies; console.log('router:', d['react-router-dom'] ?? 'absent (correct)'); console.log('lucide:', d['lucide-react'])"
```
Expected: `router: absent (correct)`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add lucide-react for auth icons"
```

---

### Task 2: Google sign-in without an MFA hole

**Files:** `prisma/schema.prisma`, `lib/env.ts`, `lib/auth/index.ts`, `tests/oauth-mfa.test.ts`

**Interfaces:**
- Produces: a `google` provider id usable via `signIn("google")`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/oauth-mfa.test.ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/*
  A behavioural test would need a live Google handshake, so this asserts the
  wiring instead: the two mistakes that would open a hole are a missing role
  check in signIn, and a Google account arriving without emailVerified.
*/
const src = readFileSync("lib/auth/index.ts", "utf8");

describe("google sign-in", () => {
  it("challenges privileged roles for MFA rather than trusting the provider", () => {
    expect(src).toMatch(/PRIVILEGED_ROLES|ADMIN.*REVIEWER|REVIEWER.*ADMIN/);
    expect(src).toMatch(/totpEnabledAt/);
  });

  it("marks a google account's email as verified on link", () => {
    expect(src).toMatch(/emailVerified/);
  });

  it("keeps the jwt strategy, so sessionVersion stays the revocation path", () => {
    expect(src).toMatch(/strategy:\s*"jwt"/);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx vitest run tests/oauth-mfa.test.ts`
Expected: FAIL on the first two assertions.

- [ ] **Step 3: Make passwordHash nullable**

```prisma
// prisma/schema.prisma — in model User
/// Null for an account that only ever signs in through Google.
passwordHash  String?
```

Then:

```bash
npx prisma migrate dev --name nullable-password-hash
```

- [ ] **Step 4: Handle the null everywhere it is read**

```bash
grep -rn "passwordHash" lib app --include=*.ts --include=*.tsx | grep -v node_modules
```

At each site, a `null` hash means "this account has no password". Credentials sign-in must fail closed:

```ts
// lib/auth/credentials.ts (or wherever the hash is compared)
if (!user.passwordHash) {
  // Google-only account. Fail exactly like a wrong password: revealing that
  // an email exists but has no password is an account-enumeration oracle.
  return null;
}
```

- [ ] **Step 5: Add the env vars**

```ts
// lib/env.ts — alongside the other optional credentials
export const googleOAuth = () => {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  return id && secret ? { id, secret } : null;
};
```

- [ ] **Step 6: Wire the provider and the gate**

```ts
// lib/auth/index.ts
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/db";
import { googleOAuth } from "@/lib/env";

/*
  Roles that must clear TOTP however they signed in.

  Credentials sign-in enforces MFA itself. An OAuth provider does not know
  about it, so without this a privileged account could sidestep the whole
  requirement by clicking Continue with Google.
*/
const PRIVILEGED_ROLES = new Set(["ADMIN", "REVIEWER"]);

const google = googleOAuth();

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 60 * 20, updateAge: 60 * 5 },
  providers: [
    Credentials({ /* unchanged */ }),
    ...(google
      ? [Google({
          clientId: google.id,
          clientSecret: google.secret,
          // Google has already proven the address; skipping this would leave
          // OAuth users blocked by requireVerifiedUser().
          allowDangerousEmailAccountLinking: false,
        })]
      : []),
  ],
  callbacks: {
    async signIn({ account, user }) {
      if (account?.provider !== "google") return true;
      const existing = await prisma.user.findUnique({
        where: { email: user.email! },
        select: { role: true, totpEnabledAt: true },
      });
      if (!existing) return true; // new account, USER by default
      if (PRIVILEGED_ROLES.has(existing.role) && !existing.totpEnabledAt) {
        // Privileged and unprotected: refuse rather than issue a session.
        return "/login?error=MFA_REQUIRED";
      }
      return true;
    },
    async jwt({ token, account }) {
      if (account?.provider === "google" && token.email) {
        await prisma.user.updateMany({
          where: { email: token.email, emailVerified: null },
          data: { emailVerified: new Date() },
        });
      }
      return token; // then the existing sessionVersion / mfaEnabled logic
    },
    /* session() unchanged */
  },
});
```

> **Note for the implementer:** merge into the existing `callbacks` object rather than replacing it — `jwt` already carries `sessionVersion` and `mfaEnabled` logic that must survive.

- [ ] **Step 7: Run tests and commit**

```bash
npx vitest run tests/oauth-mfa.test.ts && npx tsc --noEmit && npm run lint
git add -A && git commit -m "feat(auth): google sign-in, with MFA still enforced for privileged roles"
```

---

### Task 3: The sign-in page

**Files:** `components/auth/car-panel.tsx`, `components/auth/sign-in-panel.tsx`, `app/login/page.tsx`

- [ ] **Step 1: The left panel**

```tsx
// components/auth/car-panel.tsx
import Image from "next/image";

/*
  A photograph, not a generated graphic.

  The original component pointed at an image on an external host, which this
  app's CSP (`img-src 'self' blob: data:`) blocks outright. The file is local
  instead, so the policy stays narrow.

  It is deliberately not the particle car: that is being removed from the
  product for looking machine-made, and the sign-in page is the worst place
  to keep a look the rest of the app is dropping.
*/
export function CarPanel() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-grouped">
      <Image
        src="/img/car-green.webp"
        alt=""
        fill
        priority
        sizes="50vw"
        className="object-cover"
      />
    </div>
  );
}
```

- [ ] **Step 2: The form panel**

```tsx
// components/auth/sign-in-panel.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { buttonStyles } from "@/components/ui";

/*
  Layout taken from the supplied component; skin taken from this app.

  Kept: the split panel, stacked fields, the reveal toggle, the divider, the
  provider button. Dropped: "remember me", which contradicts the 20-minute
  idle session shipping alongside it, and the GitHub button, which nobody
  asked for and which is a real support surface.
*/
export function SignInPanel({
  googleEnabled,
  onCredentials,
  onGoogle,
  error,
}: {
  googleEnabled: boolean;
  onCredentials: (form: FormData) => void;
  onGoogle: () => void;
  error?: string;
}) {
  const [reveal, setReveal] = useState(false);

  const field =
    "w-full min-h-11 rounded-control border border-separator bg-elevated px-4 " +
    "text-body outline-none transition-[border-color,box-shadow] duration-150 " +
    "focus:border-accent focus:ring-2 focus:ring-accent/25";

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-title1 font-semibold">Welcome back</h1>
      <p className="text-subhead text-secondary mt-1.5">
        New here?{" "}
        <Link href="/register" className="text-accent font-medium underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>

      {googleEnabled && (
        <>
          <button
            type="button"
            onClick={onGoogle}
            className="mt-8 w-full min-h-11 flex items-center justify-center gap-2.5 rounded-control border border-separator bg-elevated text-subhead font-medium transition-transform duration-150 ease-out active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-tertiary"
          >
            <GoogleMark />
            Continue with Google
          </button>

          {/* Google leads because it is the path most people will take. */}
          <div className="relative my-6 text-center">
            <span className="absolute inset-x-0 top-1/2 border-t border-separator" />
            <span className="relative bg-bg px-3 text-footnote text-tertiary-label">
              or use your email
            </span>
          </div>
        </>
      )}

      <form action={onCredentials} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-subhead font-medium mb-1.5">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required className={field} />
        </div>

        <div>
          <label htmlFor="password" className="block text-subhead font-medium mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={reveal ? "text" : "password"}
              autoComplete="current-password"
              required
              className={`${field} pr-12`}
            />
            <button
              type="button"
              onClick={() => setReveal((r) => !r)}
              aria-label={reveal ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center h-9 w-9 rounded-control text-secondary transition-transform duration-150 ease-out active:scale-[0.97]"
            >
              {reveal ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-footnote text-destructive">
            {error}
          </p>
        )}

        <button type="submit" className={`${buttonStyles.primary} w-full`}>
          Sign in
        </button>

        <Link
          href="/reset-password"
          className="block text-center text-footnote text-secondary hover:text-label"
        >
          Forgot your password?
        </Link>
      </form>
    </div>
  );
}

/* Google's mark is a brand asset with fixed colours; lucide has no equivalent. */
function GoogleMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
```

- [ ] **Step 3: The page**

Rewrite `app/login/page.tsx` as a two-column layout: `CarPanel` on the left (`hidden lg:block`), `SignInPanel` centred on the right, with a back-to-home link over the panel. Wire `onCredentials` to the existing server action in `app/login/login-form.tsx` (do not reimplement the MFA branch — reuse it) and `onGoogle` to `signIn("google")`.

On a phone the car panel is hidden and the form fills the screen; the split only appears at `lg`.

- [ ] **Step 4: Verify**

Check: keyboard tab order reaches Google → email → password → reveal → submit; the reveal button has an `aria-label` that changes; the form still handles the `MFA_REQUIRED` branch; the page renders with `GOOGLE_CLIENT_ID` unset (Google button simply absent).

- [ ] **Step 5: Commit**

```bash
npx tsc --noEmit && npm run lint && git add -A
git commit -m "feat(auth): split-panel sign-in with google"
```

---

### Task 4: 20-minute idle session with a stay-or-leave prompt

**Files:** `components/session-guard.tsx`, `app/layout.tsx`, `tests/session-timeout.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/session-timeout.test.ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("session lifetime", () => {
  it("expires after twenty minutes", () => {
    const src = readFileSync("lib/auth/index.ts", "utf8");
    expect(src).toMatch(/maxAge:\s*60\s*\*\s*20\b/);
  });

  it("warns before it expires, not after", () => {
    const src = readFileSync("components/session-guard.tsx", "utf8");
    const warn = Number(src.match(/WARN_AT_MS\s*=\s*([\d_]+)/)?.[1]?.replace(/_/g, ""));
    const idle = Number(src.match(/IDLE_MS\s*=\s*([\d_]+)/)?.[1]?.replace(/_/g, ""));
    expect(warn).toBeLessThan(idle);
    expect(idle).toBe(20 * 60 * 1000);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx vitest run tests/session-timeout.test.ts` → FAIL.

- [ ] **Step 3: Build the guard**

```tsx
// components/session-guard.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";

/*
  Idle timeout, with the choice made explicit.

  The session cookie itself expires at twenty minutes; this only decides what
  the user sees on the way there. Being signed out mid-form with no warning is
  the failure mode worth avoiding, so at eighteen minutes a dialog asks, and
  the last two minutes are theirs to answer in.

  Activity resets the clock. The listeners are passive and coarse — this must
  not cost anything on a page being actively used.
*/
const IDLE_MS = 20 * 60 * 1000;
const WARN_AT_MS = 18 * 60 * 1000;

export function SessionGuard() {
  const [warning, setWarning] = useState(false);
  const last = useRef(Date.now());

  useEffect(() => {
    const bump = () => {
      last.current = Date.now();
      setWarning(false);
    };
    const events = ["pointerdown", "keydown", "scroll", "focus"] as const;
    for (const e of events) window.addEventListener(e, bump, { passive: true });

    // One timer, polled — not a timeout per event, which would churn.
    const id = setInterval(() => {
      const idle = Date.now() - last.current;
      if (idle >= IDLE_MS) signOut({ redirectTo: "/login?expired=1" });
      else if (idle >= WARN_AT_MS) setWarning(true);
    }, 15_000);

    return () => {
      for (const e of events) window.removeEventListener(e, bump);
      clearInterval(id);
    };
  }, []);

  if (!warning) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="idle-title"
      className="fixed inset-0 z-[100] grid place-items-center bg-black/40 p-4"
    >
      <div className="w-full max-w-sm rounded-card border border-separator bg-elevated p-6 shadow-lg animate-[dialog-in_200ms_cubic-bezier(0.23,1,0.32,1)]">
        <h2 id="idle-title" className="text-headline font-semibold">
          Still there?
        </h2>
        <p className="text-subhead text-secondary mt-2">
          You will be signed out in a couple of minutes to keep your account safe.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            autoFocus
            onClick={() => {
              last.current = Date.now();
              setWarning(false);
            }}
            className="flex-1 min-h-11 rounded-control bg-accent-fill text-white text-subhead font-medium transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            Stay signed in
          </button>
          <button
            onClick={() => signOut({ redirectTo: "/login" })}
            className="flex-1 min-h-11 rounded-control border border-separator text-subhead transition-transform duration-150 ease-out active:scale-[0.97]"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
```

```css
/* app/globals.css — append. Never scale(0): nothing appears from nothing. */
@keyframes dialog-in {
  from { opacity: 0; transform: scale(0.96) translateY(6px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes dialog-in { from { opacity: 0; } to { opacity: 1; } }
}
```

- [ ] **Step 4: Mount it only for signed-in users**

In `app/layout.tsx`, render `<SessionGuard />` inside the branch that already knows `isAuthed`. A signed-out visitor must never see it.

- [ ] **Step 5: Verify by hand**

Temporarily set `IDLE_MS = 30_000` and `WARN_AT_MS = 15_000`, confirm: the dialog appears at 15s, "Stay signed in" dismisses it and the clock resets, ignoring it signs out at 30s with `?expired=1`, and moving the mouse before 15s prevents it entirely. **Restore the real values.**

- [ ] **Step 6: Commit**

```bash
npx vitest run tests/session-timeout.test.ts && git add -A
git commit -m "feat(auth): 20-minute idle session with an explicit stay-or-leave prompt"
```

---

### Task 5: Animated stat counters

**Files:** `components/landing/count-up.tsx`, `app/api/stats/route.ts`, `app/page.tsx`

- [ ] **Step 1: The counter**

```tsx
// components/landing/count-up.tsx
"use client";

import { useEffect, useRef, useState } from "react";

/*
  Counts up once, when it first scrolls into view.

  Driven by rAF against a clock rather than a fixed number of steps, so the
  duration holds on a slow device instead of stretching. Eased out: the number
  should land, not drift into place.

  Under reduced motion it renders the final value immediately — a spinning
  number is exactly the kind of movement that setting is asking to be spared.
*/
export function CountUp({ value, duration = 1100 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    // Already counted once; a later value change just retargets from here.
    if (done.current) {
      setShown(value);
      return;
    }

    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      done.current = true;
      const from = 0;
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / duration);
        const eased = 1 - (1 - t) ** 3;
        setShown(Math.round(from + (value - from) * eased));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.4 });

    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {shown.toLocaleString("en-US")}
    </span>
  );
}
```

- [ ] **Step 2: The live endpoint**

```ts
// app/api/stats/route.ts
import { NextResponse } from "next/server";
import { getProofNumbers } from "@/lib/services/stats";

/*
  The counters' refresh source. Cached briefly at the edge: these numbers move
  slowly, and a landing page does not need a database round trip per viewer.
*/
export const revalidate = 60;

export async function GET() {
  const stats = await getProofNumbers();
  return NextResponse.json(stats ?? {}, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
  });
}
```

- [ ] **Step 3: Refresh on return, not on a timer**

In the landing stats component, re-fetch `/api/stats` on `visibilitychange` when the tab becomes visible again, and not otherwise. A `setInterval` poll would spend a request every N seconds on a number that changes a few times a day; refreshing when someone comes back gets the same perceived liveness for almost nothing.

- [ ] **Step 4: Verify**

Confirm the numbers animate on first scroll into view, do **not** re-animate on scroll back, land on the exact value, and jump instantly under emulated reduced motion.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(landing): animated, self-refreshing stat counters"
```

---

### Task 6: Garage as a dashboard

**Files:** `app/garage/page.tsx`, `app/garage/add-vehicle-sheet.tsx`

- [ ] **Step 1: Move the form into a sheet**

Create `app/garage/add-vehicle-sheet.tsx`: a client component with an "Add a car" button that opens a dialog containing the existing `<AddVehicleForm makes={makes} />`. Do not rewrite the form. The dialog uses `transform-origin: center` (it is not anchored to a trigger), enters at `scale(0.96)` + `opacity: 0`, 200ms, `cubic-bezier(0.23, 1, 0.32, 1)`, closes on Escape and backdrop click, and returns focus to the button.

- [ ] **Step 2: Rebuild the page as a dashboard**

Replace the two-column list with:

- A header row: page title on the left, "Add a car" button on the right.
- A summary strip of the numbers that make it a dashboard — vehicles owned, services logged, total spent, and (once prices exist) cost per mile. Reuse `Stat` from `components/ui.tsx` and `CountUp` from Task 5. Any figure that is zero is omitted, per the existing rule.
- **Rows, not cards.** A `divide-y` list on a flat ground, no shadows and no `<Card>`. Elevation is reserved for things that genuinely float (the add-car dialog). Thirty-six files currently wrap content in `<Card>`, which is why the app reads as soft boxes stacked on a background.
- Each row shows identity and one number only: chassis code as the dominant mark (mono, tabular), then nickname, then year/make/model, then spend.
- **Everything else goes behind disclosure.** Wrap the detail in native `<details>`/`<summary>`: service history, mileage, per-service costs, dates. Native rather than a JS accordion because keyboard support, `aria-expanded` and find-in-page all come free and it works without JS.
- Hover is a `border-l` accent, 150ms `ease-out`, gated behind `@media (hover: hover) and (pointer: fine)`, with `active:scale-[0.99]`. No lift: rows do not float.

**Palette note.** `--bg: #EFEAE0` and the warm near-black ink are the exact AI-default "premium consumer" family (documented in `design-taste-frontend` Section 4.2, which names `#efeae0` by hex). It is the main reason the app reads as generated. The accent `#186237` is already forest green, so the cheapest correction is to keep the green, promote it, and move the ground to bone or true off-black. **Do not do this inside the garage task** — a palette change is app-wide and needs its own pass, or the garage will not match any other screen.

- [ ] **Step 2b: Fix the off-system radii**

```bash
grep -rnE "rounded-\[3px\]|rounded-\[4px\]|rounded-\[6px\]|rounded-md" app components
```
Six instances break the one-radius-scale rule. Move each to `rounded-control` (6px) or `rounded-card` (10px).

- [ ] **Step 3: Empty state**

A single centred panel: "No cars yet", one line of explanation, and the same "Add a car" button as the primary action. This is seen once per user, so it is the one place in the app where delight is worth the bytes.

- [ ] **Step 4: Verify**

Check at 393px, 768px and 1440px: cards go one-up, two-up, three-up; the Add button stays reachable; the dialog traps focus and restores it on close.

- [ ] **Step 5: Commit**

```bash
npx tsc --noEmit && npm run lint && git add -A
git commit -m "feat(garage): dashboard layout with add-car in a sheet"
```

---

### Task 7: Find shops in the header

**Files:** `components/site-header.tsx`

- [ ] **Step 1: Add the link**

Inside the existing `{isAuthed && (...)}` block in `components/site-header.tsx`, before `Garage`:

```tsx
<Link href="/search" className={navLink}>
  Find shops
</Link>
```

- [ ] **Step 2: Check it at 360px**

The header already hides "Log a service" below `sm` using `max-sm:hidden` — because a plain `hidden` loses the cascade against `navLink`'s `inline-flex`. If adding a third link wraps the header on a narrow phone, apply the same `max-sm:hidden` treatment to the lower-priority link, not a bare `hidden`.

- [ ] **Step 3: Commit**

```bash
git add components/site-header.tsx
git commit -m "feat(header): find shops link for signed-in users"
```

---

### Task 8: Verification pass

- [ ] **Step 1: Full gates**

```bash
npx tsc --noEmit && npm run lint && npx vitest run && npm run build
```

- [ ] **Step 2: Security**

```bash
npm run security:check
```
Then confirm by hand: signing in with Google as an `ADMIN` without TOTP is refused; a Google-only account cannot sign in through the password form; `/api/stats` exposes only the three counts.

- [ ] **Step 3: CSP**

Load `/login` and confirm the console shows **no** CSP violations — the car panel is a canvas, and no external image is requested.

- [ ] **Step 4: Motion audit**

No `transition: all`; no `ease-in`; counters do not replay; the idle dialog does not animate from `scale(0)`; everything degrades correctly under `prefers-reduced-motion: reduce`.

- [ ] **Step 5: Screens**

Capture `/login`, `/garage` and `/` at 393×852 and 1440×900.

---

## Self-Review

**Brief coverage:** registration still required (no anonymous posting) · sign-in redesigned · Google added (Task 2, 3) · component integrated with its incompatibilities resolved (findings above) · stat cards animate and refresh (Task 5) · garage is a dashboard with add-car as a button (Task 6) · header link when signed in (Task 7) · 20-minute session with accept/deny (Task 4) · minimal but not plain, via one signature element per screen rather than decoration everywhere.

**Placeholders:** Task 3 Step 3 and Task 6 Step 2 describe layout rather than printing full files — deliberate, because both must reuse existing server actions and form components that the implementer needs to read first. Every novel mechanism is written out.

**Type consistency:** `CountUp` is defined in Task 5 and consumed in Task 6. `SignInPanel` props match the callbacks the page supplies in Task 3.

**Risks carried into execution:**
- Adding `PrismaAdapter` to a project that has been running JWT-only can change account-linking behaviour for existing emails. Task 2 sets `allowDangerousEmailAccountLinking: false`, so a Google sign-in whose email already exists as a credentials account will be refused rather than silently merged. Decide deliberately if you want linking instead.
- `passwordHash` becoming nullable touches every read; Task 2 Step 4 greps for them rather than assuming the list.
