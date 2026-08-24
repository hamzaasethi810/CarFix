import "server-only";
import { notFound } from "../errors";
import { findProfileByUsername } from "../repositories/user";
import { signedReadUrl } from "../storage/objects";

// Vehicle photos and profile pictures are public content, but the bucket is
// private: the server resolves the key and redirects to a short-lived URL, so
// the key and credentials never reach a browser.

export async function profilePhotoUrl(username: string) {
  const profile = await findProfileByUsername(username);
  if (!profile?.photoKey || profile.user.deletedAt) throw notFound();
  return signedReadUrl("photos", profile.photoKey, 300);
}
