import "server-only";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { prisma } from "../db";

/*
  The Prisma adapter, taught this schema's shape.

  Auth.js's default adapter writes a User row with `name` and `image` columns —
  the fields its stock schema keeps on User. This schema does not: the display
  name lives on Profile and there is no image column at all. Left unpatched,
  the very first Google sign-in threw `Unknown argument \`name\`` out of
  prisma.user.create, and the visitor was handed "There is a problem with the
  server configuration". Credentials sign-up never hit it, because it builds
  the user itself; only OAuth goes through the adapter, and OAuth was not live
  until now.

  createUser and updateUser are the only adapter methods that write those
  columns, so only they are overridden — down to the columns that actually
  exist. Everything else (getUserByAccount, linkAccount, and the rest) already
  matches, because Account is the stock shape.

  The Google display name is not stored on User; it is returned in the object
  so the `createUser` event (see lib/auth) can seed the Profile's displayName
  from it, and that same event marks the address verified because Google has
  proven it.
*/
const base = PrismaAdapter(prisma);

export const authAdapter: Adapter = {
  ...base,
  createUser: async ({ email, emailVerified, name }) => {
    const user = await prisma.user.create({
      data: { email: email.toLowerCase(), emailVerified: emailVerified ?? null },
      select: { id: true, email: true, emailVerified: true },
    });
    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      // Carried through, not stored: the createUser event reads it for the
      // Profile's displayName.
      name: name ?? null,
      image: null,
    };
  },
  updateUser: async ({ id, email, emailVerified }) => {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(email ? { email: email.toLowerCase() } : {}),
        ...(emailVerified !== undefined ? { emailVerified } : {}),
      },
      select: { id: true, email: true, emailVerified: true },
    });
    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      name: null,
      image: null,
    };
  },
};
