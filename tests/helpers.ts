import { prisma } from "../lib/db";
import { hashPassword } from "../lib/auth/password";

export async function resetData() {
  await prisma.auditLog.deleteMany();
  await prisma.report.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.mechanicExperience.deleteMany();
  await prisma.vehiclePhoto.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
}

let counter = 0;

export async function makeUser(role: "USER" | "ADMIN" = "USER") {
  counter += 1;
  const username = `user${counter}_${Date.now()}`;
  const user = await prisma.user.create({
    data: {
      email: `${username}@example.test`,
      passwordHash: await hashPassword("correcthorsebattery"),
      role,
      profile: { create: { username, displayName: username } },
    },
    select: { id: true, role: true },
  });
  return { id: user.id, role: user.role as "USER" | "ADMIN", username };
}

export async function fixtures() {
  const [make, service, mechanic] = await Promise.all([
    prisma.make.findFirstOrThrow({ where: { name: "BMW" } }),
    prisma.service.findFirstOrThrow({ where: { name: "Brake pads + rotors" } }),
    prisma.mechanic.findFirstOrThrow(),
  ]);
  const model = await prisma.model.findFirstOrThrow({ where: { makeId: make.id, name: "M3" } });
  return { make, model, service, mechanic };
}

export const validExperience = (over: Record<string, unknown> = {}) => ({
  totalPrice: 1050,
  partsCost: 650,
  laborCost: 400,
  serviceDate: new Date("2026-05-01"),
  mileageAtService: 8000,
  overallRating: 5,
  qualityRating: 5,
  priceRating: 4,
  communicationRating: 5,
  turnaroundRating: 5,
  knowledgeRating: 5,
  wouldRecommend: true,
  wouldReturn: true,
  reviewText: "Knew the platform well.",
  ...over,
});

export const fakeFile = (bytes: number[], name = "receipt.png", type = "image/png") =>
  new File([new Uint8Array(bytes)], name, { type });

export const PNG_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02];
