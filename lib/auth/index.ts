import "server-only";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { env, isProd } from "../env";
import { findUserByEmail, findActiveUserById } from "../repositories/user";
import { verifyPassword } from "./password";
import { clientIdentifier, enforceRateLimit } from "../rate-limit";
import { hasMfaEnabled } from "../repositories/mfa";
import { verifySecondFactor } from "../services/mfa";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  // A TOTP code or a backup code, required only when the account has MFA on.
  totp: z.string().max(20).optional(),
});

// The Credentials provider requires the JWT session strategy, so the token is
// re-checked against the database on every request: a deleted account or a
// changed role takes effect immediately instead of living until token expiry.
export const { handlers, auth, signIn, signOut } = NextAuth({
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
      credentials: { email: {}, password: {} },
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
        await enforceRateLimit("login", `${ip}:${parsed.data.email.toLowerCase()}`);

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
          if (!parsed.data.totp) throw new CredentialsSignin("MFA_REQUIRED");
          const valid = await verifySecondFactor(user.id, parsed.data.totp);
          if (!valid) throw new CredentialsSignin("MFA_INVALID");
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
