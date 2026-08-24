import "server-only";
import { auth } from "./index";
import { forbidden, unauthenticated } from "../errors";

export type AuthedUser = { id: string; role: "USER" | "ADMIN" };

export async function currentUser(): Promise<AuthedUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { id: session.user.id, role: session.user.role };
}

export async function requireUser(): Promise<AuthedUser> {
  const user = await currentUser();
  if (!user) throw unauthenticated();
  return user;
}

export async function requireAdmin(): Promise<AuthedUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw forbidden();
  return user;
}
