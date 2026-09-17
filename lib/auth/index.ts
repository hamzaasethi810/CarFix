import "server-only";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authAdapter } from "./adapter";
import { prisma } from "@/lib/db";
import { googleOAuth } from "@/lib/env";
import { ensureProfile, markEmailVerified } from "@/lib/repositories/user";
import { SIGNIN_ERROR, credentialFields, credentialsSchema } from "./credentials";
import { env, isProd } from "../env";
import { findUserByEmail, findActiveUserById } from "../repositories/user";
import { verifyPassword } from "./password";
import { clientIdentifier, enforceRateLimit } from "../rate-limit";
import { hasMfaEnabled } from "../repositories/mfa";
import { verifySecondFactor } from "../services/mfa";

/*
  Auth.js only forwards an error's `code` property to the browser — the message
  passed to the constructor is deliberately swallowed, so `new
  CredentialsSignin("MFA_REQUIRED")` arrives at the login page as the generic
  "credentials" code. The sign-in form then cannot tell "this account needs a
  code" from "that password was wrong", and never shows the code field, which
  locks out every account that has a second factor. Setting `code` explicitly
  is what actually crosses the boundary.

  Neither of these is disclosed until after the password has been accepted, so
  they tell an attacker nothing about an account they cannot already open.
*/
class MfaRequired extends CredentialsSignin {
  code = SIGNIN_ERROR.mfaRequired;
}

class MfaInvalid extends CredentialsSignin {
  code = SIGNIN_ERROR.mfaInvalid;
}

/*
  Rate limiting has the same boundary problem, one step further out.

  enforceRateLimit throws an AppError, which Auth.js does not recognise as a
  sign-in failure at all — it treats it as a crash and sends the browser to
  /api/auth/error?error=Configuration, a page telling the person the server is
  misconfigured. Someone who simply typed a code wrong a few times is told the
  site is broken, or (through the client helper) that their password is wrong,
  and heads for a password reset that cannot help them. The only fix is to wait,
  and nothing in the product ever says so.
*/
class TooManyAttempts extends CredentialsSignin {
  code = SIGNIN_ERROR.rateLimited;
}

