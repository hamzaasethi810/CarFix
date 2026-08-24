import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

/*
  Operator tooling. Deliberately a command-line script rather than a page in
  the app: granting administrator rights is the one action that, if it were
  reachable over HTTP, would turn any other bug into a total compromise. There
  is no self-service path to it anywhere in the product.

  Usage:
    npm run admin -- list
    npm run admin -- grant you@example.com
    npm run admin -- revoke them@example.com
    npm run admin -- whoami you@example.com
*/

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function list() {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", deletedAt: null },
    select: {
      email: true,
      createdAt: true,
      totpEnabledAt: true,
      profile: { select: { displayName: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (admins.length === 0) {
    console.log("No administrators yet. Grant one with: npm run admin -- grant <email>");
    return;
  }

  console.log(`${admins.length} administrator${admins.length === 1 ? "" : "s"}:\n`);
  for (const a of admins) {
    // Flagged loudly: an admin without a second factor is the weakest link in
    // the whole system, since they can see receipts and identity documents.
    const mfa = a.totpEnabledAt ? "2FA on" : "!! NO 2FA";
    console.log(`  ${a.email.padEnd(34)} ${(a.profile?.displayName ?? "").padEnd(20)} ${mfa}`);
  }
}

async function setRole(email: string, role: "ADMIN" | "USER") {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), deletedAt: null },
    select: { id: true, email: true, role: true, totpEnabledAt: true },
  });

  if (!user) {
    console.error(`No active account for ${email}. They must sign up first.`);
    process.exit(1);
  }

  if (user.role === role) {
    console.log(`${user.email} is already ${role}.`);
    return;
  }

  await prisma.user.update({ where: { id: user.id }, data: { role } });

  /*
    Role changes are audited like any other privileged action. The actor is
    the account itself, because a shell operator has no user record — the
    metadata records that it came from the command line.
  */
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: role === "ADMIN" ? "role.granted_admin" : "role.revoked_admin",
      targetType: "User",
      targetId: user.id,
      metadata: { previousRole: user.role, viaCli: true },
    },
  });

  console.log(`${user.email} is now ${role}.`);
  console.log("The change takes effect on their next request — the session re-reads the role.");

  if (role === "ADMIN" && !user.totpEnabledAt) {
    console.log(
      "\n!! This account has no second factor. Administrators can view receipts and\n" +
        "   identity documents, so have them turn it on at /settings/security.",
    );
  }
}

async function whoami(email: string) {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase() },
    select: {
      email: true,
      role: true,
      createdAt: true,
      deletedAt: true,
      totpEnabledAt: true,
      profile: { select: { username: true, displayName: true } },
      _count: { select: { vehicles: true, experiences: true, claimedShops: true } },
    },
  });

  if (!user) {
    console.error(`No account for ${email}.`);
    process.exit(1);
  }

  console.log(`  email        ${user.email}`);
  console.log(`  role         ${user.role}`);
  console.log(`  username     ${user.profile?.username ?? "—"}`);
  console.log(`  2FA          ${user.totpEnabledAt ? "on" : "off"}`);
  console.log(`  status       ${user.deletedAt ? "deleted" : "active"}`);
  console.log(`  vehicles     ${user._count.vehicles}`);
  console.log(`  reports      ${user._count.experiences}`);
  console.log(`  shops owned  ${user._count.claimedShops}`);
}

async function main() {
  const [command, arg] = process.argv.slice(2);

  switch (command) {
    case "list":
      await list();
      break;
    case "grant":
      if (!arg) throw new Error("Usage: npm run admin -- grant <email>");
      await setRole(arg, "ADMIN");
      break;
    case "revoke":
      if (!arg) throw new Error("Usage: npm run admin -- revoke <email>");
      await setRole(arg, "USER");
      break;
    case "whoami":
      if (!arg) throw new Error("Usage: npm run admin -- whoami <email>");
      await whoami(arg);
      break;
    default:
      console.log(
        "Commands:\n" +
          "  list              every administrator, and whether they have 2FA\n" +
          "  grant <email>     make an existing account an administrator\n" +
          "  revoke <email>    take it away\n" +
          "  whoami <email>    what one account is and owns",
      );
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
