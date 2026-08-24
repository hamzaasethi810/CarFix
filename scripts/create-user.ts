import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import bcrypt from "bcryptjs";

/*
  Creates an account from the command line, for bootstrapping the first
  operator on a fresh database. Everyone else signs up through the site.

  Usage:
    npm run create-user -- <email> <username> "<display name>" <password> [role]

  The password is read from the argument list, so it will land in your shell
  history — change it from the site afterwards if that matters.
*/

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const [email, username, displayName, password, role = "USER"] = process.argv.slice(2);

  if (!email || !username || !displayName || !password) {
    console.error(
      'Usage: npm run create-user -- <email> <username> "<display name>" <password> [USER|REVIEWER|ADMIN]',
    );
    process.exit(1);
  }

  // Same rules the sign-up form enforces, so a CLI-made account is not special.
  if (!/^[a-z0-9_]{3,30}$/.test(username)) {
    console.error(
      `Username "${username}" is not valid. Lowercase letters, numbers, and underscores only, 3-30 characters.`,
    );
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("Password must be at least 12 characters.");
    process.exit(1);
  }
  if (!["USER", "REVIEWER", "ADMIN"].includes(role)) {
    console.error(`Role must be USER, REVIEWER, or ADMIN — got "${role}".`);
    process.exit(1);
  }

  const lowerEmail = email.toLowerCase();

  const [emailTaken, usernameTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email: lowerEmail }, select: { id: true } }),
    prisma.profile.findUnique({ where: { username }, select: { id: true } }),
  ]);
  if (emailTaken) {
    console.error(`${lowerEmail} already has an account.`);
    process.exit(1);
  }
  if (usernameTaken) {
    console.error(`The username "${username}" is taken.`);
    process.exit(1);
  }

  const user = await prisma.user.create({
    data: {
      email: lowerEmail,
      passwordHash: await bcrypt.hash(password, 12),
      role: role as "USER" | "REVIEWER" | "ADMIN",
      profile: { create: { username, displayName } },
    },
    select: { id: true, email: true, role: true },
  });

  console.log(`Created ${user.email} as ${user.role} (username: ${username}).`);

  if (role !== "USER") {
    console.log(
      "\nOn first sign-in this account goes straight to /setup-2fa and stays there\n" +
        "until an authenticator is enrolled. Duo Mobile: Add account, Use QR code.\n" +
        "The review desk is at /review afterwards.",
    );
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
