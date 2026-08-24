import "server-only";

// Every API response is built by one of these mappers. Nothing reaches a client
// unless it is named here, so password hashes, storage keys, emails, and
// moderation internals cannot leak by accident.

export type PublicProfile = {
  username: string;
  displayName: string;
  bio: string | null;
  generalLocation: string | null;
  photoUrl: string | null;
};

type ProfileRow = {
  username: string;
  displayName: string;
  bio: string | null;
  photoKey: string | null;
  generalLocation: string | null;
};

export const toPublicProfile = (p: ProfileRow): PublicProfile => ({
  username: p.username,
  displayName: p.displayName,
  bio: p.bio,
  generalLocation: p.generalLocation,
  photoUrl: p.photoKey ? `/api/media/profile/${encodeURIComponent(p.username)}` : null,
});

type VehicleRow = {
  id: string;
  ownerId: string;
  year: number;
  mileage: number | null;
  nickname: string | null;
  make: { id: string; name: string };
  model: { id: string; name: string };
  generation: { id: string; code: string; platform: { name: string } | null };
  trim: { id: string; name: string } | null;
  engine: { id: string; name: string } | null;
  drivetrain: { id: string; name: string } | null;
  photos: { slot: string; storageKey: string }[];
  owner?: { profile: { username: string; displayName: string } | null } | null;
};

export type VehicleSummary = ReturnType<typeof toVehicleSummary>;

export const toVehicleSummary = (v: VehicleRow, viewerId?: string) => ({
  id: v.id,
  isOwn: viewerId ? v.ownerId === viewerId : false,
  year: v.year,
  mileage: v.mileage,
  nickname: v.nickname,
  make: v.make.name,
  makeId: v.make.id,
  model: v.model.name,
  modelId: v.model.id,
  generation: v.generation.code,
  generationId: v.generation.id,
  platform: v.generation.platform?.name ?? null,
  trim: v.trim?.name ?? null,
  engine: v.engine?.name ?? null,
  drivetrain: v.drivetrain?.name ?? null,
  // Photos are served through an authorized route, never as a raw storage key.
  photoSlots: v.photos.map((p) => p.slot),
  owner: v.owner?.profile
    ? { username: v.owner.profile.username, displayName: v.owner.profile.displayName }
    : null,
});

type ExperienceRow = {
  id: string;
  totalPrice: number;
  partsCost: number | null;
  laborCost: number | null;
  serviceDate: Date;
  mileageAtService: number;
  overallRating: number;
  qualityRating: number;
  priceRating: number;
  communicationRating: number;
  turnaroundRating: number;
  knowledgeRating: number;
  wouldRecommend: boolean;
  wouldReturn: boolean;
  reviewText: string | null;
  verificationStatus: string;
  verifiedAt: Date | null;
  createdAt: Date;
  userId: string;
  service: { id: string; name: string };
  mechanic: { id: string; name: string; city: string; state: string };
  vehicle: {
    id: string;
    year: number;
    make: { name: string };
    model: { name: string };
    generation: { id: string; code: string };
    trim: { name: string } | null;
  };
  user: { profile: { username: string; displayName: string } | null };
};

export const toExperienceView = (e: ExperienceRow, viewerId?: string) => ({
  id: e.id,
  totalPrice: e.totalPrice,
  partsCost: e.partsCost,
  laborCost: e.laborCost,
  serviceDate: e.serviceDate.toISOString(),
  mileageAtService: e.mileageAtService,
  ratings: {
    overall: e.overallRating,
    quality: e.qualityRating,
    price: e.priceRating,
    communication: e.communicationRating,
    turnaround: e.turnaroundRating,
    knowledge: e.knowledgeRating,
  },
  wouldRecommend: e.wouldRecommend,
  wouldReturn: e.wouldReturn,
  reviewText: e.reviewText,
  // Only the badge is public. The receipt itself is never referenced here.
  verified: e.verificationStatus === "VERIFIED",
  verificationStatus: e.verificationStatus,
  verifiedAt: e.verifiedAt?.toISOString() ?? null,
  createdAt: e.createdAt.toISOString(),
  service: { id: e.service.id, name: e.service.name },
  mechanic: e.mechanic,
  vehicle: {
    id: e.vehicle.id,
    year: e.vehicle.year,
    make: e.vehicle.make.name,
    model: e.vehicle.model.name,
    generation: e.vehicle.generation.code,
    generationId: e.vehicle.generation.id,
    trim: e.vehicle.trim?.name ?? null,
  },
  author: e.user.profile
    ? { username: e.user.profile.username, displayName: e.user.profile.displayName }
    : null,
  isOwn: viewerId ? e.userId === viewerId : false,
});

type MechanicRow = {
  id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  phone: string | null;
  website: string | null;
  hours: unknown;
  specialties: { service: { id: string; name: string } }[];
};

export const toMechanicView = (m: MechanicRow) => ({
  id: m.id,
  name: m.name,
  description: m.description,
  address: m.address,
  city: m.city,
  state: m.state,
  zip: m.zip,
  lat: m.lat,
  lng: m.lng,
  phone: m.phone,
  website: m.website,
  hours: m.hours ?? null,
  specialties: m.specialties.map((s) => s.service),
});
