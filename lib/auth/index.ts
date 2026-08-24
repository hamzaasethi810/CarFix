import "server-only";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
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
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7, updateAge: 60 * 15 },
  trustHost: true,
  pages: { signIn: "/login" },
  cookies: {
    sessionToken: {
      name: isProd ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: isProd },
    },
  },
  providers: [
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
  callbacks: {
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
