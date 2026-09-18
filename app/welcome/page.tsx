import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/guards";
import { findUserJoinTime } from "@/lib/repositories/user";

/*
  Where a Google sign-in lands, so a brand-new account gets to choose its name.

  A first Google sign-in creates the account with the name and handle taken
  from the Google profile — a sensible default, but not a choice. This sends a
  just-created account to the account settings with a welcome note, where the
  display name and username are already the fields on the page, so "choose your
  name" needs no separate screen. A returning account (this is just another
  Google login) goes straight to the garage.

  New versus returning is told by how long ago the account was created: the
  redirect after account creation happens within seconds, so a wide ten-minute
  window catches it without a schema flag to track "has onboarded", and an old
  account falls through to the garage.
*/
const NEW_ACCOUNT_WINDOW_MS = 10 * 60_000;

export default async function WelcomePage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const joined = await findUserJoinTime(user.id);
  const isNew = joined ? Date.now() - joined.createdAt.getTime() < NEW_ACCOUNT_WINDOW_MS : false;

  redirect(isNew ? "/settings/account?welcome=1" : "/garage");
}
