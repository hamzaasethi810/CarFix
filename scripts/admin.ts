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
    npm run admin -- grant    you@example.com    (full administrator)
    npm run admin -- reviewer them@example.com   (document review only)
    npm run admin -- revoke   them@example.com   (back to an ordinary account)
    npm run admin -- whoami   you@example.com
*/

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function list() {
  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "REVIEWER"] }, deletedAt: null },
    select: {
      email: true,
      role: true,
      createdAt: true,
      totpEnabledAt: true,
      profile: { select: { displayName: true } },
    },
    orderBy: [{ role: "desc" }, { createdAt: "asc" }],
  });

  if (admins.length === 0) {
    console.log("Nobody has privileged access yet. Grant it with: npm run admin -- grant <email>");
    return;
  }

  console.log(`${admins.length} privileged account${admins.length === 1 ? "" : "s"}:\n`);
  for (const a of admins) {
    /*
      Flagged loudly. Both roles can mint links revealing receipts and identity
      documents, and the guards refuse to let either work without a second
      factor — so anyone listed without one is currently locked out.
    */
    const mfa = a.totpEnabledAt ? "2FA on" : "!! NO 2FA — blocked from the queues";
    console.log(
      `  ${a.email.padEnd(32)} ${a.role.padEnd(9)} ${(a.profile?.displayName ?? "").padEnd(16)} ${mfa}`,
    );
  }
}

async function setRole(email: string, role: "ADMIN" | "REVIEWER" | "USER") {
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

  /*
    sessionsValidFrom is bumped with the role, which is what actually signs the
    account out everywhere — with a JWT strategy there is no session row to
    delete, so every token issued before this instant is refused instead.
  */
  await prisma.user.update({
    where: { id: user.id },
    data: { role, sessionsValidFrom: new Date() },
  });

  /*
    Role changes are audited like any other privileged action. The actor is
    the account itself, because a shell operator has no user record — the
    metadata records that it came from the command line.
  */
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: `role.set_${role.toLowerCase()}`,
      targetType: "User",
      targetId: user.id,
      metadata: { previousRole: user.role, viaCli: true },
    },
  });

  console.log(`${user.email} is now ${role}.`);
  console.log("They have been signed out everywhere; the new role applies on their next login.");

  if (role !== "USER" && !user.totpEnabledAt) {
    console.log(
      "\nWhen they sign back in they will be sent straight to /setup-2fa and kept\n" +
        "there until an authenticator is enrolled. Duo Mobile: Add account, then\n" +
        "Use QR code. The review desk is at /review once that is done.",
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
    case "reviewer":
      if (!arg) throw new Error("Usage: npm run admin -- reviewer <email>");
      await setRole(arg, "REVIEWER");
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
          "  list               every privileged account, its role, and whether it has 2FA\n" +
          "  grant <email>      full administrator: queues, moderation, everything\n" +
          "  reviewer <email>   document review only: receipts and shop claims\n" +
          "  revoke <email>     back to an ordinary account\n" +
          "  whoami <email>     what one account is and owns",
      );
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
