import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { env, isProd } from "../env";
import { findUserByEmail, findActiveUserById } from "../repositories/user";
import { verifyPassword } from "./password";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await findUserByEmail(parsed.data.email);
        if (!user) {
          // Equalize timing so a missing account is not distinguishable from a bad password.
          await verifyPassword(parsed.data.password, "$2a$12$" + "x".repeat(53));
          return null;
        }

        const ok = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!ok) return null;

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

      token.role = current.role;
      token.email = current.email;
      return token;
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as "USER" | "ADMIN") ?? "USER";
      }
      return session;
    },
  },
});
