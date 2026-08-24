import { NextResponse } from "next/server";
import { route } from "@/lib/api/handler";
import { vehiclePhotoUrl } from "@/lib/services/media";
import { photoSlotSchema } from "@/lib/validation/schemas";

type Params = { params: Promise<{ id: string; slot: string }> };

export async function GET(_req: Request, { params }: Params) {
  return route(async () => {
    const { id, slot } = await params;
    const url = await vehiclePhotoUrl(id, photoSlotSchema.parse(slot.toUpperCase()));
    return NextResponse.redirect(url, 307);
  });
}
