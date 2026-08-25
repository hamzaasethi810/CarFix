import "server-only";
import { notFound } from "../errors";
import { findProfileByUsername } from "../repositories/user";
import { getObjectBytes } from "../storage/objects";

/*
  Photos are served through this origin rather than by redirecting to a signed
  bucket URL.

  A redirect hands the browser a file from the storage provider's origin, where
  none of this application's protections apply — no Content-Security-Policy, no
  nosniff, and no say over the content type. Anything that survived upload
  validation would be interpreted under the storage provider's rules instead of
  ours. Serving the bytes ourselves means every user-supplied file, without
  exception, is pinned to a known type and sandboxed by the same response.

  It also stops handing out signed URLs that keep working for anyone who
  copies them out of the network tab.
*/
export async function profilePhotoBytes(username: string) {
  const profile = await findProfileByUsername(username);
  if (!profile?.photoKey || profile.user.deletedAt) throw notFound();
  return getObjectBytes("photos", profile.photoKey);
}