// The Credentials provider requires the JWT session strategy, so the token is
// re-checked against the database on every request: a deleted account or a
// changed role takes effect immediately instead of living until token expiry.
export const {
  handlers,
  auth,
  signIn,
  signOut,
  /*
    Re-mints the session cookie from the database.

    The cookie carries a copy of the account's role and MFA state so that
    middleware can decide without a query. Copies go stale: enrolling a second
    factor changes the database but not the cookie already in the browser, and
    middleware would keep acting on the old answer for up to `updateAge`.
    Calling this after any change middleware cares about keeps the two in step.
  */
  unstable_update: refreshSessionCookie,
} = NextAuth({
  secret: env.AUTH_SECRET,
  /*
    A cookie we cannot decrypt is a signed-out visitor, not a fault.

    Auth.js logs JWTSessionError at error level and it fires on every single
    request for the life of the cookie. It means the browser is holding a token
    encrypted under a different secret — a rotated AUTH_SECRET, a cookie
    carried over from another environment, or a stale one from an earlier run.
    In every one of those cases the correct behaviour is exactly what already
    happens: no session, and the person signs in again.

    Left at error level it buries real problems in a scrolling wall, and it
    invites someone to go hunting for a bug in the auth config that is not
    there. Everything else still logs normally.
  */
  logger: {
    error(error) {
      if (error?.name === "JWTSessionError") {
        console.warn(
          "[auth] Ignoring a session cookie this secret cannot decrypt — " +
            "treating the request as signed out. Clear cookies for this site to stop the notice.",
        );
        return;
      }
      console.error(error);
    },
  },
  /*
    Twenty minutes of inactivity, not a week.

    updateAge is short so the cookie is refreshed while someone is actually
    working; the SessionGuard warns before the window closes so nobody loses a
    half-filled form to a silent expiry.
  */
  session: { strategy: "jwt", maxAge: 60 * 20, updateAge: 60 * 5 },
  trustHost: true,
  pages: { signIn: "/login" },
  events: {
    /*
      The adapter creates a User row and nothing else. Everything downstream
      assumes a Profile with a unique username, and a Google account has
      already proven its address, so both are settled here rather than
      leaving the account half-built.
    */
    async createUser({ user }) {
      if (!user.id || !user.email) return;
      await ensureProfile(user.id, user.email, user.name);
      await markEmailVerified(user.id);
    },
  },
  cookies: {
    sessionToken: {
      name: isProd ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: isProd },
    },
  },
  /*
    The adapter persists OAuth accounts. The strategy stays JWT, so
    sessionsValidFrom remains the thing that actually revokes a session;
    the adapter only owns User and Account rows.
  */
  adapter: authAdapter,
  providers: [
    ...(googleOAuth()
      ? [
          Google({
            clientId: googleOAuth()!.id,
            clientSecret: googleOAuth()!.secret,
            /*
              Left off deliberately. With it on, anyone who can create a
              Google account at an address that already has a password login
              here would be handed that account. Linking has to be an
              explicit action by someone already signed in.
            */
            allowDangerousEmailAccountLinking: false,
          }),
        ]
      : []),
    Credentials({
      credentials: credentialFields,
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        /*
          Brute-force protection. NextAuth owns this route, so the limit is
          applied here rather than in a handler. Keyed on the email being
          attempted AND the source address, so one attacker cannot lock out a
          victim by hammering their address from elsewhere.
        */
        const ip = clientIdentifier(request as unknown as Request);
        try {
          await enforceRateLimit("login", `${ip}:${parsed.data.email.toLowerCase()}`);
        } catch {
          // Re-thrown as a sign-in error so it reaches the form as a code
          // rather than being mistaken for a server fault.
          throw new TooManyAttempts();
        }

        const user = await findUserByEmail(parsed.data.email);
        if (!user) {
          // Equalize timing so a missing account is not distinguishable from a bad password.
          await verifyPassword(parsed.data.password, "$2a$12$" + "x".repeat(53));
          return null;
        }

        /*
          A Google-only account has no password to check.

          It fails exactly like a wrong password rather than saying so:
          "that address exists but has no password" is an account-enumeration
          oracle, and it tells an attacker which addresses to try on Google.
        */
        if (!user.passwordHash) return null;

        const ok = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        /*
          Second factor. The password alone is never enough once MFA is on,
          and the check runs here rather than after sign-in so no session is
          ever issued to someone holding only the password.
        */
        if (await hasMfaEnabled(user.id)) {
          if (!parsed.data.totp) throw new MfaRequired();
          const valid = await verifySecondFactor(user.id, parsed.data.totp);
          if (!valid) throw new MfaInvalid();
        }

        return { id: user.id, email: user.email, role: user.role };
      },
    }),
  ],
  /*
    Roles that must clear TOTP no matter how they signed in.

    The credentials provider enforces MFA itself. Google does not know MFA
    exists, so without this check a privileged account could sidestep the
    entire requirement by clicking Continue with Google.
  */
  callbacks: {
    async signIn({ account, user }) {
      if (account?.provider !== "google") return true;
      if (!user.email) return false;

      const existing = await prisma.user.findUnique({
        where: { email: user.email.toLowerCase() },
        select: { id: true, role: true, totpEnabledAt: true, deletedAt: true },
      });

      // A deleted account does not come back through a side door.
      if (existing?.deletedAt) return false;

      if (existing && existing.role !== "USER" && !existing.totpEnabledAt) {
        return "/login?error=MFA_REQUIRED";
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      if (!token.sub) return token;

      const current = await findActiveUserById(token.sub);
      if (!current) return {};

      /*
        A role change bumps sessionsValidFrom, so any token minted before it is
        discarded here. This is what actually signs someone out everywhere —
        with a JWT strategy there is no server-side session row to delete.
      */
      if (current.sessionsValidFrom && token.iat) {
        const issuedAt = new Date(token.iat * 1000);
        if (issuedAt < current.sessionsValidFrom) return {};
      }

      token.role = current.role;
      token.email = current.email;
      // Lets the layout push a privileged account into enrolment without a
      // database read on every render.
      token.mfaEnabled = Boolean(current.totpEnabledAt);
      return token;
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as "USER" | "REVIEWER" | "ADMIN") ?? "USER";
        session.user.mfaEnabled = Boolean(token.mfaEnabled);
      }
      return session;
    },
  },
});
