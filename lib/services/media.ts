import "server-only";
import { notFound } from "../errors";
import { findVehicleById } from "../repositories/vehicle";
import { findProfileByUsername } from "../repositories/user";
import { signedReadUrl } from "../storage/objects";
import type { PhotoSlot } from "../generated/prisma/enums";

// Vehicle photos and profile pictures are public content, but the bucket is
// private: the server resolves the key and redirects to a short-lived URL, so
// the key and credentials never reach a browser.
export async function vehiclePhotoUrl(vehicleId: string, slot: PhotoSlot) {
  const vehicle = await findVehicleById(vehicleId);
  const photo = vehicle?.photos.find((p) => p.slot === slot);
  if (!photo) throw notFound();
  return signedReadUrl("photos", photo.storageKey, 300);
}

export async function profilePhotoUrl(username: string) {
  const profile = await findProfileByUsername(username);
  if (!profile?.photoKey || profile.user.deletedAt) throw notFound();
  return signedReadUrl("photos", profile.photoKey, 300);
}
