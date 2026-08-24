import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import bcrypt from "bcryptjs";

/*
  Resets an account's credentials from the command line, for the case where
  nobody can sign in to fix it from the site.

  Usage:
    npm run set-password -- <email> <newPassword> [newEmail] [newDisplayName]

  Changing the password signs the account out everywhere, on the assumption
  that a reset is often a response to a compromise.
*/

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const [email, password, newEmail, newDisplayName] = process.argv.slice(2);

  if (!email || !password) {
    console.error(
      "Usage: npm run set-password -- <email> <newPassword> [newEmail] [newDisplayName]",
    );
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("Password must be at least 12 characters.");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true },
  });
  if (!user) {
    console.error(`No account for ${email}.`);
    process.exit(1);
  }

  if (newEmail) {
    const taken = await prisma.user.findUnique({
      where: { email: newEmail.toLowerCase() },
      select: { id: true },
    });
    if (taken && taken.id !== user.id) {
      console.error(`${newEmail} is already in use.`);
      process.exit(1);
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(password, 12),
      ...(newEmail ? { email: newEmail.toLowerCase() } : {}),
      // Every existing session is refused after this.
      sessionsValidFrom: new Date(),
    },
  });

  if (newDisplayName) {
    await prisma.profile.update({
      where: { userId: user.id },
      data: { displayName: newDisplayName },
    });
  }

  console.log(`Updated ${newEmail?.toLowerCase() ?? user.email}.`);
  console.log("Signed out everywhere; the new password applies immediately.");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
